import time, cv2, os
from pathlib import Path
from collections import defaultdict
from backend.pipeline.detector import PoseDetector
from backend.pipeline.classifier import classify, PersonState
from backend.pipeline.annotator import annotate

CRITICAL = {"fall"}
WARNING  = {"sleeping", "inactivity"}
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# Minimum seconds an activity must persist before counting as an event
DEBOUNCE = {"fall": 0.6, "sleeping": 5.0, "inactivity": 8.0}

def run_report(video_path: str, job_id: str, skip_frames: int = 2, on_progress=None) -> dict:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps_vid  = cap.get(cv2.CAP_PROP_FPS) or 25
    total_f  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_f / fps_vid

    raw_path = OUTPUT_DIR / f"{job_id}_raw.mp4"
    out_path = OUTPUT_DIR / f"{job_id}_annotated.mp4"

    # Try H.264 directly via OpenCV, fall back to mp4v
    for fourcc in ["avc1", "H264", "mp4v"]:
        writer = cv2.VideoWriter(
            str(raw_path),
            cv2.VideoWriter_fourcc(*fourcc),
            max(fps_vid / skip_frames, 1),
            (640, 480),
        )
        if writer.isOpened():
            break

    detector      = PoseDetector()
    person_states : dict[int, PersonState] = {}
    events        : list[dict] = []
    activity_time : dict = defaultdict(lambda: defaultdict(float))

    # Per-person debounce: track pending events
    pending_events: dict = {}  # tid → {type, start_s}

    frame_idx  = 0
    last_dets  = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        ts    = frame_idx / fps_vid
        frame = cv2.resize(frame, (640, 480))

        if frame_idx % skip_frames == 0:
            last_dets = detector.detect(frame)

            for det in last_dets:
                tid = det.track_id
                if tid not in person_states:
                    person_states[tid] = PersonState(track_id=tid)

                state    = person_states[tid]
                prev_act = state.activity
                activity = classify(state, det.keypoints, det.bbox, 480)

                if activity != prev_act:
                    state.activity       = activity
                    state.activity_since = time.time()

                    # Close any open event for this person
                    if tid in pending_events:
                        pev = pending_events.pop(tid)
                        held = ts - pev["start_s"]
                        # Only record if held long enough (debounce)
                        if held >= DEBOUNCE.get(pev["type"], 0.3):
                            events.append({**pev, "end_s": ts,
                                           "severity": "critical" if pev["type"] in CRITICAL else "warning"})

                    # Start tracking new critical/warning event
                    if activity in CRITICAL | WARNING:
                        pending_events[tid] = {"track_id": tid, "type": activity, "start_s": ts}

                activity_time[tid][activity] += skip_frames / fps_vid

            annotated = annotate(frame, last_dets, person_states)
            cv2.putText(annotated, _fmt(ts), (8, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255,255,255), 1, cv2.LINE_AA)
            writer.write(annotated)

        frame_idx += 1
        if on_progress and frame_idx % 200 == 0:
            pct = int(frame_idx / total_f * 100)
            on_progress(f"Analysing… {pct}%")

    cap.release()
    writer.release()

    # Close any still-open events
    for tid, pev in pending_events.items():
        held = duration - pev["start_s"]
        if held >= DEBOUNCE.get(pev["type"], 0.3):
            events.append({**pev, "end_s": duration,
                           "severity": "critical" if pev["type"] in CRITICAL else "warning"})

    # Re-encode to H.264 for browser playback
    on_progress and on_progress("Encoding video…")
    _reencode(raw_path, out_path)
    raw_path.unlink(missing_ok=True)

    # Merge person IDs that are likely the same person (simple: keep only top-N by frame count)
    # Filter out ghost tracks with < 2s of data
    min_secs = 2.0
    activity_time = {k: v for k, v in activity_time.items()
                     if sum(v.values()) >= min_secs}

    stats = {}
    for tid, acts in activity_time.items():
        total    = sum(acts.values()) or 1
        dominant = max(acts, key=acts.get)
        fall_evs = [e for e in events if str(e["track_id"]) == str(tid) and e["type"] == "fall"]
        inact_evs= [e for e in events if str(e["track_id"]) == str(tid) and e["type"] == "inactivity"]
        stats[str(tid)] = {
            "dominant_activity": dominant,
            "mobility_pct":      round((acts.get("walking",0)+acts.get("standing",0))/total*100, 1),
            "fall_duration_s":   round(sum(e["end_s"]-e["start_s"] for e in fall_evs), 1),
            "fall_count":        len(fall_evs),
            "inactivity_count":  len(inact_evs),
        }

    return {
        "duration_s":    duration,
        "persons":       len(activity_time),
        "activity_time": {str(k): dict(v) for k, v in activity_time.items()},
        "events":        events,
        "stats":         stats,
        "video_url":     f"/api/report/video/{job_id}",
    }

def _reencode(src: Path, dst: Path):
    """Re-encode to H.264 using ffmpeg for browser playback."""
    import subprocess
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-vcodec", "libx264", "-pix_fmt", "yuv420p",
         "-preset", "fast", "-crf", "23", str(dst)],
        capture_output=True
    )
    if result.returncode != 0 or not dst.exists():
        import shutil
        shutil.copy(str(src), str(dst))

def _fmt(secs):
    h, rem = divmod(int(secs), 3600)
    m, s   = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"
