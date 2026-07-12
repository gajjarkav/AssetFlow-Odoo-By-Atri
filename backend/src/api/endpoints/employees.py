import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.enums import UserRole, UserStatus
from src.database.session import get_db
from src.models.user import User
from src.schemas.user import UserResponse, UserUpdateRole, UserUpdateStatus
from src.api.deps import require_roles

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def list_employees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    """
    List all employees. Only accessible by ADMIN.
    """
    result = await db.execute(select(User))
    return result.scalars().all()

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
