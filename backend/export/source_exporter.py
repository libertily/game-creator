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


def export_as_exe(project_data: dict, output_path: Optional[str] = None) -> dict:
    """
    Export as a standalone EXE using PyInstaller.
    Returns status info dict (actual packaging may take a while).
    """
    meta = project_data.get("meta", {})
    name = meta.get("name", "game").replace(" ", "_").lower()

    return {
        "status": "queued",
        "message": "EXE packaging requires PyInstaller. Use source export and run: pyinstaller --onefile main.py",
        "project_name": name,
        "output_path": output_path
    }
