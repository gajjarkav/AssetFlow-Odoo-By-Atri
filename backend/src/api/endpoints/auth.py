import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.email import send_otp_email
from src.core.enums import UserRole, UserStatus
from src.core.security import create_access_token, get_password_hash, verify_password
from src.database.session import get_db
from src.models.user import User
from src.schemas.auth import (
    ForgotPasswordRequest,
    PasswordUpdate,
    ResetPasswordRequest,
    Token,
    UserLogin,
)
from src.schemas.user import UserCreate, UserResponse
from src.api.deps import get_current_user

router = APIRouter()

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    email_lower = user_in.email.lower()
    
    stmt = select(User).where(User.email == email_lower)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="EMAIL_EXISTS")
        
    user = User(
        name=user_in.name,
        email=email_lower,
        password_hash=get_password_hash(user_in.password),
        phone=user_in.phone,
        department_id=user_in.department_id,
        role=UserRole.EMPLOYEE,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email.lower())
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS")
        
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ACCOUNT_INACTIVE")
        
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return Token(access_token=access_token, token_type="bearer", user=user)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me/password")
async def change_password(
    password_in: PasswordUpdate, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(password_in.old_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_CREDENTIALS")
        
    current_user.password_hash = get_password_hash(password_in.new_password)
    current_user.must_reset_password = False
    await db.commit()
    return {"detail": "Password updated"}

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.lower())
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        return {"detail": "If an account exists, instructions were sent"}
        
    # Generate 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))
    
    user.reset_otp = get_password_hash(otp)
    user.reset_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.commit()
    
    send_otp_email(user.email, otp)
    
    from src.core.config import get_settings
    settings = get_settings()
    
    response_data = {"detail": "If an account exists, instructions were sent"}
    if settings.DEBUG:
        response_data["dev_otp"] = otp
        
    return response_data

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.lower())
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user or not user.reset_otp or not user.reset_otp_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_OTP")
        
    if user.reset_otp_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP_EXPIRED")
        
    if not verify_password(req.otp, user.reset_otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_OTP")
        
    user.password_hash = get_password_hash(req.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    user.must_reset_password = False
    await db.commit()
    
    return {"detail": "Password has been reset"}
