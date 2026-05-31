from ultralytics import YOLO
from backend.config import settings
import numpy as np
from dataclasses import dataclass

@dataclass
class Detection:
    track_id: int
    bbox: list        # [x1, y1, x2, y2]
    conf: float
    keypoints: np.ndarray  # [17, 3] (x, y, conf)

class PoseDetector:
    def __init__(self):
        self.model = YOLO(settings.yolo_model)

    def detect(self, frame) -> list[Detection]:
        results = self.model.track(frame, persist=True, verbose=False, conf=0.55, classes=[0])
        detections = []
        if results[0].boxes is None:
            return detections
        boxes = results[0].boxes
        kps_data = results[0].keypoints

        for i, box in enumerate(boxes):
            if box.id is None:
                continue
            track_id = int(box.id[0])
            bbox = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            kps = kps_data.data[i].cpu().numpy() if kps_data is not None else np.zeros((17, 3))
            detections.append(Detection(track_id=track_id, bbox=bbox, conf=conf, keypoints=kps))
        return detections
