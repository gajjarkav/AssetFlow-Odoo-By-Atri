import asyncio
from sqlalchemy import select
from src.database.session import AsyncSessionLocal
from src.models.user import User
from src.core.enums import UserRole, UserStatus
from src.core.security import get_password_hash

async def seed_admin():
    async with AsyncSessionLocal() as session:
        # Check if an admin already exists
        result = await session.execute(select(User).where(User.email == "admin@assetflow.com"))
        existing_admin = result.scalars().first()
        
        if existing_admin:
            print("Admin user already exists. Email: admin@assetflow.com")
            return

        # Create the admin user
        admin = User(
            name="System Admin",
            email="admin@assetflow.com",
            password_hash=get_password_hash("adminpassword123"),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        session.add(admin)
        await session.commit()
        print("Admin user created successfully!")
        print("Email: admin@assetflow.com")
        print("Password: adminpassword123")

if __name__ == "__main__":
    asyncio.run(seed_admin())
