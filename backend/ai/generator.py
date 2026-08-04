"""
AI Generator — LLM-powered game content generation.
Supports assisted (step-by-step) and auto (full project) modes.
"""

from __future__ import annotations
import json
import os
from typing import Optional, Literal

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# ── Prompt Templates ───────────────────────────────────────

RPG_SYSTEM_PROMPT = """You are a game design assistant for a 2D top-down RPG editor.
Output ONLY valid JSON matching the requested schema. No explanations, no markdown."""

GALGAME_SYSTEM_PROMPT = """You are a game design assistant for a visual novel (galgame) editor.
Output ONLY valid JSON matching the requested schema. No explanations, no markdown."""

RPG_MAP_PROMPT = """Generate a tile map layout for an RPG.
Map size: {width}x{height} tiles. Theme: {theme}.
Return JSON: {{ "layers": [{{ "data": [[tileIndex,...],...] }}] }}
Tile indices: 0=empty, 1=grass, 2=dirt, 3=stone, 4=water, 5=sand, 6=wood."""

RPG_NPC_PROMPT = """Create {count} NPCs for an RPG village map. Theme: {theme}.
Return JSON array of NPCs: [{{ "name": "...", "x": number, "y": number, "dialogue": ["...", "..."] }}]"""

GALGAME_DIALOGUE_PROMPT = """Write a short {sceneCount}-scene visual novel scene. Theme: {theme}.
Return JSON with dialogueNodes and branchNodes.
Each dialogue node: {{ "speakerName": "...", "text": "...", "portraitExpression": "neutral|happy|sad|angry|surprised" }}"""

AUTO_PROJECT_PROMPT = """Create a complete game project based on this description: "{description}"
Game type: {mode}. Include:
- A fitting project name
- Map/scene data appropriate for the mode
- At least 2-3 dialogue nodes or NPC entities
- Theme-appropriate UI color suggestions
Return the FULL project JSON matching the GameProject schema."""


# ── Generator Class ────────────────────────────────────────

class AIGenerator:
    """LLM-powered game content generator."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: str = "gpt-4o-mini"
    ):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.base_url = base_url or os.environ.get("OPENAI_BASE_URL", None)
        self.model = model

        self.client: Optional[OpenAI] = None
        if HAS_OPENAI and self.api_key:
            kwargs = {"api_key": self.api_key}
            if self.base_url:
                kwargs["base_url"] = self.base_url
            self.client = OpenAI(**kwargs)

    @property
    def available(self) -> bool:
        return self.client is not None

    def _chat(self, system: str, user: str, temperature: float = 0.7) -> str:
        """Send a chat completion request."""
        if not self.client:
            return json.dumps({"error": "LLM not configured. Set API key first."})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user}
                ],
                temperature=temperature,
                max_tokens=2048
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            return json.dumps({"error": str(e)})

    # ── Assisted Mode Methods ──────────────────────────

    def generate_rpg_map(self, width: int, height: int, theme: str = "village") -> dict:
        """Generate tile map data."""
        prompt = RPG_MAP_PROMPT.format(width=width, height=height, theme=theme)
        result = self._chat(RPG_SYSTEM_PROMPT, prompt, temperature=0.5)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"raw": result, "error": "Failed to parse JSON"}

    def generate_rpg_npcs(self, count: int, theme: str = "village") -> list:
        """Generate NPC placement and dialogue."""
        prompt = RPG_NPC_PROMPT.format(count=count, theme=theme)
        result = self._chat(RPG_SYSTEM_PROMPT, prompt, temperature=0.8)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return [{"raw": result}]

    def generate_galgame_dialogue(self, scene_count: int, theme: str = "school") -> dict:
        """Generate dialogue and branch nodes."""
        prompt = GALGAME_DIALOGUE_PROMPT.format(sceneCount=scene_count, theme=theme)
        result = self._chat(GALGAME_SYSTEM_PROMPT, prompt, temperature=0.8)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"raw": result, "error": "Failed to parse JSON"}

    # ── Auto Mode ─────────────────────────────────────

    def generate_full_project(self, description: str, mode: str) -> dict:
        """Generate a complete game project from a description."""
        prompt = AUTO_PROJECT_PROMPT.format(description=description, mode=mode)
        system = RPG_SYSTEM_PROMPT if mode == "rpg" else GALGAME_SYSTEM_PROMPT
        result = self._chat(system, prompt, temperature=0.7)
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"raw": result, "error": "Failed to parse JSON response"}


# ── Placeholder Generator (offline fallback) ──────────────

class PlaceholderGenerator:
    """Fallback generator that creates sensible placeholder data without LLM."""

    def generate_rpg_map(self, width: int, height: int, theme: str = "village") -> dict:
        data = []
        for y in range(height):
            row = []
            for x in range(width):
                if x == 0 or y == 0 or x == width - 1 or y == height - 1:
                    row.append(3)  # stone border
                elif 2 < x < width - 3 and 2 < y < height - 3:
                    row.append(1)  # grass
                else:
                    row.append(2 if (x + y) % 3 == 0 else 1)  # dirt paths
            data.append(row)
        return {"layers": [{"data": data}]}

    def generate_rpg_npcs(self, count: int, theme: str = "village") -> list:
        names = ["Mayor", "Merchant", "Guard", "Farmer", "Child", "Mage", "Healer"]
        npcs = []
        for i in range(min(count, len(names))):
            npcs.append({
                "name": names[i],
                "x": 5 + i * 3,
                "y": 5 + i,
                "dialogue": [f"Hello! I'm the {names[i].lower()} of this {theme}."]
            })
        return npcs

    def generate_galgame_dialogue(self, scene_count: int, theme: str = "school") -> dict:
        return {
            "dialogueNodes": [
                {"speakerName": "Narrator", "text": f"A new day at the {theme}...", "portraitExpression": "neutral"},
                {"speakerName": "Friend", "text": "Hey! Ready for today?", "portraitExpression": "happy"},
                {"speakerName": "You", "text": "Yeah, let's go!", "portraitExpression": "happy"},
            ],
            "branchNodes": [
                {"prompt": "Where to go?", "choices": [
                    {"text": "The classroom", "nextNodeId": ""},
                    {"text": "The courtyard", "nextNodeId": ""}
                ]}
            ]
        }

    def generate_full_project(self, description: str, mode: str) -> dict:
        name = description[:30] if description else "Generated Project"
        return {
            "meta": {"name": name, "mode": mode, "version": "0.1.0", "description": description},
            "assets": [],
            "ui": {
                "theme": {"primary": "#89b4fa", "secondary": "#a6e3a1", "background": "#1e1e2e",
                          "surface": "#313244", "text": "#cdd6f4", "textMuted": "#6c7086",
                          "accent": "#f5c2e7", "danger": "#f38ba8"}
            }
        }
