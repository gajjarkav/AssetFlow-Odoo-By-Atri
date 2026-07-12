import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from src.core.enums import AllocationStatus

class AllocationCreate(BaseModel):
    asset_id: uuid.UUID
    employee_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    expected_return: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_target(self) -> "AllocationCreate":
        # Enforce employee_id XOR department_id (exactly one must be provided)
        emp_provided = self.employee_id is not None
        dept_provided = self.department_id is not None
        if emp_provided == dept_provided:
            raise ValueError("Specify exactly one of employee_id or department_id")
        return self

class AllocationResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    
    employee_id: Optional[uuid.UUID] = None
    employee_name: Optional[str] = None
    
    department_id: Optional[uuid.UUID] = None
    department_name: Optional[str] = None
    
    allocated_by: uuid.UUID
    allocated_by_name: Optional[str] = None
    allocated_at: datetime
    expected_return: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    return_condition_notes: Optional[str] = None
    
    status: AllocationStatus
    notes: Optional[str] = None
    is_overdue: bool = False

    model_config = {"from_attributes": True}

class AllocationReturn(BaseModel):
    condition_notes: Optional[str] = Field(None, max_length=500)
