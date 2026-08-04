import { create } from 'zustand'
import type { GameProject, GameMode, AssetRef, UIColorTheme } from '@shared/models/project'

const defaultTheme: UIColorTheme = {
  primary: '#89b4fa', secondary: '#a6e3a1', background: '#1e1e2e', surface: '#313244',
  text: '#cdd6f4', textMuted: '#6c7086', accent: '#f5c2e7', danger: '#f38ba8'
}

function createEmptyProject(mode: GameMode, name: string): GameProject {
  const now = new Date().toISOString()
  return {
    meta: { name, mode, version: '0.1.0', createdAt: now, updatedAt: now, description: '' },
    assets: [],
    ui: {
      theme: { ...defaultTheme },
      rpgHUD: { showHealth: true, showMana: true, showMinimap: true, showInventory: true, components: [] },
      dialogueBox: { position: 'bottom', backgroundStyle: 'solid', backgroundColor: '#000000aa', borderRadius: 8, fontSize: 18, textColor: '#ffffff', nameBoxColor: '#313244', typewriterSpeed: 30 },
      menu: { titleScreen: { backgroundId: '', buttons: [] }, saveLoadScreen: { backgroundId: '', buttons: [] }, settingsScreen: { backgroundId: '', buttons: [] } },
      fontFamily: 'sans-serif'
    },
    rpg: mode === 'rpg' ? { maps: [], entities: [], currentMapId: '' } : null,
    galgame: mode === 'galgame' ? { scenes: [], dialogueNodes: [], branchNodes: [], characters: [], variables: {}, startSceneId: '', startNodeId: '' } : null
  }
}

// ── Undo/Redo ──────────────────────────────────────────────

const MAX_HISTORY = 30
let undoStack: GameProject[] = []
let redoStack: GameProject[] = []

interface LLMModelConfig {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  model: string
  role: string  // 'general' | 'dialogue' | 'map' | 'theme' | 'code'
}

interface EditorState {
  project: GameProject | null
  projectPath: string | null
  isDirty: boolean
  activeMode: GameMode
  panels: { id: string; label: string; visible: boolean }[]
  aiPanelOpen: boolean
  selectedAssetId: string | null
  selectedMapId: string | null
  selectedEntityId: string | null
  selectedDialogueNodeId: string | null
  canUndo: boolean
  canRedo: boolean
  llmModels: LLMModelConfig[]

  newProject: (mode: GameMode, name: string) => void
  loadDemo: (data: GameProject) => void
  openProject: (data: GameProject, filePath: string) => void
  closeProject: () => void
  saveProject: () => void
  setMode: (mode: GameMode) => void
  togglePanel: (id: string) => void
  toggleAIPanel: () => void
  updateMeta: (partial: Partial<GameProject['meta']>) => void
  addAsset: (asset: AssetRef) => void
  removeAsset: (id: string) => void
  selectAsset: (id: string | null) => void
  setDirty: (dirty: boolean) => void
  getProjectJSON: () => string
  pushUndo: () => void
  undo: () => void
  redo: () => void
  setProjectData: (project: GameProject) => void
  addLLMModel: (m: LLMModelConfig) => void
  removeLLMModel: (id: string) => void
  updateLLMModel: (id: string, p: Partial<LLMModelConfig>) => void
}

function snapshot(s: EditorState): GameProject {
  return JSON.parse(JSON.stringify(s.project))
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null, projectPath: null, isDirty: false, activeMode: 'rpg',
  panels: [{ id: 'assets', label: 'Assets', visible: false }, { id: 'ui-editor', label: 'UI Editor', visible: false }],
  aiPanelOpen: false, selectedAssetId: null, selectedMapId: null, selectedEntityId: null, selectedDialogueNodeId: null,
  canUndo: false, canRedo: false,
  llmModels: [],

  newProject: (mode, name) => {
    const project = createEmptyProject(mode, name)
    undoStack = []; redoStack = []
    set({ project, projectPath: null, activeMode: mode, isDirty: true, canUndo: false, canRedo: false,
      selectedAssetId: null, selectedMapId: null, selectedEntityId: null, selectedDialogueNodeId: null })
  },

  loadDemo: (data) => {
    undoStack = []; redoStack = []
    // check localStorage for saved demo modifications
    const demoKey = `demo-${data.meta.name}`
    try {
      const saved = localStorage.getItem(demoKey)
      if (saved) { const parsed = JSON.parse(saved); if (parsed.meta?.name === data.meta.name) data = parsed }
    } catch { /* use original */ }
    set({ project: data, projectPath: null, activeMode: data.meta.mode, isDirty: true, canUndo: false, canRedo: false,
      selectedAssetId: null, selectedMapId: null, selectedEntityId: null, selectedDialogueNodeId: null })
  },

  openProject: (data, filePath) => {
    undoStack = []; redoStack = []
    set({ project: data, projectPath: filePath, activeMode: data.meta.mode, isDirty: false, canUndo: false, canRedo: false,
      selectedAssetId: null, selectedMapId: null, selectedEntityId: null, selectedDialogueNodeId: null })
  },

  closeProject: () => {
    undoStack = []; redoStack = []
    set({ project: null, projectPath: null, isDirty: false, canUndo: false, canRedo: false,
      selectedAssetId: null, selectedMapId: null, selectedEntityId: null, selectedDialogueNodeId: null, aiPanelOpen: false })
  },

  saveProject: () => set({ isDirty: false }),
  setMode: (mode) => set({ activeMode: mode }),

  togglePanel: (id) => set((s) => ({
    panels: s.panels.map(p => p.id === id ? { ...p, visible: !p.visible } : p)
  })),

  toggleAIPanel: () => set(s => ({ aiPanelOpen: !s.aiPanelOpen })),

  updateMeta: (partial) => set(s => {
    if (!s.project) return s
    const p = { ...s.project, meta: { ...s.project.meta, ...partial, updatedAt: new Date().toISOString() } }
    undoStack.push(snapshot(s)); redoStack = []
    return { project: p, isDirty: true, canUndo: true, canRedo: false }
  }),

  addAsset: (asset) => set(s => {
    if (!s.project) return s
    const p = { ...s.project, assets: [...s.project.assets, asset] }
    undoStack.push(snapshot(s)); redoStack = []
    return { project: p, isDirty: true, canUndo: true, canRedo: false }
  }),

  removeAsset: (id) => set(s => {
    if (!s.project) return s
    const p = { ...s.project, assets: s.project.assets.filter(a => a.id !== id) }
    undoStack.push(snapshot(s)); redoStack = []
    return { project: p, isDirty: true, selectedAssetId: s.selectedAssetId === id ? null : s.selectedAssetId, canUndo: true, canRedo: false }
  }),

  selectAsset: (id) => set({ selectedAssetId: id }),
  setDirty: (dirty) => set({ isDirty: dirty }),

  getProjectJSON: () => JSON.stringify(get().project, null, 2),

  pushUndo: () => set(s => {
    if (!s.project) return s
    undoStack.push(snapshot(s)); redoStack = []
    if (undoStack.length > MAX_HISTORY) undoStack.shift()
    return { canUndo: true, canRedo: false }
  }),

  undo: () => set(s => {
    if (undoStack.length === 0) return s
    redoStack.push(snapshot(s))
    const prev = undoStack.pop()!
    return { project: prev, canUndo: undoStack.length > 0, canRedo: true, isDirty: true }
  }),

  redo: () => set(s => {
    if (redoStack.length === 0) return s
    undoStack.push(snapshot(s))
    const next = redoStack.pop()!
    return { project: next, canUndo: true, canRedo: redoStack.length > 0, isDirty: true }
  }),

  setProjectData: (project) => set(s => {
    undoStack.push(snapshot(s)); redoStack = []
    if (undoStack.length > MAX_HISTORY) undoStack.shift()
    // auto-save demo projects to localStorage
    if (!s.projectPath && project.meta?.name) {
      try { localStorage.setItem(`demo-${project.meta.name}`, JSON.stringify(project)) } catch { /* quota exceeded */ }
    }
    return { project, canUndo: true, canRedo: false, isDirty: true }
  }),

  addLLMModel: (m) => set(s => ({ llmModels: [...s.llmModels, m] })),
  removeLLMModel: (id) => set(s => ({ llmModels: s.llmModels.filter(m => m.id !== id) })),
  updateLLMModel: (id, p) => set(s => ({ llmModels: s.llmModels.map(m => m.id === id ? { ...m, ...p } : m) })),
}))
