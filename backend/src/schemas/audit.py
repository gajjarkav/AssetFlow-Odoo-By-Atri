import uuid
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
from src.core.enums import AuditCycleStatus, AuditResult, AuditScopeType


class AuditCycleCreate(BaseModel):
    title: str
    scope_type: AuditScopeType
    scope_value: Optional[str] = None
    start_date: date
    end_date: date


class AuditItemMark(BaseModel):
    asset_id: uuid.UUID
    result: AuditResult
    notes: Optional[str] = None


class AuditCycleSummary(BaseModel):
    id: uuid.UUID
    title: str
    scope_type: AuditScopeType
    status: AuditCycleStatus
    start_date: date
    end_date: date
    items_total: int
    items_verified: int
    items_missing: int
    items_damaged: int
    items_pending: int
    created_at: datetime


class AuditItemResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    expected_location: Optional[str] = None
    result: Optional[AuditResult] = None
    notes: Optional[str] = None
    marked_by_name: Optional[str] = None
    marked_at: Optional[datetime] = None


class AuditCycleDetail(AuditCycleSummary):
    items: List[AuditItemResponse]

    class Config:
        from_attributes = True


class AuditDiscrepancyResponse(BaseModel):
    items: List[AuditItemResponse]
