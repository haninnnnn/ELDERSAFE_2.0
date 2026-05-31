from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio, cv2, base64, json, time, os

from backend.config import settings
from backend.db.session import init_db, SessionLocal
from backend.db import crud
from backend.pipeline.capture import FrameSource
from backend.pipeline.detector import PoseDetector
from backend.pipeline.classifier import classify, PersonState
from backend.pipeline.annotator import annotate
from backend.alerts.engine import dispatch_alert
from backend.api.routes import router
from backend.api.report_routes import router as report_router

pipeline_running = False
current_fps = 0.0
current_source = settings.camera_source
person_states: dict[int, PersonState] = {}
_ws_clients: list[WebSocket] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline_running
    init_db()
    os.makedirs("snapshots", exist_ok=True)
    pipeline_running = True  # auto-start on boot
    task = asyncio.create_task(_daily_report_scheduler())
    yield
    task.cancel()

async def _daily_report_scheduler():
    """Send a daily summary email at 8 AM every day."""
    while True:
        now = time.localtime()
        # seconds until next 08:00
        secs_until = ((8 - now.tm_hour) % 24) * 3600 - now.tm_min * 60 - now.tm_sec
        if secs_until <= 0:
            secs_until += 86400
        await asyncio.sleep(secs_until)
        await _send_daily_report()

async def _send_daily_report():
    from backend.db.session import SessionLocal
    from backend.db.models import Event, ActivityLog
    from datetime import datetime, timedelta
    db = SessionLocal()
    try:
        since = datetime.utcnow() - timedelta(hours=24)
        events = db.query(Event).filter(Event.started_at >= since).all()
        logs   = db.query(ActivityLog).filter(ActivityLog.frame_ts >= since).all()

        fall_count     = sum(1 for e in events if e.event_type == "fall")
        sleeping_count = sum(1 for e in events if e.event_type == "sleeping")
        inact_count    = sum(1 for e in events if e.event_type == "inactivity")
        total_events   = len(events)

        subject = f"[ElderSafe] Daily Report — {datetime.now().strftime('%B %d, %Y')}"
        body = (
            f"ElderSafe Daily Summary\n"
            f"Date: {datetime.now().strftime('%B %d, %Y')}\n\n"
            f"Total Events : {total_events}\n"
            f"Falls        : {fall_count}\n"
            f"Sleeping     : {sleeping_count}\n"
            f"Inactivity   : {inact_count}\n"
            f"Activity Logs: {len(logs)}\n"
        )
        from backend.alerts.email_alert import send_email
        await send_email(subject=subject, body=body, event_type="daily_report")
    finally:
        db.close()

app = FastAPI(title="ElderSafe", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
app.include_router(report_router)

async def _db_write(event_type, channel, status, error, track_id, severity, snapshot_path=None):
    db = SessionLocal()
    try:
        ev = crud.create_event(db, track_id=track_id, event_type=event_type, severity=severity,
                               snapshot_path=snapshot_path)
        crud.log_alert(db, event_id=ev.id, channel=channel, status=status, error=error)
    finally:
        db.close()

@app.websocket("/ws/feed")
async def ws_feed(ws: WebSocket):
    origin = ws.headers.get("origin", "")
    await ws.accept()
    _ws_clients.append(ws)

    try:
        src = FrameSource()
    except RuntimeError as e:
        await ws.send_text(json.dumps({"error": str(e), "persons": [], "fps": 0,
                                       "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}))
        _ws_clients.remove(ws)
        await ws.close()
        return

    detector = PoseDetector()
    db = SessionLocal()
    prev_time = time.time()
    frame_count = 0
    last_detections = []
    global current_fps

    try:
        while True:  # always stream frames; pipeline_running gates YOLO processing
            frame = src.read()
            if frame is None:
                await asyncio.sleep(0.03)
                continue

            # Resize for faster inference
            frame = cv2.resize(frame, (640, 480))

            persons_out = []
            if pipeline_running:
                frame_count += 1
                # Run YOLO on even frames to reduce CPU load
                if frame_count % 2 == 0:
                    last_detections = detector.detect(frame)
                detections = last_detections
                for det in detections:
                    tid = det.track_id
                    if tid not in person_states:
                        person_states[tid] = PersonState(track_id=tid)
                        crud.get_or_create_person(db, tid)

                    state = person_states[tid]
                    prev_activity = state.activity
                    activity = classify(state, det.keypoints, det.bbox, frame.shape[0])

                    if activity != prev_activity:
                        state.activity = activity
                        state.activity_since = time.time()
                        if activity == "fall":
                            snap = f"snapshots/fall_{tid}_{int(time.time())}.jpg"
                            cv2.imwrite(snap, frame)
                            asyncio.create_task(dispatch_alert(state, "fall", _db_write, snapshot_path=snap))

                    crud.log_activity(db, tid, activity, det.conf, det.bbox)
                    persons_out.append({"track_id": tid, "activity": activity,
                                        "bbox": det.bbox, "confidence": det.conf})

                frame = annotate(frame, detections, person_states)

            now = time.time()
            current_fps = 1.0 / (now - prev_time + 1e-6)
            prev_time = now

            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
            payload = json.dumps({
                "frame": base64.b64encode(buf).decode(),
                "persons": persons_out,
                "fps": round(current_fps, 1),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            try:
                await ws.send_text(payload)
            except Exception:
                break
            await asyncio.sleep(0.01)

    except WebSocketDisconnect:
        pass
    finally:
        _ws_clients.remove(ws)
        src.release()
        db.close()

@app.get("/health")
def health():
    return {"status": "ok"}
