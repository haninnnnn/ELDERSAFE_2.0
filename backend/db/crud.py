from sqlalchemy.orm import Session
from backend.db.models import Person, ActivityLog, Event, Alert
from datetime import datetime

def get_or_create_person(db: Session, track_id: int) -> Person:
    p = db.query(Person).filter_by(track_id=track_id).first()
    if not p:
        p = Person(track_id=track_id)
        db.add(p)
        db.commit()
        db.refresh(p)
    else:
        p.last_seen = datetime.utcnow()
        db.commit()
    return p

def log_activity(db: Session, track_id: int, activity: str, conf: float, bbox: list):
    db.add(ActivityLog(
        track_id=track_id, activity=activity, confidence=conf,
        bbox_x1=bbox[0], bbox_y1=bbox[1], bbox_x2=bbox[2], bbox_y2=bbox[3],
    ))
    db.commit()

def create_event(db: Session, track_id: int, event_type: str, severity: str,
                 snapshot_path: str = None) -> Event:
    ev = Event(track_id=track_id, event_type=event_type,
               severity=severity, snapshot_path=snapshot_path)
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev

def log_alert(db: Session, event_id: int, channel: str, status: str, error: str = None):
    db.add(Alert(event_id=event_id, channel=channel, status=status, error_msg=error))
    db.commit()

def get_events(db: Session, severity: str = None, resolved: bool = None, limit: int = 50):
    q = db.query(Event)
    if severity:
        q = q.filter(Event.severity == severity)
    if resolved is not None:
        q = q.filter(Event.resolved_at.isnot(None) if resolved else Event.resolved_at.is_(None))
    return q.order_by(Event.started_at.desc()).limit(limit).all()

def acknowledge_event(db: Session, event_id: int):
    ev = db.query(Event).filter_by(id=event_id).first()
    if ev:
        ev.acknowledged = True
        db.commit()
    return ev

def get_activity_logs(db: Session, track_id: int = None, limit: int = 100):
    q = db.query(ActivityLog)
    if track_id:
        q = q.filter_by(track_id=track_id)
    return q.order_by(ActivityLog.frame_ts.desc()).limit(limit).all()
