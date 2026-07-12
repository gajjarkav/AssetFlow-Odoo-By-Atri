from fastapi import APIRouter

from src.api.endpoints import auth, employees, dashboard, departments, categories, assets, allocations, transfers, bookings, resources, maintenance

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(allocations.router, prefix="/allocations", tags=["allocations"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["transfers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(resources.router, prefix="/resources", tags=["resources"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
