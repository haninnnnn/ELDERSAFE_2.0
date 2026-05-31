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
    fell_at: float = field(default=None)
    fall_confirm_count: int = 0  # consecutive frames classified as fall

def _angle(a, b, c):
    ba = np.array(a[:2]) - np.array(b[:2])
    bc = np.array(c[:2]) - np.array(b[:2])
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos, -1, 1)))

def classify(state: PersonState, kps: np.ndarray, bbox: list, frame_h: int) -> str:
    state.kp_history.append(kps.copy())
    state.bbox_history.append(bbox)

    def kp(i): return kps[i]
    def vis(i): return kps[i][2] > 0.2

    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    ar = w / (h + 1e-6)
    bbox_h_ratio = h / frame_h

    # ── HUMAN FILTER ─────────────────────────────────────────────────────
    # Reject tiny detections
    if bbox_h_ratio < 0.05:
        return "anomalous"

    # Count visible keypoints — objects/furniture have very few
    visible_kps = sum(1 for i in range(17) if kps[i][2] > 0.25)
    if visible_kps < 3:
        return "anomalous"

    # Require at least one torso/head keypoint visible (nose=0, shoulders=5/6, hips=11/12)
    has_torso = any(vis(i) for i in [0, 1, 2, 5, 6, 11, 12])
    if not has_torso:
        return "anomalous"
    # ─────────────────────────────────────────────────────────────────────

    hip_y  = (kp(11)[1] + kp(12)[1]) / 2 if vis(11) and vis(12) else None
    knee_y = (kp(13)[1] + kp(14)[1]) / 2 if vis(13) and vis(14) else None
    sho_y  = (kp(5)[1]  + kp(6)[1])  / 2 if vis(5)  and vis(6)  else None
    ank_y  = (kp(15)[1] + kp(16)[1]) / 2 if vis(15) and vis(16) else None

    knee_ang = None
    if vis(11) and vis(13) and vis(15):
        knee_ang = _angle(kp(11), kp(13), kp(15))
    elif vis(12) and vis(14) and vis(16):
        knee_ang = _angle(kp(12), kp(14), kp(16))

    is_horizontal = ar > 1.3

    # Track horizontal duration
    if is_horizontal:
        if state.horizontal_since == 0.0:
            state.horizontal_since = time.time()
    else:
        state.horizontal_since = 0.0
        state.fell_at = None
        state.fall_confirm_count = 0
    horizontal_duration = time.time() - state.horizontal_since if state.horizontal_since else 0

    # Bent knees = sitting posture
    bent_knees = False
    if knee_ang is not None:
        bent_knees = knee_ang < 140
    elif hip_y is not None and knee_y is not None:
        bent_knees = abs(hip_y - knee_y) < frame_h * 0.18 and ar < 1.1

    was_sitting = state.activity == "sitting"

    # ── FALL vs SLEEPING ─────────────────────────────────────────────────
    if is_horizontal and not (bent_knees and was_sitting):
        # Detect transition from standing/walking (not sitting) to horizontal
        was_upright = any(
            (b[2]-b[0])/(b[3]-b[1]+1e-6) < 1.0
            for b in list(state.bbox_history)[-10:-1]
        ) if len(state.bbox_history) >= 3 else False

        # Check if person was sitting recently (last 15 frames)
        was_sitting_recently = state.activity == "sitting" or any(
            (b[2]-b[0])/(b[3]-b[1]+1e-6) < 0.7  # sitting has lower ar than standing
            for b in list(state.bbox_history)[-15:-1]
        ) if len(state.bbox_history) >= 3 else False

        # Sustained velocity: average over last 4 frames (filters jitter)
        avg_velocity = 0.0
        if len(state.bbox_history) >= 5:
            vels = []
            hist = list(state.bbox_history)
            for j in range(-4, 0):
                p = hist[j-1]; c = hist[j]
                vels.append(((((c[0]+c[2])/2 - (p[0]+p[2])/2)**2 +
                               ((c[1]+c[3])/2 - (p[1]+p[3])/2)**2) ** 0.5))
            avg_velocity = sum(vels) / len(vels)

        # Fall = from standing (not sitting) + sustained movement
        if was_upright and not was_sitting_recently and avg_velocity > 8.0:
            state.fall_confirm_count += 1
            if state.fall_confirm_count >= 3:  # 3 consecutive frames = confirmed fall
                state.fell_at = time.time()
                return "fall"
            return state.activity  # hold previous activity until confirmed
        else:
            state.fall_confirm_count = 0

        # Still within 5 minutes of a confirmed fall → keep as fall (person on ground)
        if state.fell_at is not None and (time.time() - state.fell_at) < 300.0:
            return "fall"

        # Horizontal with no fall history → sleeping
        return "sleeping"

    # ── SITTING ──────────────────────────────────────────────────────────
    # Only classify as sitting if NOT horizontal (prevents fall→sitting misclassification)
    if not is_horizontal:
        if knee_ang is not None and 45 < knee_ang < 145:
            return "sitting"
        if ar < 1.1 and hip_y is not None:
            if ank_y is None or hip_y < ank_y:
                if sho_y is None or hip_y > sho_y:
                    if bbox_h_ratio < 0.75:
                        return "sitting"

    # ── INACTIVITY ───────────────────────────────────────────────────────
    if len(state.kp_history) == 30:
        deltas = [np.linalg.norm(state.kp_history[-1][:, :2] - state.kp_history[i][:, :2])
                  for i in range(0, 25, 5)]
        if max(deltas) < 15 and (time.time() - state.activity_since) > settings.inactivity_threshold_s:
            return "inactivity"

    # ── STANDING / WALKING ───────────────────────────────────────────────
    if ar < 0.9:
        if vis(15) and vis(16) and len(state.kp_history) >= 8:
            ankle_move = (abs(kps[15][0] - state.kp_history[-8][15][0]) +
                          abs(kps[15][1] - state.kp_history[-8][15][1]) +
                          abs(kps[16][0] - state.kp_history[-8][16][0]) +
                          abs(kps[16][1] - state.kp_history[-8][16][1]))
            if ankle_move > 15:
                return "walking"
        return "standing"

    # Wide but not horizontal — likely sitting close to camera
    if not is_horizontal:
        return "sitting"

    return "anomalous"
