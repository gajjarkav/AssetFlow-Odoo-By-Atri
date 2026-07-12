from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.models.booking import Booking
from src.models.transfer import TransferRequest
from src.core.enums import AssetStatus, BookingStatus, TransferStatus
from src.schemas.dashboard import DashboardResponse, DashboardStats

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Available Assets
    avail_result = await db.execute(select(func.count(Asset.id)).where(Asset.status == AssetStatus.AVAILABLE))
    available_assets = avail_result.scalar() or 0
    
    # 2. Allocated Assets
    alloc_result = await db.execute(select(func.count(Asset.id)).where(Asset.status == AssetStatus.ALLOCATED))
    allocated_assets = alloc_result.scalar() or 0
    
    # 3. Active Bookings
    bookings_result = await db.execute(
        select(func.count(Booking.id)).where(
            or_(Booking.status == BookingStatus.UPCOMING, Booking.status == BookingStatus.ONGOING)
        )
    )
    active_bookings = bookings_result.scalar() or 0
    
    # 4. Pending Transfers
    transfers_result = await db.execute(
        select(func.count(TransferRequest.id)).where(TransferRequest.status == TransferStatus.REQUESTED)
    )
    pending_transfers = transfers_result.scalar() or 0
    
    # 5. Overdue and Upcoming returns
    now = datetime.now(timezone.utc)
    
    overdue_result = await db.execute(
        select(func.count(Allocation.id)).where(
            Allocation.expected_return_date < now,
            Allocation.actual_return_date.is_(None)
        )
    )
    overdue_returns = overdue_result.scalar() or 0
    
    upcoming_result = await db.execute(
        select(func.count(Allocation.id)).where(
            Allocation.expected_return_date >= now,
            Allocation.actual_return_date.is_(None)
        )
    )
    upcoming_returns = upcoming_result.scalar() or 0
    
    stats = DashboardStats(
        available_assets=available_assets,
        allocated_assets=allocated_assets,
        active_bookings=active_bookings,
        pending_transfers=pending_transfers,
        upcoming_returns=upcoming_returns,
        overdue_returns=overdue_returns
    )
    
    return DashboardResponse(
        stats=stats,
        recent_activity=[]
    )
