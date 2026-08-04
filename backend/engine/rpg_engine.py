"""
RPG Engine — Pygame-based top-down RPG runtime.
Renders tile maps, handles player movement, collision, NPC interaction.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import json

try:
    import pygame
    HAS_PYGAME = True
except ImportError:
    HAS_PYGAME = False

DEFAULT_TILE_SIZE = 32
PLAYER_SPEED = 4
NPC_INTERACT_RANGE = 48

# ── Chinese Font Helper ─────────────────────────────────

_zh_font = None

def get_font(size: int):
    global _zh_font
    if not HAS_PYGAME: return None
    if _zh_font is None:
        _zh_font = {}
    if size in _zh_font:
        return _zh_font[size]
    # Try Chinese fonts in order
    for name in ['microsoft yahei', 'simhei', 'simsun', 'fangsong', 'kaiti', 'arial']:
        try:
            f = pygame.font.SysFont(name, size)
            test = f.render('测试', True, (255,255,255))
            if test.get_width() > 20:
                _zh_font[size] = f
                return f
        except: pass
    f = pygame.font.Font(None, size)
    _zh_font[size] = f
    return f

# ── Data Classes ──────────────────────────────────────

@dataclass
class Camera:
    x: float = 0; y: float = 0; width: int = 800; height: int = 600
    def follow(self, tx, ty, mw, mh):
        self.x = max(0, min(tx - self.width/2, mw - self.width))
        self.y = max(0, min(ty - self.height/2, mh - self.height))

@dataclass
class Player:
    x: float = 0; y: float = 0; speed: float = PLAYER_SPEED; direction: str = "down"; moving: bool = False

@dataclass
class Entity:
    id: str; name: str; x: float; y: float; entity_type: str
    sprite: Optional[pygame.Surface] = None; properties: dict = field(default_factory=dict); interacted: bool = False

# ── RPG Engine ────────────────────────────────────────

class RPGEngine:
    def __init__(self, screen_width=800, screen_height=600, title="RPG Game"):
        if not HAS_PYGAME: raise RuntimeError("pygame not installed")
        pygame.init()
        self.screen = pygame.display.set_mode((screen_width, screen_height))
        pygame.display.set_caption(title)
        self.clock = pygame.time.Clock(); self.running = False
        self.camera = Camera(width=screen_width, height=screen_height)
        self.player = Player(); self.entities: list[Entity] = []
        self.tile_width = self.tile_height = DEFAULT_TILE_SIZE
        self.map_width = self.map_height = 0
        self.map_layers: list[list[list[int]]] = []; self.collision_layer: list[list[int]] = []
        self.tile_colors = [(30,30,50),(74,158,74),(139,115,85),(107,107,107),(74,111,165),(196,164,74),(139,69,19)]
        self.on_interact: Optional[callable] = None

    def load_from_project(self, project_data: dict):
        rpg = project_data.get("rpg", {})
        if not rpg: return
        maps = rpg.get("maps", []); entities_data = rpg.get("entities", [])
        if maps: self.load_map(maps[0])
        self.entities = []
        for ed in entities_data:
            self.entities.append(Entity(
                id=ed.get("id",""), name=ed.get("name",""), x=ed.get("x",0)*self.tile_width,
                y=ed.get("y",0)*self.tile_height, entity_type=ed.get("type","npc"),
                properties=ed.get("properties",{})
            ))
        for e in self.entities:
            if e.entity_type == "player_spawn": self.player.x, self.player.y = e.x, e.y

    def load_map(self, map_data: dict):
        self.map_width = map_data.get("width", 20); self.map_height = map_data.get("height", 15)
        self.tile_width = map_data.get("tileWidth", DEFAULT_TILE_SIZE)
        self.tile_height = map_data.get("tileHeight", DEFAULT_TILE_SIZE)
        self.map_layers = []; self.collision_layer = []
        for layer in map_data.get("layers", []):
            data = layer.get("data", [])
            rows = []
            for y in range(self.map_height):
                row = data[y] if y < len(data) else [0]*self.map_width
                rows.append(row[:self.map_width] if len(row)>=self.map_width else row+[0]*(self.map_width-len(row)))
            self.map_layers.append(rows)
            if layer.get("isCollision"): self.collision_layer = rows

    def run(self):
        self.running = True
        while self.running:
            dt = self.clock.tick(60)/1000.0
            self._handle_events(); self._update(dt); self._render()
        pygame.quit()

    def stop(self): self.running = False

    def _handle_events(self):
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT: self.running = False
            elif ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_ESCAPE: self.running = False
                elif ev.key == pygame.K_e: self._try_interact()

    def _update(self, dt):
        keys = pygame.key.get_pressed()
        dx = dy = 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]: dx = -1; self.player.direction = "left"
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]: dx = 1; self.player.direction = "right"
        elif keys[pygame.K_UP] or keys[pygame.K_w]: dy = -1; self.player.direction = "up"
        elif keys[pygame.K_DOWN] or keys[pygame.K_s]: dy = 1; self.player.direction = "down"
        self.player.moving = dx != 0 or dy != 0
        if self.player.moving and dx and dy:
            import math; l = math.sqrt(2); dx/=l; dy/=l
        nx = self.player.x + dx*self.player.speed; ny = self.player.y + dy*self.player.speed
        if not self._collision(nx, ny): self.player.x, self.player.y = nx, ny
        self.camera.follow(self.player.x, self.player.y, self.map_width*self.tile_width, self.map_height*self.tile_height)

    def _collision(self, px, py):
        tx = int(px//self.tile_width); ty = int(py//self.tile_height)
        if tx<0 or ty<0 or ty>=len(self.collision_layer): return True
        if self.collision_layer and tx<len(self.collision_layer[ty]): return self.collision_layer[ty][tx] > 0
        return False

    def _try_interact(self):
        for e in self.entities:
            if e.entity_type not in ("npc","portal","trigger","item"): continue
            if ((self.player.x-e.x)**2+(self.player.y-e.y)**2)**0.5 <= NPC_INTERACT_RANGE:
                e.interacted = True
                if self.on_interact: self.on_interact(e)

    def _render(self):
        self.screen.fill((20,20,40))
        cx, cy = int(self.camera.x), int(self.camera.y)
        # Tiles
        for li, layer in enumerate(self.map_layers):
            for row in range(self.map_height):
                for col in range(self.map_width):
                    tid = layer[row][col] if row<len(layer) and col<len(layer[row]) else 0
                    if tid == 0: continue
                    px = col*self.tile_width - cx; py = row*self.tile_height - cy
                    if px<-self.tile_width or px>self.camera.width or py<-self.tile_height or py>self.camera.height: continue
                    c = self.tile_colors[min(tid, len(self.tile_colors)-1)]
                    pygame.draw.rect(self.screen, c, (px, py, self.tile_width, self.tile_height))
                    pygame.draw.rect(self.screen, (0,0,0,30), (px, py, self.tile_width, self.tile_height), 1)

        # Entities with placeholder
        for e in self.entities:
            ex, ey = int(e.x-cx), int(e.y-cy)
            if ex<-32 or ex>self.camera.width or ey<-32 or ey>self.camera.height: continue
            if e.entity_type == "player_spawn": continue
            self._draw_entity_placeholder(ex, ey, e)

        # Player
        px, py = int(self.player.x-cx), int(self.player.y-cy)
        prect = pygame.Rect(px-8, py-8, 16, 16)
        pygame.draw.rect(self.screen, (137,180,250), prect, border_radius=4)
        pygame.draw.rect(self.screen, (255,255,255), prect, 1)
        do = {"up":(0,-12),"down":(0,12),"left":(-12,0),"right":(12,0)}.get(self.player.direction,(0,12))
        pygame.draw.circle(self.screen, (255,255,255), (px+do[0], py+do[1]), 3)

        # HUD
        font = get_font(18)
        if font:
            fps = font.render(f"FPS: {int(self.clock.get_fps())}", True, (200,200,200))
            self.screen.blit(fps, (10,10))
            pos = font.render(f"Pos: ({int(self.player.x)},{int(self.player.y)})", True, (200,200,200))
            self.screen.blit(pos, (10,35))
            ctrl = font.render("WASD:移动 E:交互 ESC:退出", True, (150,150,150))
            self.screen.blit(ctrl, (10,60))
        pygame.display.flip()

    def _draw_entity_placeholder(self, x, y, entity):
        colors = {"npc": (166,227,161), "portal": (245,194,231), "trigger": (250,179,135), "item": (249,226,175)}
        color = colors.get(entity.entity_type, (200,200,200))
        r = pygame.Rect(x-12, y-12, 24, 24)
        pygame.draw.rect(self.screen, color, r, border_radius=4)
        pygame.draw.rect(self.screen, (255,255,255), r, 1)
        # Name below
        font = get_font(11)
        if font and entity.name:
            label = font.render(entity.name, True, (200,200,200))
            lx = x - label.get_width()//2
            ly = y + 14
            # Dark background for text
            bg = pygame.Rect(lx-2, ly, label.get_width()+4, label.get_height())
            pygame.draw.rect(self.screen, (0,0,0,150), bg)
            self.screen.blit(label, (lx, ly))


def run_rpg_from_project(project_path: str):
    with open(project_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    engine = RPGEngine(800, 600, data.get("meta",{}).get("name","RPG Game"))
    engine.load_from_project(data); engine.run()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1: run_rpg_from_project(sys.argv[1])
    else: print("Usage: python rpg_engine.py <project.json>")
