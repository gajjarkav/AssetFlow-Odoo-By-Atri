import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import AsyncSessionLocal
from src.models.department import Department
from src.models.category import Category
from src.models.user import User
from src.models.asset import Asset
from src.core.security import get_password_hash
from src.core.enums import UserRole, AssetStatus

async def seed_demo_data():
    async with AsyncSessionLocal() as db:
        print("Resetting database tables...")
        # Clean existing data to make seed script fully re-runnable
        await db.execute(text("TRUNCATE TABLE transfer_requests, maintenance_requests, bookings, allocations, assets, categories, departments, users CASCADE;"))
        await db.commit()
        
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
        furniture = Category(name="Furniture", warranty_months=24)
        db.add_all([elec, rooms, vehicles, furniture])
        await db.commit()
        await db.refresh(elec)
        await db.refresh(rooms)
        await db.refresh(furniture)
        
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
        await db.refresh(am)
        
        # Set Dept Heads
        eng.head_id = dh.id
        fac.head_id = am.id
        await db.commit()
        
        # 4. Create Demo Assets
        print("Creating Demo Assets...")
        laptop = Asset(
            name="Dell Laptop",
            category_id=elec.id,
            tag="AF-000114",
            serial_number="SN-DELL-114",
            acquisition_cost=75000.0,
            condition="GOOD",
            location="Longhorn",
            is_shared=False,
            status=AssetStatus.AVAILABLE,
            department_id=eng.id,
            created_by=am.id
        )
        
        projector = Asset(
            name="Projector",
            category_id=elec.id,
            tag="AF-000062",
            serial_number="SN-PROJ-062",
            acquisition_cost=45000.0,
            condition="FAIR",
            location="4th Floor",
            is_shared=False,
            status=AssetStatus.AVAILABLE,
            department_id=fac.id,
            created_by=am.id
        )
        
        room = Asset(
            name="Conference Room B2",
            category_id=rooms.id,
            tag="AF-000003",
            serial_number="ROOM-B2",
            acquisition_cost=0.0,
            condition="GOOD",
            location="Building B",
            is_shared=True,
            status=AssetStatus.AVAILABLE,
            department_id=fac.id,
            created_by=am.id
        )
        
        chair = Asset(
            name="Office Chair",
            category_id=furniture.id,
            tag="AF-000201",
            serial_number="SN-CHAIR-201",
            acquisition_cost=5000.0,
            condition="GOOD",
            location="Warehouse",
            is_shared=False,
            status=AssetStatus.AVAILABLE,
            department_id=eng.id,
            created_by=am.id
        )
        
        db.add_all([laptop, projector, room, chair])
        await db.commit()
        
        print("Demo data seeded successfully!")
        print("Users created (password for all is 'password123'):")
        print("- raj@assetflow.com (ASSET_MANAGER)")
        print("- priya@assetflow.com (DEPARTMENT_HEAD)")
        print("- arjun@assetflow.com (EMPLOYEE)")
        print("Assets seeded: AF-000114, AF-000062, AF-000003, AF-000201")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
