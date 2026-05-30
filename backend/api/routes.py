from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from backend.db.session import get_db
from backend.db import crud
from backend.api.schemas import PersonOut, PersonUpdate, EventOut, ActivityLogOut, AlertOut, StreamStatus
import backend.main as app_state

router = APIRouter(prefix="/api")

@router.get("/persons", response_model=list[PersonOut])
def list_persons(db: Session = Depends(get_db)):
    return db.query(__import__("backend.db.models", fromlist=["Person"]).Person).all()

@router.patch("/persons/{track_id}", response_model=PersonOut)
def update_person(track_id: int, body: PersonUpdate, db: Session = Depends(get_db)):
    p = db.query(__import__("backend.db.models", fromlist=["Person"]).Person).filter_by(track_id=track_id).first()
    if not p:
        raise HTTPException(404, "Person not found")
    p.label = body.label
    db.commit()
    db.refresh(p)
    return p

@router.get("/events", response_model=list[EventOut])
def list_events(severity: Optional[str] = None, resolved: Optional[bool] = None,
                limit: int = 50, db: Session = Depends(get_db)):
    return crud.get_events(db, severity=severity, resolved=resolved, limit=limit)

@router.patch("/events/{event_id}/acknowledge", response_model=EventOut)
def ack_event(event_id: int, db: Session = Depends(get_db)):
    ev = crud.acknowledge_event(db, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    return ev

@router.get("/activity-logs", response_model=list[ActivityLogOut])
def list_logs(track_id: Optional[int] = None, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_activity_logs(db, track_id=track_id, limit=limit)

@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    return db.query(__import__("backend.db.models", fromlist=["Alert"]).Alert).order_by(
        __import__("backend.db.models", fromlist=["Alert"]).Alert.sent_at.desc()).limit(100).all()

@router.post("/stream/start")
def start_stream():
    app_state.pipeline_running = True
    return {"status": "started"}

@router.post("/stream/stop")
def stop_stream():
    app_state.pipeline_running = False
    return {"status": "stopped"}

@router.get("/stream/status", response_model=StreamStatus)
def stream_status():
    return StreamStatus(
        running=app_state.pipeline_running,
        fps=app_state.current_fps,
        active_tracks=len(app_state.person_states),
    )

@router.get("/stream/source")
def get_source():
    return {"source": app_state.current_source}

@router.post("/stream/source")
def set_source(body: dict):
    src = body.get("source", "").strip()
    if not src:
        from fastapi import HTTPException
        raise HTTPException(400, "source required")
    app_state.current_source = src
    # persist to .env
    import re
    from pathlib import Path
    env_path = Path(__file__).parent.parent.parent / ".env"
    text = env_path.read_text()
    text = re.sub(r"^CAMERA_SOURCE=.*$", f"CAMERA_SOURCE={src}", text, flags=re.MULTILINE)
    env_path.write_text(text)
    return {"source": src}

@router.get("/snapshot/{event_id}")
def get_snapshot(event_id: int, db: Session = Depends(get_db)):
    from backend.db.models import Event
    ev = db.query(Event).filter_by(id=event_id).first()
    if not ev or not ev.snapshot_path:
        raise HTTPException(404, "Snapshot not found")
    return FileResponse(ev.snapshot_path)

@router.get("/snapshots")
def list_snapshots():
    from pathlib import Path
    snap_dir = Path("snapshots")
    if not snap_dir.exists():
        return []
    files = sorted(snap_dir.glob("*.jpg"), key=lambda f: f.stat().st_mtime, reverse=True)
    return [{"filename": f.name, "url": f"/api/snapshots/{f.name}",
             "mtime": f.stat().st_mtime} for f in files[:50]]

@router.get("/snapshots/{filename}")
def get_snapshot_file(filename: str):
    from pathlib import Path
    path = Path("snapshots") / filename
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(str(path))
