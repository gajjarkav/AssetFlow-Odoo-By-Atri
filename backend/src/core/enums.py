from __future__ import annotations

from enum import Enum

class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"
    STAGING = "staging"

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    MANAGER = "manager"

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
