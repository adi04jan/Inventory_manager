from __future__ import annotations
import asyncio, json, os, urllib.request
from fastapi import APIRouter, Depends, Query
from ..auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"], dependencies=[Depends(get_current_user)])

_MODEL  = os.environ.get("BINDEX_OLLAMA_MODEL", "llama3.2")
_OLLAMA = os.environ.get("BINDEX_OLLAMA_URL",   "http://localhost:11434/api/generate")

_PROMPT = """\
You are an electronics component database. Given a part number, return ONLY a JSON object.
Fields (all optional — omit a field entirely if unknown or uncertain):
  name         - short descriptive name, e.g. "Dual Op-Amp"
  manufacturer - company name, e.g. "Texas Instruments"
  description  - one sentence technical description
  category     - exactly one of: Resistor Capacitor Inductor Diode Transistor IC LED Connector Crystal Module Relay Fuse Other
  package      - package footprint, e.g. "DIP-8" "SOT-23" "0402" "TO-92" "QFP-44"
  unit         - unit of measure, almost always "pcs"

Part number: {pn}

Return ONLY the JSON object. No explanation. No markdown. No code fences."""

_ALLOWED = {"name", "manufacturer", "description", "category", "package", "unit"}


def _call_ollama(model: str, pn: str) -> dict:
    payload = json.dumps({
        "model": model,
        "prompt": _PROMPT.format(pn=pn),
        "stream": False,
        "format": "json",
    }).encode()
    req = urllib.request.Request(
        _OLLAMA,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read())
            data = json.loads(body.get("response", "{}"))
            return {k: v for k, v in data.items() if k in _ALLOWED and v and isinstance(v, str)}
    except Exception:
        return {}


@router.get("/suggest")
async def suggest(pn: str = Query(..., min_length=2)):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _call_ollama, _MODEL, pn)
