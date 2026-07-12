from datetime import datetime
from pydantic import BaseModel
from typing import List

class DashboardStats(BaseModel):
    available_assets: int
    allocated_assets: int
    active_bookings: int
    pending_transfers: int
    upcoming_returns: int
    overdue_returns: int

class ActivityItem(BaseModel):
    id: str
    type: str # "allocation", "booking", "maintenance", "transfer"
    description: str
    timestamp: datetime

class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_activity: List[ActivityItem]
