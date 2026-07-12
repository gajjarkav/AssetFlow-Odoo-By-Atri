from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from src.core.enums import UserRole, UserStatus

class UserBase(BaseModel):
    name: str = Field(..., max_length=255)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    department_id: uuid.UUID | None = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: uuid.UUID
    role: UserRole
    status: UserStatus
    last_login_at: datetime | None
    must_reset_password: bool
    created_at: datetime
    updated_at: datetime | None
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdateRole(BaseModel):
    role: UserRole

class UserUpdateStatus(BaseModel):
    status: UserStatus

class EmployeeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    department_id: uuid.UUID | None = None

class EmployeeOptionsResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    department_id: uuid.UUID | None = None
    role: UserRole
    
    model_config = ConfigDict(from_attributes=True)
