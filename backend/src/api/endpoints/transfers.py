import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user, require_roles
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.models.transfer import TransferRequest
from src.core.enums import UserRole, AllocationStatus, TransferStatus
from src.schemas.transfer import (
    TransferCreate,
    TransferDecision,
    TransferResponse
)

router = APIRouter()

def map_transfer_to_response(tr: TransferRequest) -> TransferResponse:
    # Resolve names safely to prevent async lazy loading issues
    from_user = tr.from_user
    to_user = tr.to_user
    asset = tr.asset
    requester = tr.requester
    decider = tr.decider
    
    return TransferResponse(
        id=tr.id,
        asset_id=tr.asset_id,
        asset_tag=asset.tag if asset else None,
        asset_name=asset.name if asset else None,
        from_user_id=tr.from_user_id,
        from_user_name=from_user.name if from_user else None,
        to_user_id=tr.to_user_id,
        to_user_name=to_user.name if to_user else None,
        reason=tr.reason,
        status=tr.status,
        requested_by=tr.requested_by,
        requested_by_name=requester.name if requester else None,
        requested_at=tr.requested_at,
        decided_by=tr.decided_by,
        decided_by_name=decider.name if decider else None,
        decided_at=tr.decided_at,
        decision_notes=tr.decision_notes,
        allocation_id=tr.allocation_id
    )

@router.post("/", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def request_transfer(
    transfer_in: TransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request a custody transfer of an active asset to another employee.
    """
    # 1. Fetch asset
    asset = await db.get(Asset, transfer_in.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # 2. Check active allocation
    active_stmt = select(Allocation).where(
        Allocation.asset_id == transfer_in.asset_id,
        Allocation.status == AllocationStatus.ACTIVE
    )
    res = await db.execute(active_stmt)
    active_alloc = res.scalar_one_or_none()
    
    if not active_alloc:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Asset does not have an active allocation", "code": "ASSET_NOT_HELD"}
        )
        
    if not active_alloc.employee_id:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Transfer requires a personal employee holder", "code": "INVALID_TARGET"}
        )
        
    # 3. Check target constraints
    to_user = await db.get(User, transfer_in.to_user_id)
    if not to_user:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Target employee not found", "code": "INVALID_TARGET"}
        )
        
    if to_user.id == active_alloc.employee_id:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Cannot transfer to the current holder", "code": "INVALID_TARGET"}
        )
        
    # Create Transfer Request
    tr = TransferRequest(
        asset_id=transfer_in.asset_id,
        from_user_id=active_alloc.employee_id,
        to_user_id=transfer_in.to_user_id,
        reason=transfer_in.reason,
        status=TransferStatus.REQUESTED,
        requested_by=current_user.id,
        allocation_id=active_alloc.id
    )
    
    db.add(tr)
    await db.commit()
    
    # Reload relation details for response mapping
    reload_stmt = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester)
        )
        .where(TransferRequest.id == tr.id)
    )
    reload_res = await db.execute(reload_stmt)
    refreshed = reload_res.scalar_one()
    
    return map_transfer_to_response(refreshed)

@router.get("/", response_model=dict)
async def list_transfers(
    status_filter: Optional[TransferStatus] = Query(None, alias="status"),
    asset_id: Optional[uuid.UUID] = None,
    from_user_id: Optional[uuid.UUID] = None,
    to_user_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List transfer requests. Scoped by user role permissions.
    """
    query = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester),
            joinedload(TransferRequest.decider)
        )
    )
    
    # Role Scopes
    if current_user.role == UserRole.EMPLOYEE:
        query = query.where(
            or_(
                TransferRequest.from_user_id == current_user.id,
                TransferRequest.to_user_id == current_user.id,
                TransferRequest.requested_by == current_user.id
            )
        )
    elif current_user.role == UserRole.DEPARTMENT_HEAD:
        # Load department users
        user_stmt = select(User.id).where(User.department_id == current_user.department_id)
        user_ids_res = await db.execute(user_stmt)
        dept_user_ids = user_ids_res.scalars().all()
        query = query.where(
            or_(
                TransferRequest.from_user_id.in_(dept_user_ids),
                TransferRequest.to_user_id.in_(dept_user_ids),
                TransferRequest.requested_by.in_(dept_user_ids)
            )
        )
        
    # Filters
    if status_filter:
        query = query.where(TransferRequest.status == status_filter)
    if asset_id:
        query = query.where(TransferRequest.asset_id == asset_id)
    if from_user_id:
        query = query.where(TransferRequest.from_user_id == from_user_id)
    if to_user_id:
        query = query.where(TransferRequest.to_user_id == to_user_id)
        
    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()
    
    # Fetch paginated items
    query = query.order_by(TransferRequest.requested_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    transfers = res.scalars().all()
    
    items = [map_transfer_to_response(tr) for tr in transfers]
    return {"items": items, "total": total}

@router.get("/{id}", response_model=TransferResponse)
async def get_transfer(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information of a specific transfer request.
    """
    stmt = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester),
            joinedload(TransferRequest.decider)
        )
        .where(TransferRequest.id == id)
    )
    res = await db.execute(stmt)
    tr = res.scalar_one_or_none()
    
    if not tr:
        raise HTTPException(status_code=404, detail="Transfer request not found")
        
    # Scope checks
    if current_user.role == UserRole.EMPLOYEE:
        is_involved = current_user.id in (tr.from_user_id, tr.to_user_id, tr.requested_by)
        if not is_involved:
            raise HTTPException(status_code=403, detail="Not authorized to view this transfer request")
    elif current_user.role == UserRole.DEPARTMENT_HEAD:
        user_stmt = select(User.id).where(User.department_id == current_user.department_id)
        user_ids_res = await db.execute(user_stmt)
        dept_user_ids = user_ids_res.scalars().all()
        
        is_involved = any(
            uid in dept_user_ids for uid in (tr.from_user_id, tr.to_user_id, tr.requested_by)
        )
        if not is_involved:
            raise HTTPException(status_code=403, detail="Not authorized to view this transfer request")
            
    return map_transfer_to_response(tr)

@router.post("/{id}/approve", response_model=TransferResponse)
async def approve_transfer(
    id: uuid.UUID,
    decision_in: TransferDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER))
):
    """
    Approve transfer request. Closes old allocation and opens new allocation atomically.
    """
    # 1. Fetch transfer
    stmt = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester)
        )
        .where(TransferRequest.id == id)
    )
    res = await db.execute(stmt)
    tr = res.scalar_one_or_none()
    
    if not tr:
        raise HTTPException(status_code=404, detail="Transfer request not found")
        
    # 2. Check if pending
    if tr.status != TransferStatus.REQUESTED:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Transfer request is not pending", "code": "TRANSFER_NOT_PENDING"}
        )
        
    # 3. Check active allocation still matches the from_user
    active_stmt = select(Allocation).where(
        Allocation.asset_id == tr.asset_id,
        Allocation.status == AllocationStatus.ACTIVE
    )
    alloc_res = await db.execute(active_stmt)
    active_alloc = alloc_res.scalar_one_or_none()
    
    if not active_alloc or active_alloc.employee_id != tr.from_user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"detail": "Asset holder has changed since the request was made", "code": "TRANSFER_HOLDER_CHANGED"}
        )
        
    # 4. Atomic custody shift
    # Close old
    active_alloc.status = AllocationStatus.RETURNED
    active_alloc.returned_at = datetime.now(timezone.utc)
    active_alloc.return_condition_notes = f"Transferred to {tr.to_user.name if tr.to_user else 'next employee'}"
    
    # Open new
    new_alloc = Allocation(
        asset_id=tr.asset_id,
        employee_id=tr.to_user_id,
        allocated_by=current_user.id,
        status=AllocationStatus.ACTIVE,
        notes=f"Transfer approved. Reference: {tr.reason}"
    )
    db.add(new_alloc)
    
    # Update transfer metadata
    tr.status = TransferStatus.APPROVED
    tr.decided_by = current_user.id
    tr.decided_at = datetime.now(timezone.utc)
    tr.decision_notes = decision_in.notes
    
    await db.commit()
    
    # Reload relation details for decided_by_name
    reload_stmt = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester),
            joinedload(TransferRequest.decider)
        )
        .where(TransferRequest.id == tr.id)
    )
    reload_res = await db.execute(reload_stmt)
    refreshed = reload_res.scalar_one()
    
    return map_transfer_to_response(refreshed)

@router.post("/{id}/reject", response_model=TransferResponse)
async def reject_transfer(
    id: uuid.UUID,
    decision_in: TransferDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER))
):
    """
    Reject transfer request. Asset allocations remain unchanged.
    """
    stmt = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester)
        )
        .where(TransferRequest.id == id)
    )
    res = await db.execute(stmt)
    tr = res.scalar_one_or_none()
    
    if not tr:
        raise HTTPException(status_code=404, detail="Transfer request not found")
        
    if tr.status != TransferStatus.REQUESTED:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Transfer request is not pending", "code": "TRANSFER_NOT_PENDING"}
        )
        
    # Rejection notes are required by business specification
    if not decision_in.notes:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Decision notes/reason are required for rejection", "code": "VALIDATION_ERROR"}
        )
        
    tr.status = TransferStatus.REJECTED
    tr.decided_by = current_user.id
    tr.decided_at = datetime.now(timezone.utc)
    tr.decision_notes = decision_in.notes
    
    await db.commit()
    
    # Reload relation details
    reload_stmt = (
        select(TransferRequest)
        .options(
            joinedload(TransferRequest.asset),
            joinedload(TransferRequest.from_user),
            joinedload(TransferRequest.to_user),
            joinedload(TransferRequest.requester),
            joinedload(TransferRequest.decider)
        )
        .where(TransferRequest.id == tr.id)
    )
    reload_res = await db.execute(reload_stmt)
    refreshed = reload_res.scalar_one()
    
    return map_transfer_to_response(refreshed)
