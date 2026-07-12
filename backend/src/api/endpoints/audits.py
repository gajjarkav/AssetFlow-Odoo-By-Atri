import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import require_roles
from src.models.user import User
from src.models.asset import Asset
from src.models.audit import AuditCycle, AuditItem
from src.core.enums import UserRole, AuditCycleStatus, AuditResult, AuditScopeType, AssetStatus
from src.schemas.audit import (
    AuditCycleCreate,
    AuditItemMark,
    AuditCycleSummary,
    AuditCycleDetail,
    AuditItemResponse,
    AuditDiscrepancyResponse
)
from src.api.endpoints.notifications import notify
from src.core.enums import NotificationType

router = APIRouter()


def compute_cycle_summary(cycle: AuditCycle) -> dict:
    total = len(cycle.items)
    verified = sum(1 for i in cycle.items if i.result == AuditResult.VERIFIED)
    missing = sum(1 for i in cycle.items if i.result == AuditResult.MISSING)
    damaged = sum(1 for i in cycle.items if i.result == AuditResult.DAMAGED)
    pending = total - verified - missing - damaged
    
    return {
        "id": cycle.id,
        "title": cycle.title,
        "scope_type": cycle.scope_type,
        "status": cycle.status,
        "start_date": cycle.start_date,
        "end_date": cycle.end_date,
        "items_total": total,
        "items_verified": verified,
        "items_missing": missing,
        "items_damaged": damaged,
        "items_pending": pending,
        "created_at": cycle.created_at,
    }


def map_item(item: AuditItem) -> AuditItemResponse:
    return AuditItemResponse(
        id=item.id,
        asset_id=item.asset_id,
        asset_tag=item.asset.tag if item.asset else None,
        asset_name=item.asset.name if item.asset else None,
        expected_location=item.expected_location,
        result=item.result,
        notes=item.notes,
        marked_by_name=item.marker.name if item.marker else None,
        marked_at=item.marked_at,
    )


@router.post("/", response_model=AuditCycleSummary, status_code=status.HTTP_201_CREATED)
async def create_audit_cycle(
    data: AuditCycleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    """
    Create a new audit cycle and snapshot assets in scope.
    """
    cycle = AuditCycle(
        title=data.title,
        scope_type=data.scope_type,
        scope_value=data.scope_value,
        start_date=data.start_date,
        end_date=data.end_date,
        status=AuditCycleStatus.OPEN,
        created_by=current_user.id
    )
    db.add(cycle)
    await db.flush()  # to get cycle.id

    # Find assets in scope
    stmt = select(Asset).where(Asset.status != AssetStatus.DISPOSED)
    
    if data.scope_type == AuditScopeType.DEPARTMENT:
        if not data.scope_value:
            raise HTTPException(status_code=400, detail="scope_value is required for DEPARTMENT scope")
        stmt = stmt.where(Asset.department_id == uuid.UUID(data.scope_value))
    elif data.scope_type == AuditScopeType.LOCATION:
        if not data.scope_value:
            raise HTTPException(status_code=400, detail="scope_value is required for LOCATION scope")
        # Ensure correct ILIKE usage for postgresql with scalar
        stmt = stmt.where(func.lower(Asset.location).like(f"%{data.scope_value.lower()}%"))
        
    assets = (await db.execute(stmt)).scalars().all()
    
    for asset in assets:
        item = AuditItem(
            cycle_id=cycle.id,
            asset_id=asset.id,
            expected_location=asset.location
        )
        db.add(item)
        
    await db.commit()
    
    # reload with items
    cycle_stmt = select(AuditCycle).options(joinedload(AuditCycle.items)).where(AuditCycle.id == cycle.id)
    refreshed = (await db.execute(cycle_stmt)).scalar_one()
    return compute_cycle_summary(refreshed)


@router.get("/", response_model=List[AuditCycleSummary])
async def list_audits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    """List all audit cycles."""
    stmt = select(AuditCycle).options(joinedload(AuditCycle.items)).order_by(AuditCycle.created_at.desc())
    cycles = (await db.execute(stmt)).unique().scalars().all()
    return [compute_cycle_summary(c) for c in cycles]


@router.get("/{id}", response_model=AuditCycleDetail)
async def get_audit(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    """Get audit cycle details."""
    stmt = select(AuditCycle).options(
        joinedload(AuditCycle.items).joinedload(AuditItem.asset),
        joinedload(AuditCycle.items).joinedload(AuditItem.marker)
    ).where(AuditCycle.id == id)
    
    cycle = (await db.execute(stmt)).unique().scalar_one_or_none()
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
        
    summary = compute_cycle_summary(cycle)
    summary["items"] = [map_item(i) for i in cycle.items]
    return summary


@router.post("/{id}/items", response_model=AuditItemResponse)
async def mark_audit_item(
    id: uuid.UUID,
    data: AuditItemMark,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    """Mark an asset's audit result."""
    stmt = select(AuditCycle).where(AuditCycle.id == id)
    cycle = (await db.execute(stmt)).scalar_one_or_none()
    
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
        
    if cycle.status == AuditCycleStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Cannot mark items in a closed audit cycle")
        
    item_stmt = select(AuditItem).options(
        joinedload(AuditItem.asset),
        joinedload(AuditItem.marker)
    ).where(AuditItem.cycle_id == id, AuditItem.asset_id == data.asset_id)
    
    item = (await db.execute(item_stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in this audit cycle")
        
    item.result = data.result
    item.notes = data.notes
    item.marked_by = current_user.id
    item.marked_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(item)
    
    # Reload relation details
    item = (await db.execute(item_stmt)).scalar_one()
    return map_item(item)


@router.get("/{id}/discrepancies", response_model=AuditDiscrepancyResponse)
async def get_audit_discrepancies(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    """List missing and damaged items."""
    item_stmt = select(AuditItem).options(
        joinedload(AuditItem.asset),
        joinedload(AuditItem.marker)
    ).where(
        AuditItem.cycle_id == id,
        AuditItem.result.in_([AuditResult.MISSING, AuditResult.DAMAGED])
    )
    
    items = (await db.execute(item_stmt)).scalars().all()
    return {"items": [map_item(i) for i in items]}


@router.post("/{id}/close", response_model=AuditCycleSummary)
async def close_audit(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)),
):
    """Close the audit cycle and apply side effects (mark MISSING items as LOST)."""
    stmt = select(AuditCycle).options(
        joinedload(AuditCycle.items).joinedload(AuditItem.asset)
    ).where(AuditCycle.id == id)
    
    cycle = (await db.execute(stmt)).unique().scalar_one_or_none()
    
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
        
    if cycle.status == AuditCycleStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Audit cycle is already closed")
        
    # Mark missing -> LOST
    missing_count = 0
    for item in cycle.items:
        if item.result == AuditResult.MISSING and item.asset:
            item.asset.status = AssetStatus.LOST
            missing_count += 1
            
    cycle.status = AuditCycleStatus.CLOSED
    cycle.closed_at = datetime.now(timezone.utc)
    
    # Notify Admins about discrepancies
    if missing_count > 0:
        admin_stmt = select(User.id).where(User.role == UserRole.ADMIN)
        admin_ids = (await db.execute(admin_stmt)).scalars().all()
        for aid in admin_ids:
            await notify(
                db=db,
                user_id=aid,
                type=NotificationType.AUDIT_DISCREPANCY,
                title="Audit Discrepancies Found",
                message=f"Audit '{cycle.title}' closed with {missing_count} missing assets.",
                entity_type="audit",
                entity_id=cycle.id
            )
            
    await db.commit()
    
    return compute_cycle_summary(cycle)
