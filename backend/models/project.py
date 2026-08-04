"""
Python mirror of shared/models/project.ts
Used for backend validation and engine consumption.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime


GameMode = Literal['rpg', 'galgame']


@dataclass
class ProjectMeta:
    name: str
    mode: GameMode
    version: str = '0.1.0'
    created_at: str = ''
    updated_at: str = ''
    description: str = ''

    def __post_init__(self):
        now = datetime.now().isoformat()
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now


AssetType = Literal['sprite', 'tileset', 'background', 'portrait', 'effect', 'audio', 'ui', 'other']


@dataclass
class AssetRef:
    id: str
    name: str
    type: AssetType
    relative_path: str
    width: int = 0
    height: int = 0
    imported_at: str = ''


@dataclass
class UIColorTheme:
    primary: str = '#89b4fa'
    secondary: str = '#a6e3a1'
    background: str = '#1e1e2e'
    surface: str = '#313244'
    text: str = '#cdd6f4'
    text_muted: str = '#6c7086'
    accent: str = '#f5c2e7'
    danger: str = '#f38ba8'


@dataclass
class GameProject:
    meta: ProjectMeta
    assets: list[AssetRef] = field(default_factory=list)
    ui: dict = field(default_factory=dict)
    rpg: Optional[dict] = None
    galgame: Optional[dict] = None

    @classmethod
    def from_dict(cls, data: dict) -> GameProject:
        """Deserialize from JSON dict (matches TS GameProject)."""
        meta = ProjectMeta(
            name=data['meta']['name'],
            mode=data['meta']['mode'],
            version=data['meta'].get('version', '0.1.0'),
            created_at=data['meta'].get('createdAt', ''),
            updated_at=data['meta'].get('updatedAt', ''),
            description=data['meta'].get('description', '')
        )
        assets = [
            AssetRef(
                id=a['id'],
                name=a['name'],
                type=a['type'],
                relative_path=a['relativePath'],
                width=a.get('width', 0),
                height=a.get('height', 0),
                imported_at=a.get('importedAt', '')
            )
            for a in data.get('assets', [])
        ]
        return cls(
            meta=meta,
            assets=assets,
            ui=data.get('ui', {}),
            rpg=data.get('rpg'),
            galgame=data.get('galgame')
        )

    def to_dict(self) -> dict:
        """Serialize to JSON-compatible dict."""
        return {
            'meta': {
                'name': self.meta.name,
                'mode': self.meta.mode,
                'version': self.meta.version,
                'createdAt': self.meta.created_at,
                'updatedAt': self.meta.updated_at,
                'description': self.meta.description
            },
            'assets': [
                {
                    'id': a.id,
                    'name': a.name,
                    'type': a.type,
                    'relativePath': a.relative_path,
                    'width': a.width,
                    'height': a.height,
                    'importedAt': a.imported_at
                }
                for a in self.assets
            ],
            'ui': self.ui,
            'rpg': self.rpg,
            'galgame': self.galgame
        }
