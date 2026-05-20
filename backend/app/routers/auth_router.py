from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.auth import login as _login, logout as _logout, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginRequest):
    token = _login(body.username, body.password)
    return {"token": token, "username": body.username}


@router.post("/logout", status_code=204)
def logout(
    creds: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
):
    if creds:
        _logout(creds.credentials)


@router.get("/me")
def me(username: str = Depends(get_current_user)):
    return {"username": username}
