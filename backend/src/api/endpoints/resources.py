"""
GET /api/resources — thin alias returning all shared assets (is_shared=true).
This cleanly separates the "bookable resource catalog" from the general asset directory.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.core.enums import AssetStatus
from src.schemas.asset import AssetListResponse
from src.api.endpoints.assets import map_asset_to_response

router = APIRouter()


@router.get("/", response_model=AssetListResponse)
async def list_resources(
    search: Optional[str] = None,
    status_filter: Optional[AssetStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List bookable shared resources (assets where is_shared=true).
    Optional search and status filters supported.
    """
    q = (
        select(Asset)
        .options(
            joinedload(Asset.category),
            joinedload(Asset.department),
            joinedload(Asset.active_allocation).joinedload(Allocation.employee),
            joinedload(Asset.active_allocation).joinedload(Allocation.department),
        )
        .where(Asset.is_shared == True)  # noqa: E712
    )

    if search:
        term = f"%{search}%"
        q = q.where(
            or_(Asset.tag.ilike(term), Asset.name.ilike(term), Asset.location.ilike(term))
        )
    if status_filter:
        q = q.where(Asset.status == status_filter)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()

    q = q.order_by(Asset.created_at.desc()).offset(skip).limit(limit)
    assets = (await db.execute(q)).scalars().all()

    return AssetListResponse(items=[map_asset_to_response(a) for a in assets], total=total)
