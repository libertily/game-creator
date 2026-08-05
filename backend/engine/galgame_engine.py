"""
Galgame Engine — Pygame-based visual novel runtime.
Renders backgrounds, dialogue boxes, choice menus.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import json, base64, io

try:
    import pygame
    from pygame.locals import *
    HAS_PYGAME = True
except ImportError:
    HAS_PYGAME = False

DIALOGUE_BOX_HEIGHT = 160; DIALOGUE_BOX_MARGIN = 20
NAME_BOX_HEIGHT = 28; FONT_SIZE = 22; TYPING_SPEED = 0.03
CHOICE_BUTTON_HEIGHT = 36; CHOICE_BUTTON_MARGIN = 8

# ── Chinese Font Helper ─────────────────────────────────

_zh_font = {}

def get_font(size: int):
    if not HAS_PYGAME: return None
    if size in _zh_font: return _zh_font[size]
    for name in ['microsoft yahei', 'simhei', 'simsun', 'fangsong', 'kaiti', 'arial']:
        try:
            f = pygame.font.SysFont(name, size)
            test = f.render('测试', True, (255,255,255))
            if test.get_width() > 20: _zh_font[size] = f; return f
        except: pass
    f = pygame.font.Font(None, size); _zh_font[size] = f; return f

# ── Data Classes ─────────────────────────────────────────

@dataclass
class SceneState: id: str; background: Optional[pygame.Surface] = None; character_ids: list = field(default_factory=list)

@dataclass
class DialogueNode: id: str; speaker: str; text: str; next_node_id: Optional[str] = None; change_scene_id: str = ""; display_character_id: str = ""; portrait_expression: str = ""; display_character_ids: list = field(default_factory=list); display_character_expressions: dict = field(default_factory=dict)

@dataclass
class BranchNode: id: str; prompt: str; choices: list = field(default_factory=list)

# ── Galgame Engine ──────────────────────────────────────

class GalgameEngine:
    def __init__(self, screen_width=800, screen_height=600, title="Visual Novel"):
        if not HAS_PYGAME: raise RuntimeError("pygame not installed")
        pygame.init()
        self.screen = pygame.display.set_mode((screen_width, screen_height))
        pygame.display.set_caption(title)
        self.clock = pygame.time.Clock(); self.running = False
        self.sw, self.sh = screen_width, screen_height
        self.scenes: dict[str, SceneState] = {}
        self.dialogue_nodes: dict[str, DialogueNode] = {}
        self.branch_nodes: dict[str, BranchNode] = {}
        self.characters: dict[str, dict] = {}
        self.variables: dict[str, int] = {}
        self.current_scene_id = self.current_node_id = ""
        self.current_text = ""; self.text_idx = 0; self.text_timer = 0.0
        self.text_complete = False; self.showing_choices = False; self.selected_choice = 0
        self.current_portrait: Optional[pygame.Surface] = None
        self.current_char_cfg: Optional[dict] = None
        # multiple characters on stage (each: {char_id, cfg, surf})
        self.onstage: list[dict] = []

    def _load_image(self, path: str) -> Optional[pygame.Surface]:
        """Load an image from base64 data URL or file path."""
        if not path: return None
        try:
            if path.startswith("data:image"):
                header, encoded = path.split(",", 1)
                img = pygame.image.load(io.BytesIO(base64.b64decode(encoded))).convert_alpha()
            else:
                img = pygame.image.load(path).convert_alpha()
            return img
        except Exception:
            return None

    def load_from_project(self, project_data: dict):
        gal = project_data.get("galgame", {})
        if not gal: return
        for sd in gal.get("scenes", []):
            scene = SceneState(id=sd["id"], character_ids=list(sd.get("characterIds", []) or []))
            # try loading background from base64 data URL
            bg_path = sd.get("backgroundPath", "")
            if bg_path and bg_path.startswith("data:image"):
                try:
                    header, encoded = bg_path.split(",", 1)
                    img_data = base64.b64decode(encoded)
                    img_file = io.BytesIO(img_data)
                    scene.background = pygame.image.load(img_file).convert()
                    scene.background = pygame.transform.scale(scene.background, (self.sw, self.sh))
                except Exception:
                    pass
            self.scenes[sd["id"]] = scene
        for dn in gal.get("dialogueNodes", []):
            self.dialogue_nodes[dn["id"]] = DialogueNode(
                id=dn["id"], speaker=dn.get("speakerName",""), text=dn.get("text",""),
                next_node_id=dn.get("nextNodeId"),
                change_scene_id=dn.get("changeSceneId", ""),
                display_character_id=dn.get("displayCharacterId", ""),
                portrait_expression=dn.get("portraitExpression", ""),
                display_character_ids=list(dn.get("displayCharacterIds", []) or []),
                display_character_expressions=dict(dn.get("displayCharacterExpressions", {}) or {}))
        for bn in gal.get("branchNodes", []):
            self.branch_nodes[bn["id"]] = BranchNode(id=bn["id"], prompt=bn.get("prompt",""), choices=bn.get("choices",[]))
        # load characters with portrait + position + scale
        for ch in gal.get("characters", []):
            expr = ch.get("expressions", {}) or {}
            portrait = self._load_image(ch.get("portraitPath","") or "")
            self.characters[ch["id"]] = {
                "id": ch["id"], "name": ch.get("name",""),
                "portrait": portrait, "expressions": expr,
                "position": ch.get("position","center"),
                "scale": ch.get("scale", 0.33), "offsetX": ch.get("offsetX", 0), "offsetY": ch.get("offsetY", 0),
                "image_configs": ch.get("imageConfigs", {}) or {},
            }
        self.variables = gal.get("variables", {})
        self.current_scene_id = gal.get("startSceneId", "")
        self.current_node_id = gal.get("startNodeId", "")
        # load all characters bound to the starting scene
        self._load_scene_chars(self.current_scene_id)
        self._start_node(self.current_node_id)

    def _resolve_char_id(self, speaker: str) -> Optional[str]:
        """Find a character id by name or id (match by name or id)."""
        if not speaker or speaker in ("旁白","Narrator","?"): return None
        for ch in self.characters.values():
            if ch["name"] == speaker or speaker == ch["id"]:
                return ch["id"]
        return None

    def _char_effective_config(self, ch: dict, expr_name: str = "") -> dict:
        """Merge legacy character-level position with per-image config (key '' = default portrait)."""
        cfg = {
            "id": ch["id"], "name": ch["name"],
            "position": ch.get("position", "center"),
            "scale": ch.get("scale", 0.33),
            "offsetX": ch.get("offsetX", 0), "offsetY": ch.get("offsetY", 0),
        }
        per = (ch.get("image_configs") or {}).get(expr_name or "", {}) or {}
        if "position" in per: cfg["position"] = per["position"]
        if "scale" in per: cfg["scale"] = per["scale"]
        if "offsetX" in per: cfg["offsetX"] = per["offsetX"]
        if "offsetY" in per: cfg["offsetY"] = per["offsetY"]
        return cfg

    def _load_scene_chars(self, scene_id: str):
        """Put every character bound to a scene on stage (default portraits, per-image config)."""
        self.onstage = []
        scene = self.scenes.get(scene_id)
        for cid in (scene.character_ids if scene else []):
            ch = self.characters.get(cid)
            if ch: self.onstage.append({"char_id": cid, "cfg": self._char_effective_config(ch, ""), "surf": ch["portrait"]})

    def _set_display_char(self, char_id: Optional[str], expr_name: str = ""):
        """Bring a character on stage (or update its portrait/expression + per-image config)."""
        if not char_id: return
        ch = self.characters.get(char_id)
        if not ch: return
        surf = ch["portrait"]
        if expr_name and ch.get("expressions", {}).get(expr_name):
            surf = self._load_image(ch["expressions"][expr_name])
        cfg = self._char_effective_config(ch, expr_name)
        for e in self.onstage:
            if e["char_id"] == char_id:
                e["surf"] = surf; e["cfg"] = cfg
                self.current_char_cfg = cfg; self.current_portrait = surf
                return
        self.onstage.append({"char_id": char_id, "cfg": cfg, "surf": surf})
        self.current_char_cfg = cfg; self.current_portrait = surf

    def _start_node(self, nid: str):
        self.current_node_id = nid; self.showing_choices = False; self.selected_choice = 0
        if nid in self.dialogue_nodes:
            dn = self.dialogue_nodes[nid]; self.current_text = dn.text
            self.text_idx = 0; self.text_timer = 0.0; self.text_complete = False
            # scene change → load all characters bound to the scene
            if dn.change_scene_id and dn.change_scene_id in self.scenes:
                self.current_scene_id = dn.change_scene_id
                self._load_scene_chars(self.current_scene_id)
            # explicit cast: exactly the selected display characters (multiple allowed)
            if dn.display_character_ids:
                self.onstage = []
                expr_map = dn.display_character_expressions or {}
                for cid in dn.display_character_ids:
                    if cid in self.characters:
                        self._set_display_char(cid, expr_map.get(cid, ""))
            elif dn.display_character_id and dn.display_character_id in self.characters:
                # legacy single display character
                self.onstage = []
                self._set_display_char(dn.display_character_id, dn.portrait_expression)
            else:
                # no explicit cast → keep current onstage, ensure the speaker is present
                self._set_display_char(self._resolve_char_id(dn.speaker))
        elif nid in self.branch_nodes:
            self.showing_choices = True; self.current_text = self.branch_nodes[nid].prompt
            self.text_idx = len(self.current_text); self.text_complete = True
        else: self.current_text = "[END]"; self.text_idx = len(self.current_text); self.text_complete = True

    def _advance(self):
        if self.showing_choices:
            bn = self.branch_nodes.get(self.current_node_id)
            if bn and 0 <= self.selected_choice < len(bn.choices):
                nid = bn.choices[self.selected_choice].get("nextNodeId", "")
                if nid: self._start_node(nid)
            return
        if not self.text_complete: self.text_idx = len(self.current_text); self.text_complete = True; return
        dn = self.dialogue_nodes.get(self.current_node_id)
        if dn:
            # scene change?
            if dn.change_scene_id and dn.change_scene_id in self.scenes:
                self.current_scene_id = dn.change_scene_id
            if dn.next_node_id: self._start_node(dn.next_node_id)

    def run(self):
        self.running = True
        while self.running:
            dt = self.clock.tick(60)/1000.0; self._handle_events(); self._update(dt); self._render()
        pygame.quit()

    def stop(self): self.running = False

    def _handle_events(self):
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT: self.running = False
            elif ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_ESCAPE: self.running = False
                elif ev.key in (pygame.K_SPACE, pygame.K_RETURN, pygame.K_z): self._advance()
                elif self.showing_choices:
                    if ev.key in (pygame.K_UP, pygame.K_w): self.selected_choice = max(0, self.selected_choice-1)
                    elif ev.key in (pygame.K_DOWN, pygame.K_s):
                        bn = self.branch_nodes.get(self.current_node_id)
                        self.selected_choice = min(len(bn.choices)-1 if bn else 0, self.selected_choice+1)
            elif ev.type == pygame.MOUSEBUTTONDOWN and ev.button == 1: self._advance()

    def _update(self, dt):
        if not self.text_complete and self.text_idx < len(self.current_text):
            self.text_timer += dt
            add = int(self.text_timer/TYPING_SPEED)
            if add > 0: self.text_idx = min(len(self.current_text), self.text_idx+add); self.text_timer = 0.0
            if self.text_idx >= len(self.current_text): self.text_complete = True

    def _render(self):
        self.screen.fill((20,20,40))
        # Background placeholder
        scene = self.scenes.get(self.current_scene_id)
        if scene and scene.background:
            self.screen.blit(scene.background, (0,0))
        else:
            # Dark gradient placeholder
            font_s = get_font(14)
            for y in range(self.sh):
                r = int(20+30*y/self.sh); g = int(20+20*y/self.sh); b = int(50+40*y/self.sh)
                pygame.draw.line(self.screen, (r,g,b), (0,y), (self.sw,y))
            if font_s:
                scene_name = "待定 / TBD"
                if scene: scene_name = scene.id
                ph = font_s.render(f"[{scene_name}]", True, (100,100,120))
                self.screen.blit(ph, (self.sw//2 - ph.get_width()//2, self.sh//2 - 60))

        # Character portraits (a scene can show multiple characters at once)
        for entry in self.onstage:
            if not entry["surf"]: continue
            cfg = entry["cfg"]
            surf = entry["surf"]
            # scale relative to screen width (default 1/3 of image width)
            scale = cfg.get("scale", 0.33) or 0.33
            pw = int(self.sw * scale); ph_ = int(pw * surf.get_height() / max(1, surf.get_width()))
            try:
                s = pygame.transform.smoothscale(surf, (pw, ph_))
            except Exception:
                s = pygame.transform.scale(surf, (pw, ph_))
            # base x by position
            pos = cfg.get("position", "center")
            if pos == "left": base_x = 0
            elif pos == "right": base_x = self.sw - pw
            else: base_x = (self.sw - pw) // 2
            ox = int((cfg.get("offsetX", 0) or 0) * self.sw / 100)
            oy = int((cfg.get("offsetY", 0) or 0) * self.sh / 100)
            base_y = self.sh - ph_ - DIALOGUE_BOX_HEIGHT - DIALOGUE_BOX_MARGIN - 10
            self.screen.blit(s, (base_x + ox, base_y + oy))

        # Speaker name
        dn = self.dialogue_nodes.get(self.current_node_id)
        speaker = dn.speaker if dn else ""
        if speaker:
            f_name = get_font(18)
            if f_name:
                ns = f_name.render(speaker, True, (203,166,247))
                nr = pygame.Rect(DIALOGUE_BOX_MARGIN, self.sh-DIALOGUE_BOX_HEIGHT-DIALOGUE_BOX_MARGIN-NAME_BOX_HEIGHT, ns.get_width()+24, NAME_BOX_HEIGHT)
                pygame.draw.rect(self.screen, (49,50,68), nr, border_radius=6)
                self.screen.blit(ns, (nr.x+12, nr.y+2))

        # Dialogue box
        dbr = pygame.Rect(DIALOGUE_BOX_MARGIN, self.sh-DIALOGUE_BOX_HEIGHT-DIALOGUE_BOX_MARGIN, self.sw-DIALOGUE_BOX_MARGIN*2, DIALOGUE_BOX_HEIGHT)
        dbg = pygame.Surface((dbr.width, dbr.height), pygame.SRCALPHA); dbg.fill((0,0,0,170))
        self.screen.blit(dbg, dbr)

        # Text (with word wrap for Chinese)
        displayed = self.current_text[:self.text_idx]
        f_text = get_font(FONT_SIZE)
        if f_text and displayed:
            # Simple character-based wrapping for Chinese
            chars_per_line = max(1, (dbr.width - 32) // (f_text.size('W')[0] or 14))
            lines = []; i = 0
            while i < len(displayed):
                lines.append(displayed[i:i+chars_per_line]); i += chars_per_line
            for li, line in enumerate(lines[:8]):
                s = f_text.render(line, True, (255,255,255))
                self.screen.blit(s, (dbr.x+16, dbr.y+16+li*(FONT_SIZE+4)))

        # Continue indicator
        if self.text_complete and not self.showing_choices:
            a = abs(pygame.time.get_ticks()%1000-500)/500*255
            f_a = get_font(16)
            if f_a:
                ind = f_a.render("▼", True, (255,255,255,int(a))); self.screen.blit(ind, (dbr.right-30, dbr.bottom-24))

        # Choice buttons
        if self.showing_choices:
            bn = self.branch_nodes.get(self.current_node_id)
            if bn:
                total_h = len(bn.choices)*(CHOICE_BUTTON_HEIGHT+CHOICE_BUTTON_MARGIN)
                sy = dbr.y - total_h - 8
                f_ch = get_font(16)
                for i, ch in enumerate(bn.choices):
                    br = pygame.Rect(dbr.x+16, sy+i*(CHOICE_BUTTON_HEIGHT+CHOICE_BUTTON_MARGIN), dbr.width-32, CHOICE_BUTTON_HEIGHT)
                    sel = i == self.selected_choice
                    bg = pygame.Surface((br.width, br.height), pygame.SRCALPHA)
                    bg.fill((137,180,250,80) if sel else (49,50,68,200)); self.screen.blit(bg, br)
                    pygame.draw.rect(self.screen, (137,180,250) if sel else (58,58,94), br, 2 if sel else 1, border_radius=4)
                    if f_ch:
                        ct = f_ch.render(ch["text"], True, (255,255,255))
                        self.screen.blit(ct, (br.x+12, br.y+8))

        # Controls hint
        f_hint = get_font(14)
        if f_hint:
            hint = f_hint.render("空格/点击:继续  ↑↓:选择  ESC:退出", True, (100,100,100))
            self.screen.blit(hint, (10, self.sh-25))

        pygame.display.flip()


def run_galgame_from_project(project_path: str):
    with open(project_path, "r", encoding="utf-8") as f: data = json.load(f)
    engine = GalgameEngine(800, 600, data.get("meta",{}).get("name","Visual Novel"))
    engine.load_from_project(data); engine.run()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1: run_galgame_from_project(sys.argv[1])
    else: print("Usage: python galgame_engine.py <project.json>")
