from fastapi import APIRouter, Body
from typing import List
from app.contracts.notifications import Notification, NotificationPref
import uuid

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# In-memory state for simulation (reset on server restart)
_NOTIFICATIONS: List[Notification] = [
    Notification(id=str(uuid.uuid4()), icon="check_circle",   color="text-emerald-400", title="Claim CLM-9803 Approved",    desc="$1,240 reimbursement is being processed to your account.", time="2 days ago",  unread=False),
    Notification(id=str(uuid.uuid4()), icon="upcoming",       color="text-yellow-400",  title="Renewal Reminder",            desc="Your health policy H-992-883 renews in 23 days.",           time="3 days ago",  unread=True),
    Notification(id=str(uuid.uuid4()), icon="description",    color="text-blue-400",    title="New Statement Ready",         desc="Your February 2026 policy statement is available.",          time="1 week ago",  unread=True),
    Notification(id=str(uuid.uuid4()), icon="payment",        color="text-slate-400",   title="Payment Processed",           desc="Monthly premium of $420 deducted from Visa ····4892.",       time="2 weeks ago", unread=False),
]

_PREFS: List[NotificationPref] = [
    NotificationPref(key="claims",   label="Claim Updates",           enabled=True),
    NotificationPref(key="payments", label="Payment Confirmations",   enabled=True),
    NotificationPref(key="renewals", label="Renewal Reminders",       enabled=True),
    NotificationPref(key="promos",   label="Promotional Offers",      enabled=False),
]


@router.get("", response_model=List[Notification])
async def get_notifications():
    return _NOTIFICATIONS


@router.get("/prefs", response_model=List[NotificationPref])
async def get_notification_prefs():
    return _PREFS


@router.put("/prefs", response_model=List[NotificationPref])
async def update_notification_pref(payload: dict = Body(...)):
    key = payload.get("key")
    enabled = payload.get("enabled")
    for p in _PREFS:
        if p.key == key:
            p.enabled = enabled
            break
    return _PREFS
