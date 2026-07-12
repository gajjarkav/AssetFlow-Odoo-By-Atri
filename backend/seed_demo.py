import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import AsyncSessionLocal
from src.models.department import Department
from src.models.category import Category
from src.models.user import User
from src.models.asset import Asset
from src.models.allocation import Allocation
from src.models.booking import Booking
from src.core.security import get_password_hash
from src.core.enums import UserRole, AssetStatus, AllocationStatus, BookingStatus

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
        await db.refresh(emp)
        
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
            status=AssetStatus.ALLOCATED,  # Allocated to Arjun
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
        
        assets = [laptop, projector, room, chair]
        db.add_all(assets)
        await db.commit()
        await db.refresh(laptop)
        
        # 5. Create Demo Allocation (Laptop to Arjun)
        print("Creating Demo Allocation...")
        
        # 1. Normal active allocation for Laptop
        alloc = Allocation(
            asset_id=laptop.id,
            employee_id=emp.id,
            department_id=emp.department_id,
            allocated_by=am.id,
            expected_return=datetime.now(timezone.utc) + timedelta(days=30),
            status=AllocationStatus.ACTIVE,
        )
        db.add(alloc)
        laptop.status = AssetStatus.ALLOCATED
        
        # 2. Overdue allocation for Chair to trigger dashboard banner
        overdue_alloc = Allocation(
            asset_id=chair.id,
            employee_id=emp.id,
            department_id=emp.department_id,
            allocated_by=am.id,
            expected_return=datetime.now(timezone.utc) - timedelta(days=3),
            status=AllocationStatus.ACTIVE,
        )
        chair.status = AssetStatus.ALLOCATED
        db.add(overdue_alloc)
        await db.commit()
        
        # 6. Create Demo Booking — Room B2 booked by Arjun (starts in 1 hour)
        print("Creating Demo Booking...")
        now_dt = datetime.now(timezone.utc)
        booking = Booking(
            asset_id=room.id,
            user_id=emp.id,
            start_at=now_dt + timedelta(hours=1),
            end_at=now_dt + timedelta(hours=2),
            purpose="Procurement standup",
            status=BookingStatus.UPCOMING,
        )
        db.add(booking)
        await db.commit()
        
        # 7. Create Demo Maintenance Request — Projector (AF-000062) raised by Arjun
        print("Creating Demo Maintenance Request...")
        from src.models.maintenance import MaintenanceRequest
        from src.core.enums import MaintenancePriority, MaintenanceStatus
        
        maintenance = MaintenanceRequest(
            asset_id=projector.id,
            raised_by=emp.id,
            description="Projector lamp is flickering heavily, needs replacement.",
            priority=MaintenancePriority.HIGH,
            status=MaintenanceStatus.PENDING,
        )
        db.add(maintenance)
        await db.commit()
        
        print("Demo data seeded successfully!")
        print("Users created (password for all is 'password123'):")
        print("- raj@assetflow.com (ASSET_MANAGER)")
        print("- priya@assetflow.com (DEPARTMENT_HEAD)")
        print("- arjun@assetflow.com (EMPLOYEE)")
        print("Assets seeded: AF-000114 (Allocated to Arjun), AF-000062 (Projector with Maintenance), AF-000003, AF-000201")
        print("Booking seeded: Room B2 booked by Arjun 09:00–10:00 IST")
        print("Maintenance seeded: High priority request on Projector by Arjun")

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
