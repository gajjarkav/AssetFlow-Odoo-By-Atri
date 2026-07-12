import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user, require_roles
from src.models.user import User
from src.models.asset import Asset
from src.models.category import Category
from src.models.department import Department
from src.models.allocation import Allocation
from src.models.transfer import TransferRequest
from src.models.maintenance import MaintenanceRequest
from src.core.enums import UserRole, AssetStatus
from src.schemas.asset import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    AssetListResponse,
    AssetHistoryResponse
)

router = APIRouter()

async def get_next_tag(db: AsyncSession) -> str:
    """
    Generates the next sequential asset tag in the format AF-XXXXXX (6 digits zero-padded).
    """
    # Sort descending alphabetically (which matches numerically due to zero padding)
    query = select(Asset.tag).where(Asset.tag.like("AF-%")).order_by(Asset.tag.desc()).limit(1)
    result = await db.execute(query)
    max_tag = result.scalar_one_or_none()
    
    if max_tag:
        try:
            parts = max_tag.split("-")
            num = int(parts[1])
            next_num = num + 1
        except (IndexError, ValueError):
            next_num = 1
    else:
        next_num = 1
        
    return f"AF-{next_num:06d}"

def map_asset_to_response(asset: Asset) -> AssetResponse:
    """
    Safely maps the SQLAlchemy Asset model to the AssetResponse Pydantic schema
    avoiding async lazy loading issues by using populated relationships.
    """
    holder_id = None
    holder_name = None
    if asset.active_allocation:
        if asset.active_allocation.employee:
            holder_id = asset.active_allocation.employee_id
            holder_name = asset.active_allocation.employee.name
        elif asset.active_allocation.department:
            holder_id = asset.active_allocation.department_id
            holder_name = asset.active_allocation.department.name

    return AssetResponse(
        id=asset.id,
        name=asset.name,
        category_id=asset.category_id,
        category_name=asset.category.name if asset.category else None,
        tag=asset.tag,
        serial_number=asset.serial_number,
        acquisition_date=asset.acquisition_date,
        acquisition_cost=asset.acquisition_cost,
        condition=asset.condition,
        location=asset.location,
        is_shared=asset.is_shared,
        status=asset.status,
        department_id=asset.department_id,
        department_name=asset.department.name if asset.department else None,
        photo_url=asset.photo_url,
        created_by=asset.created_by,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        current_holder_id=holder_id,
        current_holder_name=holder_name
    )

@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def register_asset(
    asset_in: AssetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER))
):
    """
    Register a new physical asset. Only accessible by ADMIN or ASSET_MANAGER.
    """
    # Validate category exists and is ACTIVE
    category = await db.get(Category, asset_in.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found"
        )
    if category.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category is not active"
        )
        
    # Validate department exists if provided
    if asset_in.department_id:
        dept = await db.get(Department, asset_in.department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found"
            )
            
    # Validate serial_number uniqueness if provided
    if asset_in.serial_number:
        stmt = select(Asset).where(Asset.serial_number == asset_in.serial_number)
        existing = await db.execute(stmt)
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Serial number already exists"
            )

    # Generate tag format AF-XXXXXX
    tag = await get_next_tag(db)
    
    new_asset = Asset(
        name=asset_in.name,
        category_id=asset_in.category_id,
        tag=tag,
        serial_number=asset_in.serial_number,
        acquisition_date=asset_in.acquisition_date,
        acquisition_cost=asset_in.acquisition_cost,
        condition=asset_in.condition,
        location=asset_in.location,
        is_shared=asset_in.is_shared if asset_in.is_shared is not None else False,
        status=AssetStatus.AVAILABLE,
        department_id=asset_in.department_id,
        photo_url=asset_in.photo_url,
        created_by=current_user.id
    )
    
    db.add(new_asset)
    await db.commit()
    
    # Eagerly load relations for response mapping
    stmt = (
        select(Asset)
        .options(
            joinedload(Asset.category), 
            joinedload(Asset.department),
            joinedload(Asset.active_allocation).joinedload(Allocation.employee),
            joinedload(Asset.active_allocation).joinedload(Allocation.department)
        )
        .where(Asset.id == new_asset.id)
    )
    res = await db.execute(stmt)
    refreshed_asset = res.scalar_one()
    
    return map_asset_to_response(refreshed_asset)

@router.get("/", response_model=AssetListResponse)
async def list_assets(
    search: Optional[str] = None,
    category_id: Optional[uuid.UUID] = None,
    status_filter: Optional[AssetStatus] = Query(None, alias="status"),
    department_id: Optional[uuid.UUID] = None,
    location: Optional[str] = None,
    is_shared: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all assets with filtering and pagination. Open to all authenticated active users.
    """
    query = (
        select(Asset)
        .options(
            joinedload(Asset.category), 
            joinedload(Asset.department),
            joinedload(Asset.active_allocation).joinedload(Allocation.employee),
            joinedload(Asset.active_allocation).joinedload(Allocation.department)
        )
    )
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Asset.tag.ilike(search_term),
                Asset.name.ilike(search_term),
                Asset.serial_number.ilike(search_term)
            )
        )
    if category_id:
        query = query.where(Asset.category_id == category_id)
    if status_filter:
        query = query.where(Asset.status == status_filter)
    if department_id:
        query = query.where(Asset.department_id == department_id)
    if location:
        query = query.where(Asset.location.ilike(f"%{location}%"))
    if is_shared is not None:
        query = query.where(Asset.is_shared == is_shared)
        
    # Count query
    count_query = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_query)
    total = count_res.scalar_one()
    
    # Ordering and paging
    query = query.order_by(Asset.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    assets = result.scalars().all()
    
    items = [map_asset_to_response(asset) for asset in assets]
    return AssetListResponse(items=items, total=total)

@router.get("/{id}", response_model=AssetResponse)
async def get_asset(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information of a specific asset.
    """
    stmt = (
        select(Asset)
        .options(
            joinedload(Asset.category), 
            joinedload(Asset.department),
            joinedload(Asset.active_allocation).joinedload(Allocation.employee),
            joinedload(Asset.active_allocation).joinedload(Allocation.department)
        )
        .where(Asset.id == id)
    )
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    return map_asset_to_response(asset)

@router.patch("/{id}", response_model=AssetResponse)
async def update_asset(
    id: uuid.UUID,
    asset_in: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER))
):
    """
    Update asset metadata. Only accessible by ADMIN or ASSET_MANAGER.
    """
    stmt = (
        select(Asset)
        .options(
            joinedload(Asset.category), 
            joinedload(Asset.department),
            joinedload(Asset.active_allocation).joinedload(Allocation.employee),
            joinedload(Asset.active_allocation).joinedload(Allocation.department)
        )
        .where(Asset.id == id)
    )
    result = await db.execute(stmt)
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    update_data = asset_in.model_dump(exclude_unset=True)
    
    # Validation re-checks on update
    if "category_id" in update_data and update_data["category_id"] != asset.category_id:
        category = await db.get(Category, update_data["category_id"])
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )
        if category.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category is not active"
            )
            
    if "department_id" in update_data and update_data["department_id"]:
        dept = await db.get(Department, update_data["department_id"])
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found"
            )
            
    if "serial_number" in update_data and update_data["serial_number"] != asset.serial_number:
        if update_data["serial_number"]:
            stmt = select(Asset).where(
                Asset.serial_number == update_data["serial_number"],
                Asset.id != id
            )
            existing = await db.execute(stmt)
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Serial number already exists"
                )

    # Apply changes
    for field, value in update_data.items():
        setattr(asset, field, value)
        
    await db.commit()
    await db.refresh(asset)
    
    return map_asset_to_response(asset)

@router.get("/{id}/history", response_model=AssetHistoryResponse)
async def get_asset_history(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the history timeline of an asset, including allocations, transfers, and maintenance logs.
    """
    asset = await db.get(Asset, id)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
        
    # Query allocations
    allocs_stmt = (
        select(Allocation)
        .options(joinedload(Allocation.employee))
        .where(Allocation.asset_id == id)
        .order_by(Allocation.allocated_at.desc())
    )
    allocs_res = await db.execute(allocs_stmt)
    allocs = allocs_res.scalars().all()
    
    # Query transfers
    trans_stmt = (
        select(TransferRequest)
        .where(TransferRequest.asset_id == id)
        .order_by(TransferRequest.requested_at.desc())
    )
    trans_res = await db.execute(trans_stmt)
    trans = trans_res.scalars().all()
    
    # Query maintenance requests
    maint_stmt = (
        select(MaintenanceRequest)
        .where(MaintenanceRequest.asset_id == id)
        .order_by(MaintenanceRequest.requested_at.desc())
    )
    maint_res = await db.execute(maint_stmt)
    maints = maint_res.scalars().all()
    
    # Map to schema stubs
    alloc_stubs = [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": a.employee.name if a.employee else None,
            "department_id": a.department_id,
            "allocated_at": a.allocated_at,
            "expected_return": a.expected_return,
            "returned_at": a.returned_at,
            "status": a.status.value
        }
        for a in allocs
    ]
    
    trans_stubs = [
        {
            "id": t.id,
            "from_user_id": t.from_user_id,
            "to_user_id": t.to_user_id,
            "status": t.status.value,
            "requested_at": t.requested_at,
            "resolved_at": t.decided_at
        }
        for t in trans
    ]
    
    maint_stubs = [
        {
            "id": m.id,
            "issue_description": m.issue_description,
            "priority": m.priority,
            "status": m.status.value,
            "requested_at": m.requested_at,
            "resolved_at": m.resolved_at
        }
        for m in maints
    ]
    
    return AssetHistoryResponse(
        asset_id=asset.id,
        tag=asset.tag,
        allocations=alloc_stubs,
        maintenance=maint_stubs,
        transfers=trans_stubs
    )
