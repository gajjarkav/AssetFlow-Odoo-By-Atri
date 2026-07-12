import enum

class UserRole(enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD"
    ASSET_MANAGER = "ASSET_MANAGER"
    ADMIN = "ADMIN"

class UserStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class AssetStatus(enum.Enum):
    AVAILABLE = "AVAILABLE"
    ALLOCATED = "ALLOCATED"
    RESERVED = "RESERVED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
    LOST = "LOST"
    RETIRED = "RETIRED"
    DISPOSED = "DISPOSED"

class BookingStatus(enum.Enum):
    UPCOMING = "UPCOMING"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MaintenanceStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class TransferStatus(enum.Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
