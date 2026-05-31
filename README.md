# ElderSafe

Real-time elderly safety monitoring system using YOLOv8-Pose.

## Quick Start

```bash
# 1. Setup Python environment
cd ELDERSAFE_2.0
python -m venv .venv
source .venv/bin/activate    # Linux/Mac
# .venv\Scripts\activate     # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env        # Linux/Mac
# copy .env.example .env    # Windows
# Edit .env with your credentials

# 4. Start backend
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 5. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — click **▶ Start** to begin monitoring.

## Docker

```bash
cp .env.example .env   # fill in values
docker compose up --build
# Dashboard: http://localhost:3000
# API docs:  http://localhost:8000/docs
```

## Camera Sources

| Type | CAMERA_SOURCE value |
|---|---|
| Webcam | `0` (or `1`, `2` for additional cameras) |
| RTSP IP camera | `rtsp://user:pass@192.168.1.10:554/stream` |
| HTTP stream | `http://192.168.1.10:8080/video` |

## Activity Classes

| Activity | Severity | Alert |
|---|---|---|
| fall | Critical | Email + SMS + Push (immediate) |
| sleeping (out of hours) | Warning | Email + SMS + Push |
| inactivity | Warning | Email + SMS + Push |
| sitting / standing / walking | Info | None |
| anomalous | Info | None |

## Project Structure

```text
ELDERSAFE_2.0/
├── backend/
│   ├── main.py              # FastAPI app + WebSocket
│   ├── config.py            # Settings from .env
│   ├── pipeline/
│   │   ├── capture.py       # OpenCV VideoCapture
│   │   ├── detector.py      # YOLOv8-Pose inference
│   │   ├── classifier.py    # Activity rule engine
│   │   └── annotator.py     # Frame drawing
│   ├── alerts/
│   │   ├── engine.py        # Cooldown + dispatch
│   │   ├── email_alert.py
│   │   ├── sms_alert.py
│   │   └── push_alert.py
│   ├── db/
│   │   ├── models.py
│   │   ├── session.py
│   │   └── crud.py
│   └── api/
│       ├── routes.py
│       └── schemas.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── hooks/useElderSafe.js
│       └── components/
├── requirements.txt
├── .env.example
├── Dockerfile.backend
└── docker-compose.yml
```

## Key Files

- [requirements.txt](requirements.txt) — Python dependencies
- [.env.example](.env.example) — Environment variable template
- [docker-compose.yml](docker-compose.yml) — Docker orchestration
- [Dockerfile.backend](Dockerfile.backend) — Backend container image
