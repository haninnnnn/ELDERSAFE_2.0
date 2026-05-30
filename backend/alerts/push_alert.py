import firebase_admin
from firebase_admin import credentials, messaging
from backend.config import settings
import os

_initialized = False

def _init():
    global _initialized
    if not _initialized and os.path.exists(settings.firebase_credentials_path):
        cred = credentials.Certificate(settings.firebase_credentials_path)
        firebase_admin.initialize_app(cred)
        _initialized = True

async def send_push(title: str, body: str):
    if not settings.fcm_token:
        return
    _init()
    if not _initialized:
        return
    msg = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=settings.fcm_token,
    )
    messaging.send(msg)
