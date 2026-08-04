"""
Game Creator Backend — FastAPI Server
Provides game engine, AI generation, asset processing, and export services.
"""

import argparse
import json
import os
import sys
import subprocess
import tempfile
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Game Creator Backend", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

HAS_PYGAME = False
try:
    import pygame
    HAS_PYGAME = True
except ImportError:
    pass

# ── Models ─────────────────────────────────────────────────

class ProjectMetaModel(BaseModel):
    name: str; mode: str; version: str = "0.1.0"
    createdAt: str = ""; updatedAt: str = ""; description: str = ""

class GameProjectModel(BaseModel):
    meta: ProjectMetaModel; assets: list = []; ui: dict = {}
    rpg: Optional[dict] = None; galgame: Optional[dict] = None

class ExportRequest(BaseModel):
    project: GameProjectModel; outputType: str

class AIGenerateRequest(BaseModel):
    mode: str; projectContext: dict; prompt: str

# ── Health ─────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat(), "version": "0.1.0", "pygame": HAS_PYGAME}

@app.get("/api/python/info")
async def python_info():
    return {"version": sys.version, "executable": sys.executable, "platform": sys.platform, "pygame": HAS_PYGAME}

# ── Asset ──────────────────────────────────────────────────

@app.post("/api/assets/upload")
async def upload_asset(file: UploadFile = File(...)):
    if not file.filename: raise HTTPException(400, "No file provided")
    asset_id = str(uuid.uuid4())[:8]
    ext = Path(file.filename).suffix.lower()
    image_exts = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}
    audio_exts = {'.wav', '.mp3', '.ogg'}
    return {"id": asset_id, "name": file.filename, "type": "image" if ext in image_exts else "audio" if ext in audio_exts else "other", "extension": ext}

# ── Game Preview ───────────────────────────────────────────

@app.post("/api/engine/preview")
async def start_preview(project: GameProjectModel):
    """Save project to temp JSON and launch Pygame engine in a subprocess."""
    if not HAS_PYGAME:
        return {"status": "error", "message": "Pygame is not installed. Run: pip install pygame"}

    mode = project.meta.mode
    engine_script = Path(__file__).parent / "engine" / ("rpg_engine.py" if mode == "rpg" else "galgame_engine.py")

    if not engine_script.exists():
        return {"status": "error", "message": f"Engine script not found: {engine_script}"}

    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8')
    json.dump(project.model_dump(), tmp, ensure_ascii=False)
    tmp_path = tmp.name; tmp.close()

    def launch():
        try:
            subprocess.run([sys.executable, str(engine_script), tmp_path], check=False)
        finally:
            try: os.unlink(tmp_path)
            except OSError: pass

    t = threading.Thread(target=launch, daemon=True)
    t.start()

    return {"status": "preview_started", "message": f"Launching {mode.upper()} preview for '{project.meta.name}'", "mode": mode}

# ── Export ─────────────────────────────────────────────────

@app.post("/api/export")
async def export_project(request: ExportRequest):
    return {"status": "queued", "projectName": request.project.meta.name, "outputType": request.outputType}

# ── AI ─────────────────────────────────────────────────────

@app.post("/api/ai/generate")
async def ai_generate(request: AIGenerateRequest):
    return {"status": "generated", "mode": request.mode, "result": {"message": f"AI {request.mode} mode placeholder"}}

# ── Entry Point ────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Game Creator Backend")
    parser.add_argument("--port", type=int, default=18721)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    print(f"[GameCreator Backend] Starting on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")

if __name__ == "__main__":
    main()
