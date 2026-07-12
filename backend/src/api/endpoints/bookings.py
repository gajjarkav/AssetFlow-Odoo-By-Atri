import uuid
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.asset import Asset
from src.models.booking import Booking
from src.core.enums import BookingStatus, AssetStatus, UserRole
from src.schemas.booking import (
    BookingCreate,
    BookingUpdate,
    BookingCancelIn,
    BookingResponse,
    BookingListResponse,
    ConflictingBooking,
)

router = APIRouter()


def compute_display_status(booking: Booking) -> str:
    """Derive UPCOMING / ONGOING / COMPLETED without a cron job."""
    if booking.status == BookingStatus.CANCELLED:
        return "CANCELLED"
    now = datetime.now(timezone.utc)
    # Ensure timezone-aware comparisons
    start = booking.start_at.replace(tzinfo=timezone.utc) if booking.start_at.tzinfo is None else booking.start_at
    end = booking.end_at.replace(tzinfo=timezone.utc) if booking.end_at.tzinfo is None else booking.end_at
    if now < start:
        return "UPCOMING"
    elif start <= now < end:
        return "ONGOING"
    else:
        return "COMPLETED"


def map_booking(b: Booking) -> BookingResponse:
    return BookingResponse(
        id=b.id,
        asset_id=b.asset_id,
        asset_tag=b.asset.tag if b.asset else None,
        asset_name=b.asset.name if b.asset else None,
        user_id=b.user_id,
        user_name=b.user.name if b.user else None,
        start_at=b.start_at,
        end_at=b.end_at,
        purpose=b.purpose,
        status=b.status,
        display_status=compute_display_status(b),
        created_at=b.created_at,
        updated_at=b.updated_at,
        cancelled_at=b.cancelled_at,
        cancelled_by=b.cancelled_by,
    )


def _load_booking_query(extra_filter=None):
    """Base query with all needed eager loads."""
    q = (
        select(Booking)
        .options(
            joinedload(Booking.asset),
            joinedload(Booking.user),
            joinedload(Booking.canceller),
        )
    )
    if extra_filter is not None:
        q = q.where(extra_filter)
    return q


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_in: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Book a shared resource. Rejects with 409 BOOKING_OVERLAP if slot is taken.
    """
    # 1. Load & validate asset
    asset = await db.get(Asset, booking_in.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.is_shared:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Asset is not a shared resource", "code": "ASSET_NOT_SHARED"},
        )

    if asset.status in (AssetStatus.RETIRED, AssetStatus.DISPOSED, AssetStatus.LOST, AssetStatus.UNDER_MAINTENANCE):
        raise HTTPException(
            status_code=400,
            detail={"detail": "Asset is not bookable in its current state", "code": "ASSET_NOT_BOOKABLE"},
        )

    # 2. Half-open interval overlap check: new_start < existing_end AND new_end > existing_start
    overlap_stmt = (
        select(Booking)
        .options(joinedload(Booking.user))
        .where(
            and_(
                Booking.asset_id == booking_in.asset_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.start_at < booking_in.end_at,
                Booking.end_at > booking_in.start_at,
            )
        )
    )
    overlap_res = await db.execute(overlap_stmt)
    conflicts = overlap_res.scalars().all()

    if conflicts:
        conflict_list = [
            ConflictingBooking(
                booking_id=c.id,
                start_at=c.start_at,
                end_at=c.end_at,
                user_name=c.user.name if c.user else None,
                purpose=c.purpose,
            )
            for c in conflicts
        ]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": "Time slot overlaps an existing booking",
                "code": "BOOKING_OVERLAP",
                "asset_id": str(asset.id),
                "asset_tag": asset.tag,
                "conflicts_with": [cf.model_dump(mode="json") for cf in conflict_list],
            },
        )

    # 3. Create booking
    new_booking = Booking(
        asset_id=booking_in.asset_id,
        user_id=current_user.id,
        start_at=booking_in.start_at,
        end_at=booking_in.end_at,
        purpose=booking_in.purpose,
        status=BookingStatus.UPCOMING,
    )
    db.add(new_booking)
    await db.commit()

    # Reload with joins
    reload_res = await db.execute(_load_booking_query(Booking.id == new_booking.id))
    return map_booking(reload_res.scalar_one())


@router.get("/", response_model=BookingListResponse)
async def list_bookings(
    asset_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    status_filter: Optional[BookingStatus] = Query(None, alias="status"),
    date: Optional[str] = Query(None, description="YYYY-MM-DD — bookings intersecting this day"),
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List bookings with filters; ordered by start_at asc (calendar-friendly)."""
    q = _load_booking_query()

    if asset_id:
        q = q.where(Booking.asset_id == asset_id)
    if user_id:
        q = q.where(Booking.user_id == user_id)
    if status_filter:
        q = q.where(Booking.status == status_filter)

    # Date-intersection filter (bookings that touch this calendar day)
    if date:
        try:
            day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            day_end = day + timedelta(days=1)
            q = q.where(and_(Booking.start_at < day_end, Booking.end_at > day))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    if from_dt:
        q = q.where(Booking.start_at >= from_dt)
    if to_dt:
        q = q.where(Booking.end_at <= to_dt)

    # Count
    count_stmt = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    q = q.order_by(Booking.start_at.asc()).offset(skip).limit(limit)
    result = await db.execute(q)
    bookings = result.scalars().all()

    return BookingListResponse(items=[map_booking(b) for b in bookings], total=total)


@router.get("/{id}", response_model=BookingResponse)
async def get_booking(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(_load_booking_query(Booking.id == id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return map_booking(booking)


@router.post("/{id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    id: uuid.UUID,
    cancel_in: BookingCancelIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a booking. Actor must be the booker or ADMIN/ASSET_MANAGER."""
    result = await db.execute(_load_booking_query(Booking.id == id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Booking is already cancelled", "code": "BOOKING_NOT_CANCELLABLE"},
        )

    is_admin_am = current_user.role in (UserRole.ADMIN, UserRole.ASSET_MANAGER)
    is_owner = booking.user_id == current_user.id
    if not (is_owner or is_admin_am):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancelled_by = current_user.id

    await db.commit()
    await db.refresh(booking)
    return map_booking(booking)


@router.patch("/{id}", response_model=BookingResponse)
async def reschedule_booking(
    id: uuid.UUID,
    update_in: BookingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reschedule (update times/purpose). Re-runs overlap check excluding self."""
    result = await db.execute(_load_booking_query(Booking.id == id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled booking")

    is_admin_am = current_user.role in (UserRole.ADMIN, UserRole.ASSET_MANAGER)
    is_owner = booking.user_id == current_user.id
    if not (is_owner or is_admin_am):
        raise HTTPException(status_code=403, detail="Not authorized to reschedule this booking")

    new_start = update_in.start_at or booking.start_at
    new_end = update_in.end_at or booking.end_at

    if new_end <= new_start:
        raise HTTPException(status_code=400, detail={"detail": "end_at must be after start_at", "code": "INVALID_TIME_RANGE"})

    # Overlap check excluding self
    overlap_stmt = (
        select(Booking)
        .options(joinedload(Booking.user))
        .where(
            and_(
                Booking.asset_id == booking.asset_id,
                Booking.id != id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.start_at < new_end,
                Booking.end_at > new_start,
            )
        )
    )
    conflicts = (await db.execute(overlap_stmt)).scalars().all()
    if conflicts:
        conflict_list = [
            ConflictingBooking(
                booking_id=c.id,
                start_at=c.start_at,
                end_at=c.end_at,
                user_name=c.user.name if c.user else None,
                purpose=c.purpose,
            )
            for c in conflicts
        ]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": "New time slot overlaps an existing booking",
                "code": "BOOKING_OVERLAP",
                "conflicts_with": [cf.model_dump(mode="json") for cf in conflict_list],
            },
        )

    # Apply changes
    booking.start_at = new_start
    booking.end_at = new_end
    if update_in.purpose is not None:
        booking.purpose = update_in.purpose

    await db.commit()
    await db.refresh(booking)
    return map_booking(booking)
