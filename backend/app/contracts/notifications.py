from pydantic import BaseModel
from typing import List

class Notification(BaseModel):
    id: str
    icon: str
    color: str            # Tailwind class e.g. "text-emerald-400"
    title: str
    desc: str
    time: str             # relative e.g. "2 days ago"
    unread: bool = False

class NotificationPref(BaseModel):
    key: str
    label: str
    enabled: bool
