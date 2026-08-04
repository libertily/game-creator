"""
Asset Manager — handles asset metadata indexing, CRUD, and organization.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

ASSET_METADATA_FILE = "asset_index.json"


class AssetManager:
    """Manages the asset index for a project directory."""

    def __init__(self, project_dir: str):
        self.project_dir = Path(project_dir)
        self.assets_dir = self.project_dir / "assets"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.assets_dir / ASSET_METADATA_FILE
        self._index: dict = self._load_index()

    def _load_index(self) -> dict:
        if self.index_path.exists():
            with open(self.index_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"assets": {}, "categories": {}}

    def _save_index(self):
        with open(self.index_path, "w", encoding="utf-8") as f:
            json.dump(self._index, f, indent=2, ensure_ascii=False)

    def add_asset(
        self,
        filename: str,
        asset_type: str,
        width: int = 0,
        height: int = 0,
        file_size: int = 0,
        tags: Optional[list] = None,
    ) -> dict:
        """Register a new asset in the index."""
        asset_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()

        entry = {
            "id": asset_id,
            "filename": filename,
            "type": asset_type,
            "relative_path": f"assets/{filename}",
            "width": width,
            "height": height,
            "file_size": file_size,
            "tags": tags or [],
            "imported_at": now,
        }

        self._index["assets"][asset_id] = entry

        # Update category count
        cat = asset_type
        if cat not in self._index["categories"]:
            self._index["categories"][cat] = 0
        self._index["categories"][cat] += 1

        self._save_index()
        return entry

    def remove_asset(self, asset_id: str) -> bool:
        """Remove an asset from the index (and optionally the file)."""
        if asset_id not in self._index["assets"]:
            return False

        entry = self._index["assets"].pop(asset_id)

        # Update category count
        cat = entry["type"]
        if cat in self._index["categories"]:
            self._index["categories"][cat] = max(0, self._index["categories"][cat] - 1)

        # Optionally delete the file
        file_path = self.assets_dir / entry["filename"]
        if file_path.exists():
            file_path.unlink()

        self._save_index()
        return True

    def get_asset(self, asset_id: str) -> Optional[dict]:
        return self._index["assets"].get(asset_id)

    def list_assets(self, asset_type: Optional[str] = None) -> list:
        """List all assets, optionally filtered by type."""
        assets = list(self._index["assets"].values())
        if asset_type:
            assets = [a for a in assets if a["type"] == asset_type]
        return sorted(assets, key=lambda a: a.get("imported_at", ""), reverse=True)

    def search_assets(self, query: str) -> list:
        """Search assets by name or tags."""
        q = query.lower()
        results = []
        for a in self._index["assets"].values():
            if q in a["filename"].lower() or any(q in t.lower() for t in a.get("tags", [])):
                results.append(a)
        return results

    def get_categories(self) -> dict:
        return self._index.get("categories", {})

    def get_stats(self) -> dict:
        """Return summary stats."""
        assets = list(self._index["assets"].values())
        total_size = sum(a.get("file_size", 0) for a in assets)
        return {
            "total_assets": len(assets),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "categories": self._index.get("categories", {}),
        }
