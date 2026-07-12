from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.models.transfer import Transfer
from src.models.booking import Booking
from src.models.maintenance import MaintenanceRequest
from src.core.enums import AssetStatus, AllocationStatus, TransferStatus, MaintenanceStatus, BookingStatus
from src.schemas.dashboard import DashboardResponse, DashboardKpis, OverdueReturnItem, QuickAction

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hydrate the dashboard with live operational KPIs and overdue items.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Asset Counts
    assets_available = (await db.execute(select(func.count()).where(Asset.status == AssetStatus.AVAILABLE))).scalar_one()
    assets_allocated = (await db.execute(select(func.count()).where(Asset.status == AssetStatus.ALLOCATED))).scalar_one()
    assets_under_maintenance = (await db.execute(select(func.count()).where(Asset.status == AssetStatus.UNDER_MAINTENANCE))).scalar_one()

    # 2. Open Maintenance
    open_maint_statuses = [
        MaintenanceStatus.PENDING,
        MaintenanceStatus.APPROVED,
        MaintenanceStatus.IN_PROGRESS
    ]
    open_maintenance = (await db.execute(
        select(func.count()).where(MaintenanceRequest.status.in_(open_maint_statuses))
    )).scalar_one()

    # 3. Active Bookings
    active_bookings = (await db.execute(
        select(func.count()).where(
            and_(Booking.status != BookingStatus.CANCELLED, Booking.end_at > now)
        )
    )).scalar_one()

    # 4. Pending Transfers
    pending_transfers = (await db.execute(
        select(func.count()).where(Transfer.status == TransferStatus.REQUESTED)
    )).scalar_one()

    # 5. Allocations (Upcoming vs Overdue)
    active_allocs_q = select(Allocation).where(
        and_(Allocation.status == AllocationStatus.ACTIVE, Allocation.expected_return.isnot(None))
    )
    
    upcoming_returns = (await db.execute(
        select(func.count()).select_from(active_allocs_q.where(Allocation.expected_return >= today_start).subquery())
    )).scalar_one()
    
    overdue_returns_count = (await db.execute(
        select(func.count()).select_from(active_allocs_q.where(Allocation.expected_return < today_start).subquery())
    )).scalar_one()

    # 6. Overdue List (Top 10)
    overdue_list_stmt = (
        active_allocs_q.where(Allocation.expected_return < today_start)
        .options(joinedload(Allocation.asset), joinedload(Allocation.employee))
        .order_by(Allocation.expected_return.asc())
        .limit(10)
    )
    overdue_rows = (await db.execute(overdue_list_stmt)).scalars().all()
    
    overdue_items = []
    for r in overdue_rows:
        # Calculate days overdue
        # Assumes expected_return has tzinfo, if not make it naive/aware consistently
        exp = r.expected_return.replace(tzinfo=timezone.utc) if r.expected_return.tzinfo is None else r.expected_return
        days_overdue = (now - exp).days
        if days_overdue < 1:
            days_overdue = 1  # If it's today but overdue, it's 1 day

        overdue_items.append(
            OverdueReturnItem(
                allocation_id=r.id,
                asset_id=r.asset_id,
                asset_tag=r.asset.tag if r.asset else None,
                asset_name=r.asset.name if r.asset else None,
                holder_name=r.employee.name if r.employee else None,
                holder_id=r.employee_id,
                expected_return=r.expected_return,
                days_overdue=days_overdue,
            )
        )

    kpis = DashboardKpis(
        assets_available=assets_available,
        assets_allocated=assets_allocated,
        assets_under_maintenance=assets_under_maintenance,
        open_maintenance=open_maintenance,
        active_bookings=active_bookings,
        pending_transfers=pending_transfers,
        upcoming_returns=upcoming_returns,
        overdue_returns=overdue_returns_count,
    )

    quick_actions = [
        QuickAction(key="register_asset", label="Register Asset", roles=["ADMIN", "ASSET_MANAGER"]),
        QuickAction(key="book_resource", label="Book Resource", roles=["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"]),
        QuickAction(key="raise_maintenance", label="Raise Maintenance Request", roles=["ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"])
    ]

    return DashboardResponse(
        kpis=kpis,
        overdue_returns=overdue_items,
        quick_actions=quick_actions,
        generated_at=now,
    )
