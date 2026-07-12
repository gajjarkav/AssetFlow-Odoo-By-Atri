import uuid
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field
from src.core.enums import AssetStatus

class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category_id: uuid.UUID
    serial_number: Optional[str] = Field(None, max_length=100)
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = Field(None, ge=0)
    condition: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    is_shared: Optional[bool] = False
    department_id: Optional[uuid.UUID] = None
    photo_url: Optional[str] = Field(None, max_length=500)

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category_id: Optional[uuid.UUID] = None
    serial_number: Optional[str] = Field(None, max_length=100)
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = Field(None, ge=0)
    condition: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    is_shared: Optional[bool] = None
    department_id: Optional[uuid.UUID] = None
    photo_url: Optional[str] = Field(None, max_length=500)
    status: Optional[AssetStatus] = None

class AssetResponse(AssetBase):
    id: uuid.UUID
    tag: str
    status: AssetStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[uuid.UUID] = None
    
    # Dyn fields (computed/loaded joins)
    category_name: Optional[str] = None
    department_name: Optional[str] = None
    current_holder_id: Optional[uuid.UUID] = None
    current_holder_name: Optional[str] = None

    model_config = {"from_attributes": True}

class AssetListResponse(BaseModel):
    items: List[AssetResponse]
    total: int

# -------------------------
# History Stubs
# -------------------------
class AllocationHistoryStub(BaseModel):
    id: uuid.UUID
    employee_id: Optional[uuid.UUID] = None
    employee_name: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    allocated_at: datetime
    expected_return: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    status: str

class MaintenanceHistoryStub(BaseModel):
    id: uuid.UUID
    issue_description: str
    priority: str
    status: str
    requested_at: datetime
    resolved_at: Optional[datetime] = None

class TransferHistoryStub(BaseModel):
    id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    status: str
    requested_at: datetime
    resolved_at: Optional[datetime] = None

class AssetHistoryResponse(BaseModel):
    asset_id: uuid.UUID
    tag: str
    allocations: List[AllocationHistoryStub] = []
    maintenance: List[MaintenanceHistoryStub] = []
    transfers: List[TransferHistoryStub] = []
