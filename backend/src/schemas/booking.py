import uuid
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator
from src.core.enums import BookingStatus


class BookingCreate(BaseModel):
    asset_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    purpose: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_time_range(self) -> "BookingCreate":
        if self.end_at <= self.start_at:
            raise ValueError("end_at must be after start_at")
        return self


class BookingUpdate(BaseModel):
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    purpose: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_time_range(self) -> "BookingUpdate":
        if self.start_at and self.end_at and self.end_at <= self.start_at:
            raise ValueError("end_at must be after start_at")
        return self


class BookingCancelIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


class ConflictingBooking(BaseModel):
    booking_id: uuid.UUID
    start_at: datetime
    end_at: datetime
    user_name: Optional[str] = None
    purpose: Optional[str] = None


class BookingResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None

    user_id: uuid.UUID
    user_name: Optional[str] = None

    start_at: datetime
    end_at: datetime
    purpose: Optional[str] = None

    # Status is derived on read from timestamps (no cron needed)
    status: BookingStatus
    display_status: str  # UPCOMING / ONGOING / COMPLETED / CANCELLED

    created_at: datetime
    updated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class BookingListResponse(BaseModel):
    items: List[BookingResponse]
    total: int
