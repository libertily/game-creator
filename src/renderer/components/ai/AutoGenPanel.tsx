import React, { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT } from '../../i18n'
import { Wand2, Loader2, Check, ArrowRight, FileText } from 'lucide-react'
import type { GameProject } from '@shared/models/project'

const steps = ['analyze', 'structure', 'content', 'theme2', 'assemble']

const AutoGenPanel: React.FC = () => {
  const t = useT()
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<GameProject | null>(null)
  const [mode, setMode] = useState<'rpg' | 'galgame'>('rpg')
  const newProject = useEditorStore((s) => s.newProject)

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true); setCurrentStep(0); setCompletedSteps(new Set()); setResult(null)
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i)
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
      setCompletedSteps(prev => new Set([...prev, steps[i]]))
    }
    const now = new Date().toISOString()
    const generated: GameProject = {
      meta: { name: prompt.slice(0, 40) || 'Generated', mode, version: '0.1.0', createdAt: now, updatedAt: now, description: prompt },
      assets: [],
      ui: { theme: { primary: '#89b4fa', secondary: '#a6e3a1', background: '#1e1e2e', surface: '#313244', text: '#cdd6f4', textMuted: '#6c7086', accent: '#f5c2e7', danger: '#f38ba8' }, rpgHUD: { showHealth: true, showMana: true, showMinimap: true, showInventory: true, components: [] }, dialogueBox: { position: 'bottom', backgroundStyle: 'solid', backgroundColor: '#000000aa', borderRadius: 8, fontSize: 18, textColor: '#ffffff', nameBoxColor: '#313244', typewriterSpeed: 30 }, menu: { titleScreen: { backgroundId: '', buttons: [] }, saveLoadScreen: { backgroundId: '', buttons: [] }, settingsScreen: { backgroundId: '', buttons: [] } }, fontFamily: 'sans-serif' },
      rpg: mode === 'rpg' ? { maps: [{ id: 'map-1', name: 'Generated Map', width: 20, height: 15, tileWidth: 32, tileHeight: 32, tilesetId: '', layers: [{ id: 'l1', name: 'Ground', data: [], visible: true, opacity: 1, isCollision: false }, { id: 'l2', name: 'Collision', data: [], visible: true, opacity: 1, isCollision: true }] }], entities: [{ id: 'e1', type: 'player_spawn', name: 'Spawn', spriteId: '', x: 10, y: 7, properties: {} }, { id: 'e2', type: 'npc', name: 'Guide', spriteId: '', x: 5, y: 3, properties: { dialogue: '["Welcome!"]' } }], currentMapId: 'map-1' } : null,
      galgame: mode === 'galgame' ? { scenes: [{ id: 's1', name: 'Opening', backgroundType: 'image', backgroundPath: '', bgmPath: null, transition: 'fade', customTransition: '', dialogueNodeIds: [] }], dialogueNodes: [{ id: 'd1', speakerName: 'Narrator', speakerPortraitId: '', portraitExpression: 'neutral', text: 'Your story begins...', nextNodeId: 'd2', effects: ['fadeIn'] }, { id: 'd2', speakerName: 'Hero', speakerPortraitId: '', portraitExpression: 'happy', text: 'A new adventure!', nextNodeId: 'b1', effects: [] }], branchNodes: [{ id: 'b1', prompt: 'What now?', choices: [{ text: 'Forward', nextNodeId: '' }, { text: 'Look', nextNodeId: '' }] }], variables: {}, characters: [], startSceneId: 's1', startNodeId: 'd1' } : null
    }
    setResult(generated); setGenerating(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1"><Wand2 size={14} /> {t.ai.autoGen}</h3>
        <p className="text-[10px] text-editor-muted mt-0.5">{t.ai.autoDesc}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-1 block">{t.ai.gameType}</label>
          <div className="flex gap-2">
            {(['rpg', 'galgame'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded text-[11px] border transition-all capitalize ${mode === m ? 'border-accent bg-accent/10 text-accent' : 'border-editor-border text-editor-muted'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-1 block"><FileText size={12} className="inline mr-1" /> {t.ai.description}</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 'rpg' ? 'e.g. A fantasy RPG village with NPCs and a dungeon' : 'e.g. A school romance visual novel with branching choices'}
            rows={4} className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded text-xs text-editor-text placeholder:text-editor-muted/50 resize-none focus:outline-none focus:border-accent" disabled={generating} />
        </div>
        <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
          className="w-full py-2.5 bg-accent text-editor-bg text-sm font-semibold rounded-lg hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {generating ? <><Loader2 size={16} className="animate-spin" /> {t.ai.generating}</> : <><Wand2 size={16} /> {t.ai.generate}</>}
        </button>
        {generating && (
          <div className="space-y-1.5">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-2 text-[11px]">
                {completedSteps.has(step) ? <Check size={14} className="text-accent-alt" /> : i === currentStep ? <Loader2 size={14} className="text-accent animate-spin" /> : <div className="w-3.5 h-3.5 rounded-full border border-editor-border" />}
                <span className={completedSteps.has(step) ? 'text-accent-alt' : i === currentStep ? 'text-accent' : 'text-editor-muted'}>
                  {t.ai[step as keyof typeof t.ai] as string}
                </span>
              </div>
            ))}
          </div>
        )}
        {result && !generating && (
          <div className="p-3 rounded-lg border border-accent-alt/30 bg-accent-alt/5 space-y-2">
            <div className="flex items-center gap-2"><Check size={16} className="text-accent-alt" /><span className="text-sm font-medium text-accent-alt">{t.ai.complete}</span></div>
            <p className="text-[11px] text-editor-text"><strong>{result.meta.name}</strong> — {result.meta.mode.toUpperCase()}</p>
            <p className="text-[10px] text-editor-muted line-clamp-2">{result.meta.description}</p>
            <button onClick={() => { newProject(result.meta.mode, result.meta.name); useEditorStore.setState((s) => { if (!s.project) return s; return { project: { ...s.project, ...result, meta: { ...result.meta, createdAt: s.project.meta.createdAt } }, isDirty: true } }) }}
              className="w-full py-2 bg-accent-alt text-editor-bg text-xs font-semibold rounded hover:bg-accent-alt/80 flex items-center justify-center gap-1">
              <ArrowRight size={14} /> {t.ai.apply}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AutoGenPanel
