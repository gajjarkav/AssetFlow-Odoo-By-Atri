import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from src.core.enums import NotificationType


class NotificationReadUpdate(BaseModel):
    is_read: bool


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
