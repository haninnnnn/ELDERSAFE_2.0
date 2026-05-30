from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import uuid, shutil, threading

from backend.report_runner import run_report, OUTPUT_DIR

router = APIRouter(prefix="/api/report")

JOBS: dict[str, dict] = {}
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/run")
async def start_report(file: UploadFile = File(...)):
    job_id   = str(uuid.uuid4())
    vid_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
    with vid_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    JOBS[job_id] = {"status": "processing", "progress": "", "report": None, "error": None, "video_ready": False}

    def _run():
        try:
            def on_progress(msg): JOBS[job_id]["progress"] = msg
            result = run_report(str(vid_path), job_id=job_id, on_progress=on_progress)
            JOBS[job_id].update({"status": "done", "report": result, "video_ready": True})
        except Exception as e:
            JOBS[job_id].update({"status": "error", "error": str(e)})
        finally:
            vid_path.unlink(missing_ok=True)

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job_id}

@router.get("/status/{job_id}")
def report_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.get("/video/{job_id}")
def get_video(job_id: str):
    path = OUTPUT_DIR / f"{job_id}_annotated.mp4"
    if not path.exists():
        raise HTTPException(404, "Video not ready")
    return FileResponse(str(path), media_type="video/mp4",
                        headers={"Content-Disposition": f"inline; filename=annotated_{job_id[:8]}.mp4"})
