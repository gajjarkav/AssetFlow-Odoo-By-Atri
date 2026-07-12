import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import AsyncSessionLocal
from src.models.department import Department
from src.models.category import Category
from src.models.user import User
from src.core.security import get_password_hash
from src.core.enums import UserRole

async def seed_demo_data():
    async with AsyncSessionLocal() as db:
        print("Seeding Demo Data...")
        
        # 1. Create Departments
        print("Creating Departments...")
        eng = Department(name="Engineering", code="ENG")
        fac = Department(name="Facilities", code="FAC")
        db.add_all([eng, fac])
        await db.commit()
        await db.refresh(eng)
        await db.refresh(fac)
        
        # 2. Create Categories
        print("Creating Categories...")
        elec = Category(name="Electronics", warranty_months=12)
        rooms = Category(name="Rooms", description="Shared conference and meeting rooms")
        vehicles = Category(name="Vehicles", warranty_months=36)
        db.add_all([elec, rooms, vehicles])
        await db.commit()
        
        # 3. Create Demo Users
        print("Creating Demo Users...")
        # Asset Manager (Raj)
        am = User(
            name="Raj (Asset Manager)",
            email="raj@assetflow.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.ASSET_MANAGER,
            department_id=fac.id
        )
        
        # Department Head (Priya)
        dh = User(
            name="Priya (Engineering Head)",
            email="priya@assetflow.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.DEPARTMENT_HEAD,
            department_id=eng.id
        )
        
        # Employee
        emp = User(
            name="Arjun (Employee)",
            email="arjun@assetflow.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.EMPLOYEE,
            department_id=eng.id
        )
        
        db.add_all([am, dh, emp])
        await db.commit()
        
        # Set Dept Heads
        eng.head_id = dh.id
        fac.head_id = am.id
        await db.commit()
        
        print("Demo data seeded successfully!")
        print("Users created (password for all is 'password123'):")
        print("- raj@assetflow.com (ASSET_MANAGER)")
        print("- priya@assetflow.com (DEPARTMENT_HEAD)")
        print("- arjun@assetflow.com (EMPLOYEE)")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
