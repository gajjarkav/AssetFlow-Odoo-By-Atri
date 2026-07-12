import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_, update
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user, require_roles
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.models.department import Department
from src.models.transfer import TransferRequest
from src.core.enums import UserRole, AssetStatus, AllocationStatus, TransferStatus
from src.schemas.allocation import (
    AllocationCreate,
    AllocationResponse,
    AllocationReturn,
    AllocationStatus as SchemaAllocationStatus
)

router = APIRouter()

def map_allocation_to_response(alloc: Allocation) -> AllocationResponse:
    is_overdue = False
    if alloc.status == AllocationStatus.ACTIVE and alloc.expected_return:
        now_tz = datetime.now(alloc.expected_return.tzinfo or timezone.utc)
        is_overdue = alloc.expected_return < now_tz
        
    return AllocationResponse(
        id=alloc.id,
        asset_id=alloc.asset_id,
        asset_tag=alloc.asset.tag if alloc.asset else None,
        asset_name=alloc.asset.name if alloc.asset else None,
        employee_id=alloc.employee_id,
        employee_name=alloc.employee.name if alloc.employee else None,
        department_id=alloc.department_id,
        department_name=alloc.department.name if alloc.department else None,
        allocated_by=alloc.allocated_by,
        allocated_by_name=alloc.allocator.name if alloc.allocator else None,
        allocated_at=alloc.allocated_at,
        expected_return=alloc.expected_return,
        returned_at=alloc.returned_at,
        return_condition_notes=alloc.return_condition_notes,
        status=SchemaAllocationStatus(alloc.status.value),
        notes=alloc.notes,
        is_overdue=is_overdue
    )

@router.post("/", response_model=AllocationResponse, status_code=status.HTTP_201_CREATED)
async def allocate_asset(
    alloc_in: AllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER))
):
    """
    Allocate an asset to an employee OR department. Only ADMIN or ASSET_MANAGER.
    """
    # 1. Fetch asset
    asset = await db.get(Asset, alloc_in.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # 2. Check if shared (shared resources are booked, not allocated)
    if asset.is_shared:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Shared resources must be booked, not allocated", "code": "ASSET_IS_SHARED"}
        )
        
    # 3. Check if available / not in maintenance/retired
    if asset.status != AssetStatus.AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Asset is not available for allocation", "code": "ASSET_NOT_AVAILABLE"}
        )
        
    # 4. Check double-allocation constraint
    active_stmt = (
        select(Allocation)
        .options(joinedload(Allocation.employee), joinedload(Allocation.department))
        .where(Allocation.asset_id == alloc_in.asset_id, Allocation.status == AllocationStatus.ACTIVE)
    )
    active_res = await db.execute(active_stmt)
    active_alloc = active_res.scalar_one_or_none()
    
    if active_alloc:
        holder_name = "Unknown"
        holder_type = "employee"
        holder_id = None
        if active_alloc.employee:
            holder_name = active_alloc.employee.name
            holder_id = active_alloc.employee_id
            holder_type = "employee"
        elif active_alloc.department:
            holder_name = active_alloc.department.name
            holder_id = active_alloc.department_id
            holder_type = "department"
            
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": f"Asset currently held by {holder_name}",
                "code": "ASSET_HELD",
                "holder_name": holder_name,
                "holder_id": str(holder_id) if holder_id else None,
                "holder_type": holder_type,
                "allocation_id": str(active_alloc.id),
                "asset_id": str(asset.id),
                "asset_tag": asset.tag
            }
        )

    # 5. Validate targets
    if alloc_in.employee_id:
        emp = await db.get(User, alloc_in.employee_id)
        if not emp:
            raise HTTPException(status_code=400, detail="Employee not found")
    elif alloc_in.department_id:
        dept = await db.get(Department, alloc_in.department_id)
        if not dept:
            raise HTTPException(status_code=400, detail="Department not found")

    # 6. Create Allocation
    new_alloc = Allocation(
        asset_id=alloc_in.asset_id,
        employee_id=alloc_in.employee_id,
        department_id=alloc_in.department_id,
        allocated_by=current_user.id,
        expected_return=alloc_in.expected_return,
        status=AllocationStatus.ACTIVE,
        notes=alloc_in.notes
    )
    
    # 7. Update Asset Status
    asset.status = AssetStatus.ALLOCATED
    
    db.add(new_alloc)
    await db.commit()
    
    # Reload relation details for mapping
    reload_stmt = (
        select(Allocation)
        .options(
            joinedload(Allocation.asset),
            joinedload(Allocation.employee),
            joinedload(Allocation.department),
            joinedload(Allocation.allocator)
        )
        .where(Allocation.id == new_alloc.id)
    )
    reload_res = await db.execute(reload_stmt)
    refreshed = reload_res.scalar_one()
    
    return map_allocation_to_response(refreshed)

@router.get("/", response_model=dict)
async def list_allocations(
    asset_id: Optional[uuid.UUID] = None,
    employee_id: Optional[uuid.UUID] = None,
    department_id: Optional[uuid.UUID] = None,
    status_filter: Optional[AllocationStatus] = Query(None, alias="status"),
    overdue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List allocations. Open to all active users, but filtered by role scopes.
    """
    query = (
        select(Allocation)
        .options(
            joinedload(Allocation.asset),
            joinedload(Allocation.employee),
            joinedload(Allocation.department),
            joinedload(Allocation.allocator)
        )
    )
    
    # Role Scopes
    if current_user.role == UserRole.EMPLOYEE:
        query = query.where(Allocation.employee_id == current_user.id)
    elif current_user.role == UserRole.DEPARTMENT_HEAD:
        # Load department users
        user_stmt = select(User.id).where(User.department_id == current_user.department_id)
        user_ids_res = await db.execute(user_stmt)
        dept_user_ids = user_ids_res.scalars().all()
        query = query.where(
            or_(
                Allocation.department_id == current_user.department_id,
                Allocation.employee_id.in_(dept_user_ids)
            )
        )
    # Admin & AM can see all.
    
    # Filter constraints
    if asset_id:
        query = query.where(Allocation.asset_id == asset_id)
    if employee_id:
        query = query.where(Allocation.employee_id == employee_id)
    if department_id:
        query = query.where(Allocation.department_id == department_id)
    if status_filter:
        query = query.where(Allocation.status == status_filter)
    if overdue is not None:
        now_utc = datetime.now(timezone.utc)
        if overdue:
            query = query.where(
                Allocation.status == AllocationStatus.ACTIVE,
                Allocation.expected_return != None,
                Allocation.expected_return < now_utc
            )
        else:
            query = query.where(
                or_(
                    Allocation.status != AllocationStatus.ACTIVE,
                    Allocation.expected_return == None,
                    Allocation.expected_return >= now_utc
                )
            )
            
    # Count total
    count_stmt = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()
    
    # Fetch paginated items
    query = query.order_by(Allocation.allocated_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    allocations = res.scalars().all()
    
    items = [map_allocation_to_response(a) for a in allocations]
    return {"items": items, "total": total}

@router.get("/{id}", response_model=AllocationResponse)
async def get_allocation(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information of a specific allocation.
    """
    stmt = (
        select(Allocation)
        .options(
            joinedload(Allocation.asset),
            joinedload(Allocation.employee),
            joinedload(Allocation.department),
            joinedload(Allocation.allocator)
        )
        .where(Allocation.id == id)
    )
    res = await db.execute(stmt)
    alloc = res.scalar_one_or_none()
    
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
        
    # Scope check
    if current_user.role == UserRole.EMPLOYEE and alloc.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this allocation")
    elif current_user.role == UserRole.DEPARTMENT_HEAD:
        user_stmt = select(User.id).where(User.department_id == current_user.department_id)
        user_ids_res = await db.execute(user_stmt)
        dept_user_ids = user_ids_res.scalars().all()
        
        is_own_dept = alloc.department_id == current_user.department_id
        is_dept_user = alloc.employee_id in dept_user_ids
        if not (is_own_dept or is_dept_user):
            raise HTTPException(status_code=403, detail="Not authorized to view this allocation")
            
    return map_allocation_to_response(alloc)

@router.post("/{id}/return", response_model=AllocationResponse)
async def return_allocation(
    id: uuid.UUID,
    ret_in: AllocationReturn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark an active allocation as returned. Accessible by Admin, AM, or current holder.
    """
    stmt = (
        select(Allocation)
        .options(
            joinedload(Allocation.asset),
            joinedload(Allocation.employee),
            joinedload(Allocation.department),
            joinedload(Allocation.allocator)
        )
        .where(Allocation.id == id)
    )
    res = await db.execute(stmt)
    alloc = res.scalar_one_or_none()
    
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
        
    if alloc.status != AllocationStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Allocation is not active", "code": "ALLOCATION_NOT_ACTIVE"}
        )
        
    # Auth authorization check: Admin, AM, or current holder employee
    is_admin_am = current_user.role in (UserRole.ADMIN, UserRole.ASSET_MANAGER)
    is_holder = alloc.employee_id == current_user.id
    if not (is_admin_am or is_holder):
        raise HTTPException(status_code=403, detail="Not authorized to process this return")
        
    # Close allocation
    alloc.status = AllocationStatus.RETURNED
    alloc.returned_at = datetime.now(timezone.utc)
    alloc.return_condition_notes = ret_in.condition_notes
    
    # Update Asset Status
    asset = await db.get(Asset, alloc.asset_id)
    if asset:
        asset.status = AssetStatus.AVAILABLE
        
    # Auto-reject any requested transfers for this asset
    reject_transfers_stmt = (
        update(TransferRequest)
        .where(
            TransferRequest.asset_id == alloc.asset_id,
            TransferRequest.status == TransferStatus.REQUESTED
        )
        .values(
            status=TransferStatus.REJECTED,
            decided_by=current_user.id,
            decided_at=datetime.now(timezone.utc),
            decision_notes="System auto-rejected because asset was returned by holder"
        )
    )
    await db.execute(reject_transfers_stmt)
    
    await db.commit()
    await db.refresh(alloc)
    
    return map_allocation_to_response(alloc)
