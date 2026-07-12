import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from src.core.enums import MaintenanceStatus, MaintenancePriority


class MaintenanceCreate(BaseModel):
    asset_id: uuid.UUID
    description: str = Field(..., min_length=1, max_length=1000)
    priority: MaintenancePriority = Field(default=MaintenancePriority.MEDIUM)
    photo_url: Optional[str] = Field(None, max_length=500)


class MaintenanceTransition(BaseModel):
    to: MaintenanceStatus
    technician_name: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=1000)


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    asset_status: Optional[str] = None
    
    raised_by: uuid.UUID
    raised_by_name: Optional[str] = None
    
    description: str
    priority: MaintenancePriority
    status: MaintenanceStatus
    
    photo_url: Optional[str] = None
    technician_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MaintenanceListResponse(BaseModel):
    items: List[MaintenanceResponse]
    total: int
