from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user, require_roles
from src.models.user import User
from src.models.department import Department
from src.core.enums import UserRole
from src.schemas.organization import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter()

@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Department)
    if status_filter:
        query = query.where(Department.status == status_filter)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id}", response_model=DepartmentResponse)
async def get_department(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dept = await db.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept_in: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_roles(UserRole.ADMIN))
):
    existing = await db.execute(select(Department).where(Department.name == dept_in.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Department name already exists")
    
    if dept_in.code:
        existing_code = await db.execute(select(Department).where(Department.code == dept_in.code))
        if existing_code.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Department code already exists")
            
    if dept_in.parent_id:
        parent = await db.get(Department, dept_in.parent_id)
        if not parent:
            raise HTTPException(status_code=400, detail="Parent department not found")
            
    if dept_in.head_id:
        head = await db.get(User, dept_in.head_id)
        if not head:
            raise HTTPException(status_code=400, detail="Head user not found")

    new_dept = Department(**dept_in.model_dump())
    db.add(new_dept)
    await db.commit()
    await db.refresh(new_dept)
    return new_dept

@router.patch("/{id}", response_model=DepartmentResponse)
async def update_department(
    id: uuid.UUID,
    dept_in: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_roles(UserRole.ADMIN))
):
    dept = await db.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    update_data = dept_in.model_dump(exclude_unset=True)
    
    if "name" in update_data and update_data["name"] != dept.name:
        existing = await db.execute(select(Department).where(Department.name == update_data["name"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Department name already exists")
            
    if "code" in update_data and update_data["code"] and update_data["code"] != dept.code:
        existing_code = await db.execute(select(Department).where(Department.code == update_data["code"]))
        if existing_code.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Department code already exists")
            
    if "parent_id" in update_data and update_data["parent_id"]:
        if update_data["parent_id"] == id:
            raise HTTPException(status_code=400, detail="Department cannot be its own parent")
        parent = await db.get(Department, update_data["parent_id"])
        if not parent:
            raise HTTPException(status_code=400, detail="Parent department not found")
            
    if "head_id" in update_data and update_data["head_id"]:
        head = await db.get(User, update_data["head_id"])
        if not head:
            raise HTTPException(status_code=400, detail="Head user not found")

    for field, value in update_data.items():
        setattr(dept, field, value)
        
    await db.commit()
    await db.refresh(dept)
    return dept
