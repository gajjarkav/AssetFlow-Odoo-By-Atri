from datetime import datetime, timezone
from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.session import AsyncSessionLocal

router = APIRouter()


@router.get(
    "/health",
    tags=["System"],
    summary="Health check",
    description="Public liveness probe. Returns 200 OK if the API and database are reachable, 503 if the database is down.",
)
async def health_check():
    """
    Liveness probe — no auth required.
    Attempts a trivial DB ping (SELECT 1). Returns degraded + 503 if DB unreachable.
    """
    from fastapi import Response
    import json

    db_status = "up"
    http_status = 200

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "down"
        http_status = 503

    payload = {
        "status": "ok" if db_status == "up" else "degraded",
        "service": "assetflow-api",
        "version": "1.0.0",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return Response(
        content=json.dumps(payload),
        status_code=http_status,
        media_type="application/json",
    )
