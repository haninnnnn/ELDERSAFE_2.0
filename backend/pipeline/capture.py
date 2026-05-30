import cv2
from backend.config import settings

class FrameSource:
    def __init__(self):
        src = settings.camera_source
        self.cap = cv2.VideoCapture(int(src) if src.isdigit() else src)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera source: {src}")

    def read(self):
        ret, frame = self.cap.read()
        return frame if ret else None

    def release(self):
        self.cap.release()
