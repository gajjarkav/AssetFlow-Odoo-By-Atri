import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class OverdueReturnItem(BaseModel):
    allocation_id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    holder_name: Optional[str] = None
    holder_id: uuid.UUID
    expected_return: datetime
    days_overdue: int


class DashboardKpis(BaseModel):
    assets_available: int
    assets_allocated: int
    assets_under_maintenance: int
    open_maintenance: int
    active_bookings: int
    pending_transfers: int
    upcoming_returns: int
    overdue_returns: int


class QuickAction(BaseModel):
    key: str
    label: str
    roles: List[str]


class DashboardResponse(BaseModel):
    kpis: DashboardKpis
    overdue_returns: List[OverdueReturnItem]
    quick_actions: List[QuickAction]
    generated_at: datetime
