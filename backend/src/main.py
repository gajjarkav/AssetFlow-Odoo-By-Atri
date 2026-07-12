from fastapi import FastAPI
from src.api.router import api_router
from src.core.constants import APP_NAME, API_VERSION, API_PREFIX
from src.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=APP_NAME,
    version=API_VERSION,
    openapi_url=f"{API_PREFIX}/openapi.json",
)

app.include_router(api_router, prefix=API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
