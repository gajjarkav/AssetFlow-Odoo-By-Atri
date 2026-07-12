import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.models.maintenance import MaintenanceRequest
from src.core.enums import MaintenanceStatus, MaintenancePriority, AssetStatus, UserRole, AllocationStatus
from src.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceTransition,
    MaintenanceResponse,
    MaintenanceListResponse,
)

router = APIRouter()


def map_maintenance(m: MaintenanceRequest) -> MaintenanceResponse:
    return MaintenanceResponse(
        id=m.id,
        asset_id=m.asset_id,
        asset_tag=m.asset.tag if m.asset else None,
        asset_name=m.asset.name if m.asset else None,
        asset_status=m.asset.status.value if m.asset else None,
        raised_by=m.raised_by,
        raised_by_name=m.raiser.name if m.raiser else None,
        description=m.description,
        priority=m.priority,
        status=m.status,
        photo_url=m.photo_url,
        technician_name=m.technician_name,
        resolution_notes=m.resolution_notes,
        rejection_reason=m.rejection_reason,
        approved_by=m.approved_by,
        approved_at=m.approved_at,
        resolved_at=m.resolved_at,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


def _load_maintenance_query(extra_filter=None):
    q = (
        select(MaintenanceRequest)
        .options(
            joinedload(MaintenanceRequest.asset),
            joinedload(MaintenanceRequest.raiser),
            joinedload(MaintenanceRequest.approver),
        )
    )
    if extra_filter is not None:
        q = q.where(extra_filter)
    return q


@router.post("/", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance(
    data: MaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Raise a new maintenance request."""
    asset = await db.get(Asset, data.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status in (AssetStatus.RETIRED, AssetStatus.DISPOSED, AssetStatus.LOST):
        raise HTTPException(
            status_code=400,
            detail={"detail": "Asset is not maintainable in its current state", "code": "ASSET_NOT_MAINTAINABLE"}
        )

    # Optional MVP: single open request policy
    open_req_stmt = select(MaintenanceRequest).where(
        and_(
            MaintenanceRequest.asset_id == asset.id,
            MaintenanceRequest.status.notin_([MaintenanceStatus.REJECTED, MaintenanceStatus.RESOLVED])
        )
    )
    existing_open = (await db.execute(open_req_stmt)).scalars().first()
    if existing_open:
        raise HTTPException(
            status_code=409,
            detail={"detail": "Maintenance request already open for this asset", "code": "MAINTENANCE_ALREADY_OPEN"}
        )

    req = MaintenanceRequest(
        asset_id=asset.id,
        raised_by=current_user.id,
        description=data.description,
        priority=data.priority,
        photo_url=data.photo_url,
        status=MaintenanceStatus.PENDING
    )
    db.add(req)
    await db.commit()
    
    reload_res = await db.execute(_load_maintenance_query(MaintenanceRequest.id == req.id))
    return map_maintenance(reload_res.scalar_one())


@router.get("/", response_model=MaintenanceListResponse)
async def list_maintenance(
    status_filter: Optional[MaintenanceStatus] = Query(None, alias="status"),
    priority_filter: Optional[MaintenancePriority] = Query(None, alias="priority"),
    asset_id: Optional[uuid.UUID] = None,
    raised_by: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List maintenance requests with Kanban-ready filters."""
    q = _load_maintenance_query()

    if current_user.role == UserRole.EMPLOYEE:
        q = q.where(MaintenanceRequest.raised_by == current_user.id)
    elif raised_by:
        q = q.where(MaintenanceRequest.raised_by == raised_by)

    if status_filter:
        q = q.where(MaintenanceRequest.status == status_filter)
    if priority_filter:
        q = q.where(MaintenanceRequest.priority == priority_filter)
    if asset_id:
        q = q.where(MaintenanceRequest.asset_id == asset_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()

    q = q.order_by(MaintenanceRequest.created_at.desc()).offset(skip).limit(limit)
    items = (await db.execute(q)).scalars().all()

    return MaintenanceListResponse(items=[map_maintenance(m) for m in items], total=total)


@router.get("/{id}", response_model=MaintenanceResponse)
async def get_maintenance(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await db.execute(_load_maintenance_query(MaintenanceRequest.id == id))
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    if current_user.role == UserRole.EMPLOYEE and req.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return map_maintenance(req)


@router.post("/{id}/transition", response_model=MaintenanceResponse)
async def transition_maintenance(
    id: uuid.UUID,
    trans_in: MaintenanceTransition,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """State machine transition with asset side-effects."""
    if current_user.role not in (UserRole.ADMIN, UserRole.ASSET_MANAGER):
        raise HTTPException(status_code=403, detail="Not authorized to transition maintenance states")

    res = await db.execute(_load_maintenance_query(MaintenanceRequest.id == id))
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    asset = req.asset
    now = datetime.now(timezone.utc)
    current = req.status
    target = trans_in.to

    # Allowed transitions map
    allowed = {
        MaintenanceStatus.PENDING: {MaintenanceStatus.APPROVED, MaintenanceStatus.REJECTED},
        MaintenanceStatus.APPROVED: {MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.RESOLVED},
        MaintenanceStatus.IN_PROGRESS: {MaintenanceStatus.RESOLVED},
        MaintenanceStatus.REJECTED: set(),
        MaintenanceStatus.RESOLVED: set(),
    }

    if target not in allowed.get(current, set()):
        raise HTTPException(
            status_code=400,
            detail={"detail": f"Invalid transition from {current} to {target}", "code": "INVALID_TRANSITION"}
        )

    # Apply changes based on target state
    if target == MaintenanceStatus.APPROVED:
        req.status = MaintenanceStatus.APPROVED
        req.approved_by = current_user.id
        req.approved_at = now
        if trans_in.technician_name:
            req.technician_name = trans_in.technician_name
        
        # Side effect 1: Auto-return ACTIVE allocation if exists
        alloc_stmt = select(Allocation).where(
            and_(Allocation.asset_id == asset.id, Allocation.status == AllocationStatus.ACTIVE)
        )
        active_alloc = (await db.execute(alloc_stmt)).scalars().first()
        if active_alloc:
            active_alloc.status = AllocationStatus.RETURNED
            active_alloc.returned_at = now
            active_alloc.return_condition = "Auto-returned for maintenance"

        # Side effect 2: Asset becomes UNDER_MAINTENANCE
        asset.status = AssetStatus.UNDER_MAINTENANCE

    elif target == MaintenanceStatus.REJECTED:
        req.status = MaintenanceStatus.REJECTED
        req.rejection_reason = trans_in.notes

    elif target == MaintenanceStatus.IN_PROGRESS:
        req.status = MaintenanceStatus.IN_PROGRESS
        if trans_in.technician_name:
            req.technician_name = trans_in.technician_name

    elif target == MaintenanceStatus.RESOLVED:
        req.status = MaintenanceStatus.RESOLVED
        req.resolution_notes = trans_in.notes
        req.resolved_at = now
        
        # Side effect: Flip asset back to AVAILABLE if it was under maintenance
        if asset.status == AssetStatus.UNDER_MAINTENANCE:
            asset.status = AssetStatus.AVAILABLE

    await db.commit()
    await db.refresh(req)
    await db.refresh(req.asset)

    return map_maintenance(req)
