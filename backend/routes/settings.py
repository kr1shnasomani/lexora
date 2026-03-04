"""Backend API — System Configuration"""
import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_supabase

router = APIRouter()


class ConfigUpdateRequest(BaseModel):
    value: Any


@router.get("/config")
async def get_all_configs():
    """Fetch all configurations and format them for the Admin ConfigPage.jsx."""
    db = get_supabase()

    try:
        response = db.table("configuration").select("*").order("updated_at", desc=True).execute()
        rows = response.data or []

        # Map to UI shapes
        thresholds = []
        flags = []

        for row in rows:
            config_type = row.get("config_type")
            key = row.get("config_key", "")
            val = row.get("config_value")
            desc = row.get("description", "")
            
            # Format update date visually
            updated_at = row.get("updated_at")
            if updated_at:
                modified = updated_at.split("T")[0]
            else:
                modified = "Default"

            if config_type == "feature_flag":
                flags.append({
                    "key": key,
                    "label": key.split(".")[-1].replace("_", " ").title(),
                    "enabled": str(val).lower() == "true",
                    "description": desc,
                    "badge_color": "text-primary",
                    "badge_icon": "tune",
                })
            else:
                # thresholds and rules mapped identically
                value_repr = json.dumps(val) if isinstance(val, (dict, list)) else val
                
                thresholds.append({
                    "key": key,
                    "value": value_repr,
                    "description": desc,
                    "modified": modified,
                    "version": f"v{row.get('version', 1)}",
                })

        return {
            "thresholds": thresholds,
            "flags": flags,
            "health": {
                "latency": "24ms",
                "error_rate": "0.1%",
                "uptime": "99.9%",
                "active_nodes": "4/4"
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config/{key:path}")
async def update_config(key: str, payload: ConfigUpdateRequest):
    """Update a specific configuration key and increment its version."""
    db = get_supabase()
    print(key, payload.value)
    
    try:
        # First check if it exists so we can increment version
        current = db.table("configuration").select("version").eq("config_key", key).single().execute()
        current_version = current.data.get("version", 0) if current.data else 0

        # Attempt JSON load cleanly if passing arrays/booleans as str
        val = payload.value
        if isinstance(val, str):
            try:
                val = json.loads(val)
            except json.JSONDecodeError:
                pass # keep as string

        update_payload = {
            "config_value": val,
            "version": current_version + 1
        }
        
        # Native upsert
        res = db.table("configuration").update(update_payload).eq("config_key", key).execute()
        if not res.data:
            # If nothing was updated, the key didn't exist strictly
            raise HTTPException(status_code=404, detail=f"Configuration key '{key}' not found or locked.")
        
        return {"status": "success", "key": key, "new_value": val}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/policies")
async def list_policies():
    """List all policies."""
    db = get_supabase()
    result = db.table("policies").select("*").execute()
    return {"policies": result.data or []}


@router.get("/users")
async def list_users():
    """List all users."""
    db = get_supabase()
    result = db.table("users").select("*").execute()
    return {"users": result.data or []}
