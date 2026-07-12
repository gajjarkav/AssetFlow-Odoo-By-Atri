from __future__ import annotations

from enum import Enum

class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"
    STAGING = "staging"

class UserRole(str, Enum):
    EMPLOYEE = "employee"
    DEPARTMENT_HEAD = "department_head"
    ASSET_MANAGER = "asset_manager"
    ADMIN = "admin"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class AssetStatus(str, Enum):
    AVAILABLE = "available"
    ALLOCATED = "allocated"
    UNDER_MAINTENANCE = "under_maintenance"
    RETIRED = "retired"
    LOST = "lost"

class AssetType(str, Enum):
    HARDWARE = "hardware"
    SOFTWARE = "software"
    FURNITURE = "furniture"
    VEHICLE = "vehicle"
    OTHER = "other"
