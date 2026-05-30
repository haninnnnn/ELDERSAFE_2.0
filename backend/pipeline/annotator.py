import cv2
import numpy as np

COLORS = {
    "fall":       (0, 0, 255),
    "sleeping":   (0, 165, 255),
    "sitting":    (0, 255, 255),
    "standing":   (0, 255, 0),
    "walking":    (255, 255, 0),
    "inactivity": (128, 0, 128),
    "anomalous":  (128, 128, 128),
    "unknown":    (200, 200, 200),
}

SKELETON = [
    (5,6),(5,7),(7,9),(6,8),(8,10),
    (5,11),(6,12),(11,12),(11,13),(13,15),(12,14),(14,16)
]

def annotate(frame, detections, person_states: dict) -> np.ndarray:
    out = frame.copy()
    for det in detections:
        state = person_states.get(det.track_id)
        activity = state.activity if state else "unknown"
        color = COLORS.get(activity, (200, 200, 200))
        x1, y1, x2, y2 = map(int, det.bbox)

        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        label = f"ID:{det.track_id} {activity}"
        cv2.putText(out, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

        kps = det.keypoints
        for a, b in SKELETON:
            if kps[a][2] > 0.3 and kps[b][2] > 0.3:
                cv2.line(out, (int(kps[a][0]), int(kps[a][1])),
                              (int(kps[b][0]), int(kps[b][1])), color, 2)
        for k in kps:
            if k[2] > 0.3:
                cv2.circle(out, (int(k[0]), int(k[1])), 3, color, -1)
    return out
