from __future__ import annotations
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import parts, bins, system
from app.routers import auth_router, ai as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="BINDEX", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(ai_router.router)
app.include_router(parts.router)
app.include_router(bins.router)
app.include_router(system.router)

FRONTEND_DIR = Path(os.environ.get("BINDEX_FRONTEND", "/var/bindex/frontend/dist"))
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
