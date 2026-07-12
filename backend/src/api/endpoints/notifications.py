import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.notification import Notification
from src.core.enums import NotificationType
from src.schemas.notification import NotificationResponse

router = APIRouter()


async def notify(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: NotificationType,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
):
    """
    Helper to create a notification for a user.
    """
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notif)
    # The caller is responsible for db.commit() to ensure atomicity with their other operations


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    unread: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current user's notifications.
    """
    stmt = select(Notification).where(Notification.user_id == current_user.id)
    if unread is not None:
        stmt = stmt.where(Notification.is_read == (not unread))
    
    stmt = stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/unread-count", response_model=int)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the unread notification count for the current user.
    """
    stmt = select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    return (await db.execute(stmt)).scalar_one()


@router.post("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a single notification as read.
    """
    notif = await db.get(Notification, id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.post("/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark all the current user's notifications as read.
    """
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}
