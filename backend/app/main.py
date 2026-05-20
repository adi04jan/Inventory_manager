from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import parts, bins, system


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

app.include_router(parts.router)
app.include_router(bins.router)
app.include_router(system.router)


@app.get("/")
def root():
    return {"service": "bindex", "version": "0.1.0", "docs": "/docs"}
