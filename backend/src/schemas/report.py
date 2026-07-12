import uuid
from typing import List
from datetime import datetime
from pydantic import BaseModel


class DepartmentUtilization(BaseModel):
    department_id: uuid.UUID
    department_name: str
    total_assets: int
    allocated: int
    available: int
    under_maintenance: int


class CategoryMaintenance(BaseModel):
    category_name: str
    request_count: int


class AssetUsage(BaseModel):
    asset_id: uuid.UUID
    asset_tag: str
    name: str
    allocation_count: int


class IdleAsset(BaseModel):
    asset_id: uuid.UUID
    asset_tag: str
    name: str
    days_idle: int


class ReportSummaryResponse(BaseModel):
    utilization_by_department: List[DepartmentUtilization]
    maintenance_by_category: List[CategoryMaintenance]
    most_used_assets: List[AssetUsage]
    idle_assets: List[IdleAsset]
    generated_at: datetime
