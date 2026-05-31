import asyncio
import time
from typing import Callable, Optional
from backend.config import settings
from backend.alerts.email_alert import send_email
from backend.alerts.push_alert import send_push

COOLDOWNS: dict[str, int] = {
    "fall":       settings.alert_cooldown_fall_s,
    "sleeping":   settings.alert_cooldown_sleeping_s,
    "inactivity": settings.alert_cooldown_inactivity_s,
}

SEVERITY: dict[str, str] = {
    "fall":       "critical",
    "sleeping":   "warning",
    "inactivity": "warning",
    "anomalous":  "info",
}

async def dispatch_alert(state, event_type: str, db_write_fn: Optional[Callable] = None, snapshot_path: Optional[str] = None):
    now = time.time()
    cooldown = COOLDOWNS.get(event_type, 300)
    if now - state.last_alert.get(event_type, 0) < cooldown:
        return

    state.last_alert[event_type] = now
    msg = f"[ElderSafe] Person {state.track_id}: {event_type.upper()} detected"

    results = await asyncio.gather(
        send_email(subject=msg, body=msg, event_type=event_type,
                   track_id=state.track_id, snapshot_path=snapshot_path),
        send_push(title="ElderSafe Alert", body=msg),
        return_exceptions=True,
    )

    if db_write_fn:
        channels = ["email", "push"]
        for ch, res in zip(channels, results):
            status = "failed" if isinstance(res, Exception) else "sent"
            err = str(res) if isinstance(res, Exception) else None
            await db_write_fn(event_type=event_type, channel=ch, status=status, error=err,
                              track_id=state.track_id, severity=SEVERITY.get(event_type, "info"),
                              snapshot_path=snapshot_path)
