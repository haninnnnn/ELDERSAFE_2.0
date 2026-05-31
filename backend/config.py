from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    camera_source: str = "0"
    yolo_model: str = "yolov8n-pose.pt"
    database_url: str = "sqlite:///./eldersafe.db"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    alert_email: str = ""

    firebase_credentials_path: str = "./firebase-adminsdk.json"
    fcm_token: str = ""

    inactivity_threshold_s: int = 300
    sleep_duration_threshold_s: int = 60
    alert_cooldown_fall_s: int = 60
    alert_cooldown_sleeping_s: int = 600
    alert_cooldown_inactivity_s: int = 300
    sleep_hours_start: int = 22
    sleep_hours_end: int = 7

settings = Settings()
