from dataclasses import dataclass, field
from collections import deque
import numpy as np
import time
from backend.config import settings

@dataclass
class PersonState:
    track_id: int
    activity: str = "unknown"
    activity_since: float = field(default_factory=time.time)
    kp_history: deque = field(default_factory=lambda: deque(maxlen=30))
    bbox_history: deque = field(default_factory=lambda: deque(maxlen=30))
    last_alert: dict = field(default_factory=dict)
    horizontal_since: float = 0.0

def _angle(a, b, c):
    ba = np.array(a[:2]) - np.array(b[:2])
    bc = np.array(c[:2]) - np.array(b[:2])
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))

def classify(state: PersonState, kps: np.ndarray, bbox: list, frame_h: int) -> str:
    state.kp_history.append(kps.copy())
    state.bbox_history.append(bbox)

    def kp(i): return kps[i]
    def vis(i): return kps[i][2] > 0.25  # lowered confidence threshold

    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    ar = w / h if h > 0 else 0
    bbox_h_ratio = h / frame_h

    # Reject tiny detections (objects, noise) — very permissive
    if bbox_h_ratio < 0.08:
        return "anomalous"

    hip_y  = (kp(11)[1] + kp(12)[1]) / 2 if vis(11) and vis(12) else None
    knee_y = (kp(13)[1] + kp(14)[1]) / 2 if vis(13) and vis(14) else None
    sho_y  = (kp(5)[1]  + kp(6)[1])  / 2 if vis(5)  and vis(6)  else None
    ank_y  = (kp(15)[1] + kp(16)[1]) / 2 if vis(15) and vis(16) else None

    # Knee angle (only if keypoints visible)
    knee_ang = None
    if vis(11) and vis(13) and vis(15):
        knee_ang = _angle(kp(11), kp(13), kp(15))

    is_horizontal = ar > 1.15
    # Bent knees: use angle if available, else infer from bbox shape + hip/knee positions
    if knee_ang is not None:
        bent_knees = knee_ang < 135
    elif hip_y and knee_y:
        # If hips and knees are close vertically but bbox is upright → sitting
        bent_knees = abs(hip_y - knee_y) < frame_h * 0.15 and ar < 1.0
    else:
        bent_knees = False

    was_sitting = state.activity == "sitting"

    # Track horizontal duration
    if is_horizontal:
        if state.horizontal_since == 0.0:
            state.horizontal_since = time.time()
    else:
        state.horizontal_since = 0.0
    horizontal_duration = time.time() - state.horizontal_since if state.horizontal_since else 0

    # ── FALL ─────────────────────────────────────────────────────────────
    # Horizontal bbox + NOT bent knees + NOT was sitting
    # Either sudden drop OR went horizontal within 3s
    if is_horizontal and not bent_knees and not was_sitting:
        hips_low = (hip_y and knee_y and hip_y >= knee_y * 0.85) or knee_y is None
        quick_h  = 0 < horizontal_duration < 3.0
        sudden   = False
        if len(state.bbox_history) >= 5:
            prev   = state.bbox_history[-5]
            dy     = abs((bbox[1]+bbox[3])/2 - (prev[1]+prev[3])/2)
            sudden = dy > frame_h * 0.02
        if hips_low and (sudden or quick_h):
            return "fall"

    # ── SLEEPING ─────────────────────────────────────────────────────────
    if is_horizontal and hip_y and sho_y:
        if abs(hip_y - sho_y) < frame_h * 0.12 and horizontal_duration > settings.sleep_duration_threshold_s:
            if len(state.kp_history) >= 10:
                deltas = [np.linalg.norm(state.kp_history[-1][:,:2] - state.kp_history[i][:,:2])
                          for i in range(-10, -1)]
                if max(deltas) < 25:
                    return "sleeping"

    # ── SITTING ──────────────────────────────────────────────────────────
    # Primary: knee angle
    if knee_ang is not None and 50 < knee_ang < 140:
        return "sitting"
    # Fallback: upright bbox + hips visible + hips above ankles (or no ankles visible)
    if ar < 0.95 and hip_y is not None:
        if ank_y is None or hip_y < ank_y:  # hips above ankles
            if sho_y and hip_y > sho_y:     # hips below shoulders (upright)
                # Not standing: bbox not tall enough for full standing person
                if bbox_h_ratio < 0.65:
                    return "sitting"

    # ── INACTIVITY ───────────────────────────────────────────────────────
    if len(state.kp_history) == 30:
        deltas = [np.linalg.norm(state.kp_history[-1][:,:2] - state.kp_history[i][:,:2])
                  for i in range(0, 25, 5)]
        if max(deltas) < 12 and (time.time() - state.activity_since) > settings.inactivity_threshold_s:
            return "inactivity"

    # ── STANDING / WALKING ───────────────────────────────────────────────
    if ar < 0.9:
        if vis(15) and vis(16) and len(state.kp_history) >= 8:
            ankle_dy = abs(kps[15][1] - state.kp_history[-8][15][1]) + \
                       abs(kps[16][1] - state.kp_history[-8][16][1])
            ankle_dx = abs(kps[15][0] - state.kp_history[-8][15][0]) + \
                       abs(kps[16][0] - state.kp_history[-8][16][0])
            if ankle_dy + ankle_dx > 20:
                return "walking"
        return "standing"

    return "anomalous"
