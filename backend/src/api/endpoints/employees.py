import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.enums import UserRole, UserStatus
from src.database.session import get_db
from src.models.user import User
from src.models.department import Department
from src.schemas.user import UserResponse, UserUpdateRole, UserUpdateStatus, EmployeeUpdate, EmployeeOptionsResponse
from src.api.deps import require_roles

router = APIRouter()

@router.get("/options", response_model=List[EmployeeOptionsResponse])
async def list_employee_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD))
):
    """
    Get a slim list of employees for UI dropdown pickers.
    """
    result = await db.execute(select(User).where(User.status == UserStatus.ACTIVE))
    return result.scalars().all()

@router.get("/", response_model=List[UserResponse])
async def list_employees(
    role: Optional[UserRole] = None,
    status_filter: Optional[UserStatus] = Query(None, alias="status"),
    department_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    """
    List all employees with filters. Only accessible by ADMIN.
    """
    query = select(User)
    
    if role:
        query = query.where(User.role == role)
    if status_filter:
        query = query.where(User.status == status_filter)
    if department_id:
        query = query.where(User.department_id == department_id)
    if search:
        search_term = f"%{search}%"
        query = query.where(or_(User.name.ilike(search_term), User.email.ilike(search_term)))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{id}", response_model=UserResponse)
async def update_employee(
    id: uuid.UUID,
    employee_in: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    """
    Update employee generic details (name, phone, department_id). Only accessible by ADMIN.
    """
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        
    update_data = employee_in.model_dump(exclude_unset=True)
    
    if "department_id" in update_data and update_data["department_id"]:
        dept = await db.get(Department, update_data["department_id"])
        if not dept:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="DEPARTMENT_NOT_FOUND")
            
    for field, value in update_data.items():
        setattr(user, field, value)
        
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{id}/role", response_model=UserResponse)
async def update_employee_role(
    id: uuid.UUID,
    role_in: UserUpdateRole,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    """
    Update the role of an employee (Promotion/Demotion). Only accessible by ADMIN.
    """
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        
    if user.id == current_user.id and role_in.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CANNOT_DEMOTE_SELF")
        
    user.role = role_in.role
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{id}/status", response_model=UserResponse)
async def update_employee_status(
    id: uuid.UUID,
    status_in: UserUpdateStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    """
    Activate or deactivate an employee. Only accessible by ADMIN.
    """
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        
    if user.id == current_user.id and status_in.status == UserStatus.INACTIVE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CANNOT_DEACTIVATE_SELF")
        
    user.status = status_in.status
    await db.commit()
    await db.refresh(user)
    return user
