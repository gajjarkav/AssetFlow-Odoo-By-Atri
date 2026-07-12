import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from src.core.enums import TransferStatus

class TransferCreate(BaseModel):
    asset_id: uuid.UUID
    to_user_id: uuid.UUID
    reason: str = Field(..., min_length=1, max_length=500)

class TransferDecision(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)

class TransferResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    
    from_user_id: uuid.UUID
    from_user_name: Optional[str] = None
    
    to_user_id: uuid.UUID
    to_user_name: Optional[str] = None
    
    reason: str
    status: TransferStatus
    
    requested_by: uuid.UUID
    requested_by_name: Optional[str] = None
    requested_at: datetime
    
    decided_by: Optional[uuid.UUID] = None
    decided_by_name: Optional[str] = None
    decided_at: Optional[datetime] = None
    decision_notes: Optional[str] = None
    
    allocation_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}
