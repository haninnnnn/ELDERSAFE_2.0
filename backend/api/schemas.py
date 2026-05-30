from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PersonOut(BaseModel):
    id: int
    track_id: int
    label: Optional[str]
    first_seen: Optional[datetime]
    last_seen: Optional[datetime]
    class Config: from_attributes = True

class PersonUpdate(BaseModel):
    label: str

class EventOut(BaseModel):
    id: int
    track_id: int
    event_type: str
    severity: str
    started_at: Optional[datetime]
    resolved_at: Optional[datetime]
    acknowledged: bool
    snapshot_path: Optional[str]
    class Config: from_attributes = True

class ActivityLogOut(BaseModel):
    id: int
    track_id: int
    activity: str
    confidence: Optional[float]
    frame_ts: Optional[datetime]
    class Config: from_attributes = True

class AlertOut(BaseModel):
    id: int
    event_id: Optional[int]
    channel: str
    status: str
    sent_at: Optional[datetime]
    error_msg: Optional[str]
    class Config: from_attributes = True

class StreamStatus(BaseModel):
    running: bool
    fps: float
    active_tracks: int
