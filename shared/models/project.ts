// ── Shared Project Data Models ────────────────────────────
// Used by both frontend (TypeScript) and backend (Python)
// Python side mirrors this in backend/models/project.py

export type GameMode = 'rpg' | 'galgame'

export interface ProjectMeta {
  name: string
  mode: GameMode
  version: string
  createdAt: string
  updatedAt: string
  description: string
}

// ── Asset ─────────────────────────────────────────────────

export type AssetType = 'sprite' | 'tileset' | 'background' | 'portrait' | 'effect' | 'audio' | 'ui' | 'other'

export interface AssetRef {
  id: string
  name: string
  type: AssetType
  relativePath: string
  dataUrl?: string      // base64 data URL for embedded assets
  width: number
  height: number
  importedAt: string
}

// ── RPG Mode ──────────────────────────────────────────────

export interface TileLayer {
  id: string
  name: string
  data: number[][]     // [row][col] tile indices
  visible: boolean
  opacity: number
  isCollision: boolean
}

export interface RPGMap {
  id: string
  name: string
  width: number        // in tiles
  height: number
  tileWidth: number    // pixel size per tile (default 32)
  tileHeight: number
  tilesetId: string    // reference to AssetRef.id
  layers: TileLayer[]
}

export interface RPGEntity {
  id: string
  type: 'player_spawn' | 'npc' | 'portal' | 'trigger' | 'item'
  name: string
  spriteId: string
  x: number
  y: number
  properties: Record<string, unknown>
}

export interface RPGData {
  maps: RPGMap[]
  entities: RPGEntity[]
  currentMapId: string
}

// ── Galgame Mode ──────────────────────────────────────────

export interface DialogueNode {
  id: string
  speakerName: string
  speakerPortraitId: string
  portraitExpression: string   // e.g. 'neutral', 'happy', 'sad'
  text: string
  nextNodeId: string | null
  effects: string[]             // e.g. ['fadeIn', 'shake']
  sceneId?: string              // bound scene
  changeSceneId?: string        // switch to this scene after this dialogue
  transitionEffect?: string     // transition when changing scene (overrides scene default)
}

export interface BranchNode {
  id: string
  prompt: string
  choices: ChoiceOption[]
  sceneId?: string              // bound scene
}

export interface ChoiceOption {
  text: string
  nextNodeId: string
  condition?: string            // e.g. 'affection >= 10'
}

export interface SceneDef {
  id: string
  name: string
  backgroundType?: 'image' | 'video'  // background asset type (default: 'image')
  backgroundPath?: string             // file path to background image/video
  bgmPath?: string | null             // file path to BGM audio
  transition?: string                 // preset: 'none','fade','slideLeft','slideRight','zoomIn','zoomOut','dissolve'
  customTransition?: string           // custom transition name (takes priority over preset if set)
  dialogueNodeIds?: string[]          // dialogue/branch nodes bound to this scene
  characterIds?: string[]             // characters appearing in this scene
}

export interface CharacterDef {
  id: string
  name: string
  portraitPath: string               // default portrait (data URL or path)
  expressions: Record<string, string> // expression name → portrait path
  position?: 'left' | 'center' | 'right'  // screen position
}

export interface GalgameData {
  scenes: SceneDef[]
  dialogueNodes: DialogueNode[]
  branchNodes: BranchNode[]
  characters: CharacterDef[]
  variables: Record<string, number>  // e.g. { affection: 0, flags: {...} }
  startSceneId: string
  startNodeId: string
}

// ── UI Customization ──────────────────────────────────────

export interface UIColorTheme {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textMuted: string
  accent: string
  danger: string
}

export interface RPGHUDConfig {
  showHealth: boolean
  showMana: boolean
  showMinimap: boolean
  showInventory: boolean
  components: HUDComponent[]
}

export interface HUDComponent {
  id: string
  type: 'health' | 'mana' | 'minimap' | 'inventory' | 'quest'
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

export interface DialogueBoxConfig {
  position: 'bottom' | 'top' | 'fullscreen'
  backgroundStyle: 'solid' | 'gradient' | 'image'
  backgroundColor: string
  borderRadius: number
  fontSize: number
  textColor: string
  nameBoxColor: string
  typewriterSpeed: number       // ms per character
}

export interface MenuUIConfig {
  titleScreen: MenuScreenDef
  saveLoadScreen: MenuScreenDef
  settingsScreen: MenuScreenDef
}

export interface MenuScreenDef {
  backgroundId: string
  buttons: MenuButtonDef[]
}

export interface MenuButtonDef {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  style: 'primary' | 'secondary' | 'text'
}

export interface UICustomization {
  theme: UIColorTheme
  rpgHUD: RPGHUDConfig
  dialogueBox: DialogueBoxConfig
  menu: MenuUIConfig
  fontFamily: string
}

// ── Root Project ──────────────────────────────────────────

export interface GameProject {
  meta: ProjectMeta
  assets: AssetRef[]
  ui: UICustomization
  rpg: RPGData | null
  galgame: GalgameData | null
}
