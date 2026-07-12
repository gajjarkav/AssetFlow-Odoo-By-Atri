import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.database.base import Base
from src.core.enums import AuditCycleStatus, AuditResult, AuditScopeType


class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    
    scope_type = Column(SQLEnum(AuditScopeType, name="auditscopetype"), nullable=False)
    scope_value = Column(String(255), nullable=True)  # department_id or location string
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    status = Column(SQLEnum(AuditCycleStatus, name="auditcyclestatus"), default=AuditCycleStatus.OPEN, nullable=False)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator = relationship("User")
    items = relationship("AuditItem", back_populates="cycle", cascade="all, delete-orphan")


class AuditItem(Base):
    __tablename__ = "audit_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    
    expected_location = Column(String(255), nullable=True)
    
    result = Column(SQLEnum(AuditResult, name="auditresult"), nullable=True)
    notes = Column(Text, nullable=True)
    
    marked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    marked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    cycle = relationship("AuditCycle", back_populates="items")
    asset = relationship("Asset")
    marker = relationship("User")
