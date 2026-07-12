from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user, require_roles
from src.models.user import User
from src.models.category import Category
from src.core.enums import UserRole
from src.schemas.organization import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Category)
    if status_filter:
        query = query.where(Category.status == status_filter)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{id}", response_model=CategoryResponse)
async def get_category(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cat = await db.get(Category, id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    cat_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_roles(UserRole.ADMIN))
):
    existing = await db.execute(select(Category).where(Category.name == cat_in.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Category name already exists")

    new_cat = Category(**cat_in.model_dump())
    db.add(new_cat)
    await db.commit()
    await db.refresh(new_cat)
    return new_cat

@router.patch("/{id}", response_model=CategoryResponse)
async def update_category(
    id: uuid.UUID,
    cat_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_roles(UserRole.ADMIN))
):
    cat = await db.get(Category, id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    update_data = cat_in.model_dump(exclude_unset=True)
    
    if "name" in update_data and update_data["name"] != cat.name:
        existing = await db.execute(select(Category).where(Category.name == update_data["name"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Category name already exists")

    for field, value in update_data.items():
        setattr(cat, field, value)
        
    await db.commit()
    await db.refresh(cat)
    return cat
