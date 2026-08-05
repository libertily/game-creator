"""
Source Exporter — packages project + engine as a standalone Python game.
"""

import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from datetime import datetime
from typing import Optional


def export_as_source(project_data: dict, output_path: Optional[str] = None) -> str:
    """
    Export a GameProject as a standalone Python source package (ZIP).
    Returns the path to the generated ZIP file.
    """
    meta = project_data.get("meta", {})
    mode = meta.get("mode", "rpg")
    name = meta.get("name", "game").replace(" ", "_").lower()

    tmp_dir = tempfile.mkdtemp(prefix="gcexport_")
    project_dir = Path(tmp_dir) / name
    project_dir.mkdir()

    # ── Game entry point ────────────────────────────────
    main_py = f'''"""
{meta.get("name", "Game")} — Created with Game Creator
Mode: {mode.upper()}
"""

import json
import sys
from pathlib import Path

try:
    import pygame
except ImportError:
    print("Pygame not found. Install with: pip install pygame")
    sys.exit(1)

# Load project data
with open(Path(__file__).parent / "project.json", "r", encoding="utf-8") as f:
    data = json.load(f)

if "{mode}" == "rpg":
    from engine.rpg_engine import RPGEngine
    engine = RPGEngine(screen_width=800, screen_height=600, title=data["meta"]["name"])
else:
    from engine.galgame_engine import GalgameEngine
    engine = GalgameEngine(screen_width=800, screen_height=600, title=data["meta"]["name"])

engine.load_from_project(data)
engine.run()
'''

    with open(project_dir / "main.py", "w", encoding="utf-8") as f:
        f.write(main_py)

    # ── Requirements ───────────────────────────────────
    requirements = """pygame>=2.5.0
"""
    with open(project_dir / "requirements.txt", "w", encoding="utf-8") as f:
        f.write(requirements)

    # ── README ─────────────────────────────────────────
    readme = f"""# {meta.get('name', 'Game')}

Created with Game Creator on {datetime.now().strftime('%Y-%m-%d')}.

## Run

```bash
pip install -r requirements.txt
python main.py
```

## Controls

- Arrow keys / WASD: Move
- E: Interact
- Space / Enter / Click: Advance dialogue
- Escape: Quit
"""
    with open(project_dir / "README.md", "w", encoding="utf-8") as f:
        f.write(readme)

    # ── Project data ───────────────────────────────────
    with open(project_dir / "project.json", "w", encoding="utf-8") as f:
        json.dump(project_data, f, indent=2, ensure_ascii=False)

    # ── Copy engine modules ────────────────────────────
    engine_src = Path(__file__).parent.parent / "engine"
    engine_dst = project_dir / "engine"
    engine_dst.mkdir()
    shutil.copy(engine_src / "__init__.py", engine_dst / "__init__.py")
    shutil.copy(engine_src / "rpg_engine.py", engine_dst / "rpg_engine.py")
    shutil.copy(engine_src / "galgame_engine.py", engine_dst / "galgame_engine.py")

    # ── Create ZIP ─────────────────────────────────────
    if output_path is None:
        output_path = os.path.join(tempfile.gettempdir(), f"{name}_export.zip")

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, tmp_dir)
                zf.write(file_path, arcname)

    # Cleanup temp
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return output_path


# ── Asset baking (inline file-path refs → base64 data URLs) ─────────
_MIME = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
}


def _file_to_data_url(path: str) -> str:
    import base64
    ext = os.path.splitext(path)[1].lower()
    mime = _MIME.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _bake_asset_field(obj: dict, key: str):
    """Convert a file-path reference in obj[key] to an embedded base64 data URL."""
    v = obj.get(key)
    if v and not str(v).startswith("data:") and os.path.exists(v):
        try:
            obj[key] = _file_to_data_url(v)
        except Exception:
            pass


def _bake_assets(project_data: dict) -> dict:
    """
    Return a deep copy of project_data where every file-path asset reference
    (backgrounds, portraits, expression images, BGM, ...) is inlined as a
    base64 data URL, so the project is fully self-contained (art + music
    bundled together).
    """
    import copy
    data = copy.deepcopy(project_data)
    gal = data.get("galgame") or {}
    for sc in gal.get("scenes", []):
        _bake_asset_field(sc, "backgroundPath")
        _bake_asset_field(sc, "bgmPath")
    for ch in gal.get("characters", []):
        _bake_asset_field(ch, "portraitPath")
        for name, p in (ch.get("expressions") or {}).items():
            if p and not str(p).startswith("data:") and os.path.exists(p):
                try:
                    ch["expressions"][name] = _file_to_data_url(p)
                except Exception:
                    pass
    rpg = data.get("rpg") or {}
    for m in rpg.get("maps", []):
        _bake_asset_field(m, "tilesetPath")
    for e in rpg.get("entities", []):
        _bake_asset_field(e, "spritePath")
    return data


# ── EXE export (PyInstaller one-file, art+music bundled) ────────────

_MAIN_PY_TPL = '''"""
{title} — Created with Game Creator
Mode: {mode_upper}
"""

import json
import sys
from pathlib import Path

try:
    import pygame
except ImportError:
    print("Pygame not found. Install with: pip install pygame")
    sys.exit(1)

# PyInstaller one-file: bundled files live under sys._MEIPASS
BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))

with open(BASE / "project.json", "r", encoding="utf-8") as f:
    data = json.load(f)

if "{mode}" == "rpg":
    from engine.rpg_engine import RPGEngine
    engine = RPGEngine(screen_width=800, screen_height=600, title=data["meta"]["name"])
else:
    from engine.galgame_engine import GalgameEngine
    engine = GalgameEngine(screen_width=800, screen_height=600, title=data["meta"]["name"])

engine.load_from_project(data)
engine.run()
'''


def export_as_exe(project_data: dict, output_path: Optional[str] = None) -> dict:
    """
    Export as a standalone single-file EXE using PyInstaller.
    Art/music assets are inlined into project.json and bundled into the EXE.
    Returns {"status": "ok", "zip_path": ...} or an error dict.
    """
    import subprocess
    import sys as _sys

    meta = project_data.get("meta", {})
    mode = meta.get("mode", "rpg")
    title = meta.get("name", "Game")
    # ASCII-safe file name (PyInstaller bootloader friendly on Windows)
    name = "".join(c for c in title if c.isascii() and (c.isalnum() or c in "-_ ")).replace(" ", "_").lower().strip("_") or "game"

    # PyInstaller must be available
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        return {"status": "error", "message": "EXE 打包需要 PyInstaller，请先安装：pip install pyinstaller"}

    # Fully self-contained project (art + music inlined)
    data = _bake_assets(project_data)

    tmp_dir = tempfile.mkdtemp(prefix="gcexport_")
    project_dir = Path(tmp_dir) / name
    project_dir.mkdir()

    # ── Entry point (PyInstaller-aware) ──────────────────
    with open(project_dir / "main.py", "w", encoding="utf-8") as f:
        f.write(_MAIN_PY_TPL.format(title=title, mode=mode, mode_upper=mode.upper()))

    # ── Requirements / README ───────────────────────────
    with open(project_dir / "requirements.txt", "w", encoding="utf-8") as f:
        f.write("pygame>=2.5.0\n")
    readme = f"""# {title}

Created with Game Creator on {datetime.now().strftime('%Y-%m-%d')}.

## Run

Windows: double-click the EXE (art/music are already bundled inside).
Source: `python main.py` (needs `pip install -r requirements.txt`).

## Controls

- Arrow keys / WASD: Move
- E: Interact
- Space / Enter / Click: Advance dialogue
- Escape: Quit
"""
    with open(project_dir / "README.md", "w", encoding="utf-8") as f:
        f.write(readme)

    # ── Project data (embedded assets) ──────────────────
    with open(project_dir / "project.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # ── Copy engine modules ─────────────────────────────
    engine_src = Path(__file__).parent.parent / "engine"
    engine_dst = project_dir / "engine"
    engine_dst.mkdir()
    shutil.copy(engine_src / "__init__.py", engine_dst / "__init__.py")
    shutil.copy(engine_src / "rpg_engine.py", engine_dst / "rpg_engine.py")
    shutil.copy(engine_src / "galgame_engine.py", engine_dst / "galgame_engine.py")

    # ── Build with PyInstaller ──────────────────────────
    spec_dir = Path(tmp_dir) / "build"
    try:
        sep = ";" if os.name == "nt" else ":"
        cmd = [
            _sys.executable, "-m", "PyInstaller",
            "--onefile", "--noconfirm", "--clean",
            "--name", name,
            "--add-data", f"{project_dir}{sep}.",
            "--collect-all", "pygame",
            str(project_dir / "main.py"),
        ]
        proc = subprocess.run(cmd, cwd=tmp_dir, capture_output=True, text=True, timeout=600)
        if proc.returncode != 0:
            return {"status": "error", "message": "PyInstaller 失败:\n" + (proc.stderr[-1200:] or proc.stdout[-1200:])}
    except Exception as e:
        return {"status": "error", "message": f"EXE 打包异常: {e}"}

    exe_path = Path(tmp_dir) / "dist" / f"{name}.exe"
    if not exe_path.exists():
        return {"status": "error", "message": "未找到生成的 EXE 文件"}

    # ── Wrap the EXE in a ZIP for download ──────────────
    if output_path is None:
        output_path = os.path.join(tempfile.gettempdir(), f"{name}_exe.zip")
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(exe_path, f"{name}.exe")
        zf.write(project_dir / "README.md", "README.md")

    # Cleanup temp (keep only the zip)
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return {"status": "ok", "zip_path": output_path, "exe": f"{name}.exe"}
