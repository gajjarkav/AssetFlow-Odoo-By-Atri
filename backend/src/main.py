from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.router import api_router
from src.core.constants import APP_NAME, API_VERSION, API_PREFIX
from src.core.config import get_settings

settings = get_settings()

# OpenAPI tag metadata — one entry per module for clean Swagger grouping
openapi_tags = [
    {"name": "System",        "description": "Health check / liveness probe. No auth required."},
    {"name": "auth",          "description": "Login and JWT issuance. `POST /auth/login` returns Bearer token."},
    {"name": "employees",     "description": "User management — list, invite, profile, role management."},
    {"name": "departments",   "description": "Organizational unit management with hierarchical support."},
    {"name": "categories",    "description": "Asset category definitions with warranty tracking."},
    {"name": "assets",        "description": "Asset catalog CRUD, auto-tagging, status lifecycle, and per-asset history."},
    {"name": "allocations",   "description": "Custody allocation. **409 ASSET_HELD** if already allocated. Return workflow included."},
    {"name": "transfers",     "description": "Peer-to-peer custody transfer requests with approval workflow."},
    {"name": "bookings",      "description": "Shared resource booking with **409 BOOKING_OVERLAP** half-open interval check."},
    {"name": "resources",     "description": "Shared assets (rooms, vehicles) — helper listing for booking UI."},
    {"name": "maintenance",   "description": "Maintenance state machine: PENDING → APPROVED → IN_PROGRESS → RESOLVED. Approve sets asset UNDER_MAINTENANCE; Resolve returns it to AVAILABLE."},
    {"name": "dashboard",     "description": "Live operational KPIs aggregated via SQL counts — no caching required."},
    {"name": "notifications", "description": "In-app notification inbox. Auto-triggered by allocation, transfer, booking, and maintenance events."},
    {"name": "audits",        "description": "Physical audit cycles. Closing a cycle marks MISSING items as LOST in the asset table."},
    {"name": "reports",       "description": "Analytics summary (JSON) and CSV data exports for assets, allocations, and maintenance."},
]

app = FastAPI(
    title="AssetFlow API",
    version=API_VERSION,
    description=(
        "**AssetFlow** — Enterprise Asset & Resource Management Platform\n\n"
        "Modules A–J fully implemented: Auth/RBAC, Org, Assets, Allocation, Booking, "
        "Maintenance, Dashboard, Notifications, Audits, and Reports.\n\n"
        "**Hero business rules:**\n"
        "- Double allocation → `409 ASSET_HELD` with `holder_name`\n"
        "- Booking overlap → `409 BOOKING_OVERLAP` with `conflicts_with`\n"
        "- Maintenance approve → asset becomes `UNDER_MAINTENANCE`\n"
        "- Audit close (MISSING) → asset becomes `LOST`\n\n"
        "Authenticate using the **Authorize** button (Bearer JWT from `POST /api/v1/auth/login`)."
    ),
    openapi_url=f"{API_PREFIX}/openapi.json",
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
    openapi_tags=openapi_tags,
)

# CORS — allow frontend origins defined in env
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(api_router, prefix=API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
