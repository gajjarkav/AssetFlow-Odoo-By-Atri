import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

# -------------------------
# Category Schemas
# -------------------------
class CategoryBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    warranty_months: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field("ACTIVE", max_length=50)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    warranty_months: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, max_length=50)

class CategoryResponse(CategoryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

# -------------------------
# Department Schemas
# -------------------------
class DepartmentBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    head_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    status: Optional[str] = Field("ACTIVE", max_length=50)

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    head_id: Optional[uuid.UUID] = None
    parent_id: Optional[uuid.UUID] = None
    status: Optional[str] = Field(None, max_length=50)

class DepartmentResponse(DepartmentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Helpful fields for UI, which we will populate in the API
    head_name: Optional[str] = None
    parent_name: Optional[str] = None

    model_config = {"from_attributes": True}
