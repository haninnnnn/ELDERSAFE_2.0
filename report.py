"""
Run: python report.py --video path/to/video.mp4
Outputs: report.txt + report.json
"""
import argparse, json, time, sys
from pathlib import Path
from collections import defaultdict

import cv2
import numpy as np

# bootstrap path
sys.path.insert(0, str(Path(__file__).parent))

from backend.pipeline.detector import PoseDetector
from backend.pipeline.classifier import classify, PersonState
from backend.pipeline.annotator import annotate

CRITICAL = {"fall"}
WARNING  = {"sleeping", "inactivity"}

def fmt_time(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

def run(video_path: str, skip_frames: int = 2, output_dir: str = "."):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open {video_path}")
        sys.exit(1)

    fps      = cap.get(cv2.CAP_PROP_FPS) or 25
    total_f  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_f / fps

    print(f"Video : {video_path}")
    print(f"FPS   : {fps:.1f}  |  Frames: {total_f}  |  Duration: {fmt_time(duration)}")
    print("Processing... (this may take a while)")

    detector      = PoseDetector()
    person_states : dict[int, PersonState] = {}
    events        : list[dict] = []          # {track_id, type, start_s, end_s}
    activity_time : dict       = defaultdict(lambda: defaultdict(float))  # [tid][activity] = seconds
    frame_idx     = 0
    last_dets     = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        ts = frame_idx / fps  # timestamp in seconds

        if frame_idx % skip_frames == 0:
            frame = cv2.resize(frame, (640, 480))
            last_dets = detector.detect(frame)

        for det in last_dets:
            tid = det.track_id
            if tid not in person_states:
                person_states[tid] = PersonState(track_id=tid)

            state    = person_states[tid]
            prev_act = state.activity
            activity = classify(state, det.keypoints, det.bbox, 480)

            if activity != prev_act:
                # close previous event if it was critical/warning
                if prev_act in CRITICAL | WARNING and events:
                    for ev in reversed(events):
                        if ev["track_id"] == tid and ev["type"] == prev_act and ev["end_s"] is None:
                            ev["end_s"] = ts
                            break
                # open new event
                if activity in CRITICAL | WARNING:
                    events.append({"track_id": tid, "type": activity,
                                   "severity": "critical" if activity in CRITICAL else "warning",
                                   "start_s": ts, "end_s": None})
                state.activity       = activity
                state.activity_since = time.time()

            activity_time[tid][activity] += skip_frames / fps

        frame_idx += 1
        if frame_idx % 500 == 0:
            pct = frame_idx / total_f * 100
            print(f"  {pct:.0f}%  ({fmt_time(ts)})")

    cap.release()

    # close any open events
    for ev in events:
        if ev["end_s"] is None:
            ev["end_s"] = duration

    # ── Build report ──────────────────────────────────────────────────────────
    lines = []
    lines.append("=" * 60)
    lines.append("  ELDERSAFE VIDEO ANALYSIS REPORT")
    lines.append("=" * 60)
    lines.append(f"  File     : {video_path}")
    lines.append(f"  Duration : {fmt_time(duration)}")
    lines.append(f"  Persons  : {len(person_states)}")
    lines.append(f"  Events   : {len(events)}")
    lines.append("")

    for tid in sorted(person_states):
        lines.append(f"── Person #{tid} " + "─" * 40)
        acts = activity_time[tid]
        total = sum(acts.values()) or 1
        for act, secs in sorted(acts.items(), key=lambda x: -x[1]):
            bar = "█" * int(secs / total * 20)
            lines.append(f"  {act:<12} {fmt_time(secs)}  {bar}")
        lines.append("")

    crit_events = [e for e in events if e["severity"] == "critical"]
    warn_events = [e for e in events if e["severity"] == "warning"]

    if crit_events:
        lines.append("🚨 CRITICAL EVENTS")
        lines.append("-" * 40)
        for ev in crit_events:
            dur = ev["end_s"] - ev["start_s"]
            lines.append(f"  [{fmt_time(ev['start_s'])} → {fmt_time(ev['end_s'])}]  "
                         f"Person #{ev['track_id']}  {ev['type'].upper()}  ({dur:.1f}s)")
        lines.append("")

    if warn_events:
        lines.append("⚠️  WARNING EVENTS")
        lines.append("-" * 40)
        for ev in warn_events:
            dur = ev["end_s"] - ev["start_s"]
            lines.append(f"  [{fmt_time(ev['start_s'])} → {fmt_time(ev['end_s'])}]  "
                         f"Person #{ev['track_id']}  {ev['type'].upper()}  ({dur:.1f}s)")
        lines.append("")

    if not crit_events and not warn_events:
        lines.append("✅  No critical or warning events detected.")
        lines.append("")

    lines.append("=" * 60)

    report_txt = "\n".join(lines)
    print("\n" + report_txt)

    # Save files
    out = Path(output_dir)
    txt_path  = out / "report.txt"
    json_path = out / "report.json"

    txt_path.write_text(report_txt)
    json_path.write_text(json.dumps({
        "file": video_path,
        "duration_s": duration,
        "persons": len(person_states),
        "activity_time": {str(k): dict(v) for k, v in activity_time.items()},
        "events": events,
    }, indent=2))

    print(f"\nSaved: {txt_path}  |  {json_path}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--video",  required=True, help="Path to video file")
    ap.add_argument("--skip",   type=int, default=2, help="Process every Nth frame (default 2)")
    ap.add_argument("--output", default=".", help="Output directory for report files")
    args = ap.parse_args()
    run(args.video, skip_frames=args.skip, output_dir=args.output)
