from __future__ import annotations
import hashlib
import os
import secrets
import time
from typing import Optional

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ADMIN_USER = os.environ.get("BINDEX_USER", "admin")
ADMIN_PASS = os.environ.get("BINDEX_PASS", "aditya04jan")

SESSION_TTL = 86400 * 30  # 30 days

_sessions: dict[str, dict] = {}  # token -> {username, created}
_bearer = HTTPBearer(auto_error=False)


def _hash(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
    return f"{salt}:{h.hex()}"


def _verify(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":", 1)
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
        return secrets.compare_digest(h, check.hex())
    except Exception:
        return False


# Pre-hash credentials at import time so the first login isn't slow
_users: dict[str, str] = {ADMIN_USER: _hash(ADMIN_PASS)}


def login(username: str, password: str) -> str:
    stored = _users.get(username)
    if not stored or not _verify(password, stored):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = secrets.token_hex(32)
    _sessions[token] = {"username": username, "created": time.time()}
    return token


def logout(token: str) -> None:
    _sessions.pop(token, None)


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
) -> str:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = _sessions.get(creds.credentials)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if time.time() - session["created"] > SESSION_TTL:
        _sessions.pop(creds.credentials, None)
        raise HTTPException(status_code=401, detail="Session expired — please log in again")
    return session["username"]
