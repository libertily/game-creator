"""Smoke test for all Game Creator backend modules."""
import sys

print(f"Python {sys.version.split()[0]}")

# Core modules
from main import app; print("[OK] FastAPI app")
from models.project import GameProject; print("[OK] Models")
from asset.manager import AssetManager; print("[OK] Asset Manager")
from asset.processor import get_image_info, create_placeholder; print("[OK] Asset Processor")
from ai.generator import PlaceholderGenerator, AIGenerator; print("[OK] AI Generator")
from export.source_exporter import export_as_source, export_as_exe; print("[OK] Exporter")

# Placeholder generation test
pg = PlaceholderGenerator()
r = pg.generate_full_project("test game", "rpg")
assert r["meta"]["name"] == "test game"
print(f"[OK] Placeholder generates project: {r['meta']['name']}")

# RPG engine (skips if pygame not installed)
try:
    from engine.rpg_engine import RPGEngine
    print("[OK] RPG Engine import")
except RuntimeError as e:
    print(f"[SKIP] RPG Engine: pygame not installed ({e})")

# Galgame engine (skips if pygame not installed)
try:
    from engine.galgame_engine import GalgameEngine
    print("[OK] Galgame Engine import")
except RuntimeError as e:
    print(f"[SKIP] Galgame Engine: pygame not installed ({e})")

# Template loading test
import json
from pathlib import Path
templates_dir = Path(__file__).parent.parent / "templates"
for tf in templates_dir.glob("*/starter.json"):
    with open(tf) as f:
        data = json.load(f)
    assert "meta" in data
    print(f"[OK] Template: {tf.parent.name}/{tf.name}")

print("\n=== ALL TESTS PASSED ===")
