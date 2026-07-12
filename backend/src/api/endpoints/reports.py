import io
import csv
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_db
from src.api.deps import require_roles
from src.models.user import User
from src.models.department import Department
from src.models.asset import Asset
from src.models.category import Category
from src.models.allocation import Allocation
from src.models.maintenance import MaintenanceRequest
from src.models.booking import Booking
from src.core.enums import UserRole, AssetStatus, AllocationStatus
from src.schemas.report import (
    ReportSummaryResponse,
    DepartmentUtilization,
    CategoryMaintenance,
    AssetUsage,
    IdleAsset
)

router = APIRouter()


@router.get("/summary", response_model=ReportSummaryResponse)
async def get_report_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)),
):
    """
    Get aggregated analytics for reports.
    """
    now = datetime.now(timezone.utc)
    
    # Optional filtering for department head
    dept_filter = True
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        dept_filter = Asset.department_id == current_user.department_id

    # 1. Utilization by Department
    dept_stmt = select(
        Department.id,
        Department.name,
        func.count(Asset.id).label("total"),
        func.count(Asset.id).filter(Asset.status == AssetStatus.ALLOCATED).label("allocated"),
        func.count(Asset.id).filter(Asset.status == AssetStatus.AVAILABLE).label("available"),
        func.count(Asset.id).filter(Asset.status == AssetStatus.UNDER_MAINTENANCE).label("under_maintenance")
    ).select_from(Department).outerjoin(Asset, Asset.department_id == Department.id).group_by(Department.id)
    
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        dept_stmt = dept_stmt.where(Department.id == current_user.department_id)
        
    dept_res = await db.execute(dept_stmt)
    utilization_by_department = [
        DepartmentUtilization(
            department_id=row.id,
            department_name=row.name,
            total_assets=row.total,
            allocated=row.allocated,
            available=row.available,
            under_maintenance=row.under_maintenance
        )
        for row in dept_res.all()
    ]
    
    # 2. Maintenance by Category
    maint_stmt = select(
        Category.name,
        func.count(MaintenanceRequest.id)
    ).select_from(Category).join(Asset, Asset.category_id == Category.id).join(
        MaintenanceRequest, MaintenanceRequest.asset_id == Asset.id
    )
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        maint_stmt = maint_stmt.where(Asset.department_id == current_user.department_id)
    maint_stmt = maint_stmt.group_by(Category.name)
    
    maint_res = await db.execute(maint_stmt)
    maintenance_by_category = [
        CategoryMaintenance(category_name=row[0], request_count=row[1]) for row in maint_res.all()
    ]
    
    # 3. Most Used Assets
    used_stmt = select(
        Asset.id,
        Asset.tag,
        Asset.name,
        func.count(Allocation.id).label("alloc_count")
    ).outerjoin(Allocation, Allocation.asset_id == Asset.id).where(dept_filter).group_by(Asset.id).order_by(
        func.count(Allocation.id).desc()
    ).limit(10)
    
    used_res = await db.execute(used_stmt)
    most_used_assets = [
        AssetUsage(asset_id=row.id, asset_tag=row.tag or "N/A", name=row.name, allocation_count=row.alloc_count)
        for row in used_res.all()
    ]
    
    # 4. Idle Assets (Available, no active allocation, no booking in last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    
    # Assets with recent bookings
    recent_bookings = select(Booking.asset_id).where(Booking.end_at >= thirty_days_ago)
    
    idle_stmt = select(Asset).where(
        and_(
            dept_filter,
            Asset.status == AssetStatus.AVAILABLE,
            Asset.id.not_in(recent_bookings)
        )
    ).order_by(Asset.updated_at.asc()).limit(10)
    
    idle_res = await db.execute(idle_stmt)
    idle_assets = []
    for a in idle_res.scalars().all():
        days_idle = (now - (a.updated_at or a.created_at)).days
        if days_idle < 0:
            days_idle = 0
        idle_assets.append(IdleAsset(
            asset_id=a.id,
            asset_tag=a.tag or "N/A",
            name=a.name,
            days_idle=days_idle
        ))
        
    return ReportSummaryResponse(
        utilization_by_department=utilization_by_department,
        maintenance_by_category=maintenance_by_category,
        most_used_assets=most_used_assets,
        idle_assets=idle_assets,
        generated_at=now
    )


@router.get("/export.csv")
async def export_csv(
    type: str = Query(..., description="Type of data to export: assets, allocations, maintenance"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPARTMENT_HEAD)),
):
    """
    Export reports as CSV file.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    dept_filter = True
    if current_user.role == UserRole.DEPARTMENT_HEAD:
        dept_filter = Asset.department_id == current_user.department_id
        
    if type == "assets":
        writer.writerow(["Tag", "Name", "Category", "Status", "Location", "Department", "Is Shared", "Condition", "Acquisition Cost"])
        
        stmt = select(Asset).options(
            joinedload(Asset.category), joinedload(Asset.department)
        ).where(dept_filter).order_by(Asset.tag)
        assets = (await db.execute(stmt)).scalars().all()
        
        for a in assets:
            writer.writerow([
                a.tag,
                a.name,
                a.category.name if a.category else "",
                a.status.value if a.status else "",
                a.location,
                a.department.name if a.department else "",
                "Yes" if a.is_shared else "No",
                a.condition,
                str(a.acquisition_cost) if a.acquisition_cost else ""
            ])
            
    elif type == "allocations":
        writer.writerow(["Asset Tag", "Asset Name", "Holder", "Holder Type", "Status", "Allocated At", "Expected Return", "Returned At"])
        
        stmt = select(Allocation).options(
            joinedload(Allocation.asset),
            joinedload(Allocation.employee),
            joinedload(Allocation.department)
        ).join(Asset).where(dept_filter).order_by(Allocation.created_at.desc())
        
        allocs = (await db.execute(stmt)).scalars().all()
        for al in allocs:
            holder = al.employee.name if al.employee else (al.department.name if al.department else "Unknown")
            holder_type = "Employee" if al.employee else "Department"
            writer.writerow([
                al.asset.tag if al.asset else "",
                al.asset.name if al.asset else "",
                holder,
                holder_type,
                al.status.value if al.status else "",
                al.created_at.isoformat() if al.created_at else "",
                al.expected_return.isoformat() if al.expected_return else "",
                al.returned_at.isoformat() if al.returned_at else ""
            ])
            
    elif type == "maintenance":
        writer.writerow(["Asset Tag", "Asset Name", "Raised By", "Status", "Priority", "Created At", "Resolved At"])
        
        stmt = select(MaintenanceRequest).options(
            joinedload(MaintenanceRequest.asset),
            joinedload(MaintenanceRequest.raiser)
        ).join(Asset).where(dept_filter).order_by(MaintenanceRequest.created_at.desc())
        
        maints = (await db.execute(stmt)).scalars().all()
        for m in maints:
            writer.writerow([
                m.asset.tag if m.asset else "",
                m.asset.name if m.asset else "",
                m.raiser.name if m.raiser else "",
                m.status.value if m.status else "",
                m.priority.value if m.priority else "",
                m.created_at.isoformat() if m.created_at else "",
                m.resolved_at.isoformat() if m.resolved_at else ""
            ])
    else:
        raise HTTPException(status_code=400, detail="Invalid export type")
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f'attachment; filename="{type}_export.csv"'
    return response
