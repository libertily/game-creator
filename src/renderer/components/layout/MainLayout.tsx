import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT, useLanguage } from '../../i18n'
import AssetBrowser from '../asset/AssetBrowser'
import AssetImporter from '../asset/AssetImporter'
import RPGEditor from '../rpg/RPGEditor'
import GalgameEditor from '../galgame/GalgameEditor'
import UIEditor from '../ui-editor/UIEditor'
import LLMConfig from '../ai/LLMConfig'
import AssistChatPanel from '../ai/AssistChatPanel'
import AutoGenPanel from '../ai/AutoGenPanel'
import {
  Gamepad2, MessageSquare, Palette, Image, Bot, Save, Play, Download,
  Settings, Sparkles, Wand2, Globe, Undo2, Redo2, LogOut, Loader2, X,
  PanelRightClose, PanelRightOpen, Minimize2, Maximize2, Package
} from 'lucide-react'

// Draggable panel hook — wider range for free resizing
function useResizable(initial: number, min: number, max: number) {
  const [width, setWidth] = useState(initial)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = startX.current - e.clientX
      setWidth(Math.min(max, Math.max(min, startW.current + delta)))
    }
    const onUp = () => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [min, max])

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  return { width, onDragStart }
}

// ── Collapsible panel wrapper ──────────────────────────────
const CollapsiblePanel: React.FC<{
  collapsed: boolean; onToggle: () => void; width: number; onDragStart: (e: React.MouseEvent) => void
  icon: React.ReactNode; label: string; children: React.ReactNode
}> = ({ collapsed, onToggle, width, onDragStart, icon, label, children }) => {
  const pBase = "shrink-0 overflow-hidden border-l border-editor-border bg-editor-surface relative"
  const dragHandle = "absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/50 z-10 transition-colors"

  if (collapsed) {
    return (
      <div className="w-8 bg-editor-surface border-l border-editor-border shrink-0 flex flex-col items-center py-2 gap-3">
        <button onClick={onToggle} className="p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border" title="展开">
          <PanelRightOpen size={14}/>
        </button>
        <div className="w-5 h-px bg-editor-border"/>
        <button onClick={onToggle} className="p-1 rounded text-editor-muted hover:text-accent" title={label}>
          {icon}
        </button>
      </div>
    )
  }
  return (
    <aside className={pBase} style={{ width }}>
      <div className={dragHandle} onMouseDown={onDragStart} />
      <button onClick={onToggle}
        className="absolute right-1 top-0.5 w-5 h-5 rounded bg-editor-bg border border-editor-border flex items-center justify-center text-editor-muted hover:text-editor-text hover:border-accent/40 z-20"
        title="折叠面板">
        <PanelRightClose size={10}/>
      </button>
      <div className="pt-6 h-full overflow-hidden">{children}</div>
    </aside>
  )
}

const MainLayout: React.FC = () => {
  const t = useT()
  const { lang, setLanguage } = useLanguage()
  const {
    project, activeMode, setMode, aiPanelOpen, toggleAIPanel, panels, togglePanel,
    canUndo, canRedo, undo, redo, closeProject, isDirty
  } = useEditorStore()

  const [showImporter, setShowImporter] = useState(false)
  const [aiMode, setAiMode] = useState<'config' | 'assist' | 'auto'>('assist')
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'launching' | 'running' | 'error'>('idle')
  const [previewMsg, setPreviewMsg] = useState('')
  const [assetCollapsed, setAssetCollapsed] = useState(false)
  const [uiCollapsed, setUiCollapsed] = useState(false)
  const [aiCollapsed, setAiCollapsed] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [exportMsg, setExportMsg] = useState('')
  const assetPanelVisible = panels.find(p => p.id === 'assets')?.visible ?? false
  const uiPanelVisible = panels.find(p => p.id === 'ui-editor')?.visible ?? false

  const assetW = useResizable(240, 80, 800)
  const importerW = useResizable(280, 120, 800)
  const uiW = useResizable(300, 100, 800)
  const aiW = useResizable(340, 120, 800)

  if (!project) return null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'F5') { e.preventDefault(); handlePreview() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const handleSave = () => {
    const json = useEditorStore.getState().getProjectJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${project.meta.name.replace(/\s+/g, '_')}.gcproj`
    a.click(); URL.revokeObjectURL(a.href)
    useEditorStore.getState().saveProject()
  }

  const handleExport = async () => {
    const json = useEditorStore.getState().getProjectJSON()
    // try backend export → standalone runnable game ZIP
    try {
      let port = 18721
      try { if (window.electronAPI) port = await window.electronAPI.getPythonPort() } catch { /* default */ }
      const res = await fetch(`http://127.0.0.1:${port}/api/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: JSON.parse(json), outputType: 'zip' })
      })
      if (res.ok) {
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob); a.download = `${project.meta.name.replace(/\s+/g, '_')}_game.zip`
        a.click(); URL.revokeObjectURL(a.href)
        return
      }
    } catch { /* backend unavailable → fall back to JSON */ }
    // fallback: plain JSON export
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${project.meta.name.replace(/\s+/g, '_')}_export.json`
    a.click(); URL.revokeObjectURL(a.href)
  }

  // Export as a single-file EXE (art/music bundled, built via PyInstaller)
  const [exeBusy, setExeBusy] = useState(false)
  const handleExportExe = async () => {
    const json = useEditorStore.getState().getProjectJSON()
    setExeBusy(true)
    setExportMsg(lang === 'zh' ? '⏳ 正在打包 EXE（美术/音乐资源已内嵌），可能需要 1-3 分钟...' : '⏳ Building EXE (assets embedded), may take 1-3 min...')
    try {
      let port = 18721
      try { if (window.electronAPI) port = await window.electronAPI.getPythonPort() } catch { /* default */ }
      const res = await fetch(`http://127.0.0.1:${port}/api/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: JSON.parse(json), outputType: 'exe' })
      })
      if (res.ok) {
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob); a.download = `${project.meta.name.replace(/\s+/g, '_')}_exe.zip`
        a.click(); URL.revokeObjectURL(a.href)
        setExportMsg(lang === 'zh' ? '✅ EXE 已生成！解压后双击 .exe 即可独立运行（无需安装 Python）' : '✅ EXE ready! Unzip and double-click the .exe (no Python needed)')
      } else {
        const err = await res.text().catch(() => '')
        setExportMsg(lang === 'zh' ? `❌ 打包失败：${err.slice(0, 200)}` : `❌ Failed: ${err.slice(0, 200)}`)
      }
    } catch (e: any) {
      setExportMsg(lang === 'zh' ? `❌ 后端未启动或打包出错：${e?.message || e}` : `❌ Backend error: ${e?.message || e}`)
    }
    setExeBusy(false)
    setTimeout(() => setExportMsg(''), 12000)
  }

  const handlePreview = async () => {
    setPreviewStatus('launching')
    setPreviewMsg(lang === 'zh' ? '正在启动游戏引擎...' : 'Launching...')
    try {
      let port = 18721
      try { if (window.electronAPI) port = await window.electronAPI.getPythonPort() } catch { /* use default */ }
      const json = useEditorStore.getState().getProjectJSON()
      const res = await fetch(`http://127.0.0.1:${port}/api/engine/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json
      })
      const data = await res.json()
      if (data.status === 'preview_started') {
        setPreviewStatus('running')
        setPreviewMsg(lang === 'zh' ? '🎮 已启动！在 Pygame 窗口中试玩。' : '🎮 Launched! Play in Pygame window.')
      } else {
        setPreviewStatus('error')
        setPreviewMsg(lang === 'zh' ? `❌ ${data.message || '未知错误'}` : `❌ ${data.message || 'Unknown error'}`)
      }
    } catch {
      setPreviewStatus('error')
      setPreviewMsg(lang === 'zh' ? '❌ 后端未启动。请在新终端执行:\ncd backend && python main.py' : '❌ Backend not running. Run:\ncd backend && python main.py')
    }
    setTimeout(() => setPreviewStatus('idle'), 8000)
  }

  const handleCloseProject = () => {
    if (isDirty) { setShowExitDialog(true); return }
    closeProject()
  }
  const handleExitSave = () => { handleSave(); closeProject(); setShowExitDialog(false) }
  const handleExitDiscard = () => { closeProject(); setShowExitDialog(false) }

  const pBase = "shrink-0 overflow-hidden border-l border-editor-border bg-editor-surface relative"
  const dragHandle = "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 z-10"

  return (
    <div className="flex flex-col h-full bg-editor-bg">
      <header className="flex items-center h-10 px-3 bg-editor-surface border-b border-editor-border shrink-0 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className="text-sm font-semibold text-accent mr-4">{t.app.title}</span>
        <span className="text-xs text-editor-muted mr-4">—</span>
        <span className="text-xs text-editor-text">{project.meta.name}</span>
        <span className="text-xs text-editor-muted ml-2">({project.meta.mode.toUpperCase()})</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button className="btn-icon" onClick={undo} disabled={!canUndo} title="Ctrl+Z"><Undo2 size={16} className={canUndo ? '' : 'opacity-30'} /></button>
          <button className="btn-icon" onClick={redo} disabled={!canRedo} title="Ctrl+Y"><Redo2 size={16} className={canRedo ? '' : 'opacity-30'} /></button>
          <div className="w-px h-4 bg-editor-border mx-1" />
          <button className="btn-icon flex items-center gap-0.5" onClick={() => setLanguage(lang === 'zh' ? 'en' : 'zh')}><Globe size={16} /><span className="text-[9px]">{lang === 'zh' ? '中' : 'EN'}</span></button>
          <button className="btn-icon" onClick={handleSave} title={t.project.save}><Save size={16} /></button>
          <button className="btn-icon" onClick={handleExport} title={t.project.export}><Download size={16} /></button>
          <button className="btn-icon text-accent-alt hover:text-accent-alt hover:bg-accent-alt/15" onClick={handleExportExe} disabled={exeBusy} title={lang === 'zh' ? '导出为 EXE（单文件独立运行，含美术/音乐）' : 'Export as EXE (standalone, assets included)'}>
            {exeBusy ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} className={exeBusy ? 'opacity-30' : ''} />}
          </button>
          <div className="w-px h-4 bg-editor-border mx-1" />
          <button className="btn-icon text-accent-alt hover:text-accent-alt hover:bg-accent-alt/15" onClick={handlePreview} title="F5">
            {previewStatus === 'launching' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          </button>
          <button className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={handleCloseProject}><LogOut size={16} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-12 bg-editor-surface border-r border-editor-border flex flex-col items-center py-2 gap-1 shrink-0">
          {[{ id: 'rpg' as const, icon: Gamepad2, title: lang==='zh'?'RPG编辑器':'RPG Editor' }, { id: 'galgame' as const, icon: MessageSquare, title: lang==='zh'?'Galgame编辑器':'Galgame Editor' }].map(tab => (
            <button key={tab.id} onClick={() => setMode(tab.id)} title={tab.title} className={`sidebar-icon ${activeMode === tab.id ? 'sidebar-icon-active' : ''}`}><tab.icon size={20} /></button>
          ))}
          <div className="w-8 h-px bg-editor-border my-2" />
          {[{ id: 'assets', icon: Image, title: lang==='zh'?'素材库':'Assets' }, { id: 'ui-editor', icon: Palette, title: lang==='zh'?'UI编辑器':'UI Editor' }, { id: 'ai', icon: Bot, title: lang==='zh'?'AI助手':'AI' }].map(tool => (
            <button key={tool.id} onClick={() => {
              // opening one tool panel closes the others to avoid overlap
              if (tool.id === 'ai') { toggleAIPanel(); useEditorStore.setState(s => ({ panels: s.panels.map(p => p.id !== 'ai' ? { ...p, visible: false } : p) })) }
              else { togglePanel(tool.id); useEditorStore.setState(s => ({ aiPanelOpen: false })) }
            }} title={tool.title}
              className={`sidebar-icon ${(tool.id === 'ai' && aiPanelOpen) || panels.find(p => p.id === tool.id && p.visible) ? 'sidebar-icon-active' : ''}`}><tool.icon size={20} /></button>
          ))}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center h-8 px-3 bg-editor-bg border-b border-editor-border gap-2 shrink-0">
            <span className="text-xs font-medium text-editor-muted uppercase tracking-wider">{project.meta.name}</span>
          </div>
          {activeMode === 'rpg' ? <RPGEditor /> : <GalgameEditor />}
        </main>

        {/* Right panels — all collapsible + freely resizable */}
        {showImporter ? (
          <CollapsiblePanel collapsed={false} onToggle={() => setShowImporter(false)} width={importerW.width} onDragStart={importerW.onDragStart}
            icon={<Image size={14}/>} label="导入">
            <AssetImporter onClose={() => setShowImporter(false)} />
          </CollapsiblePanel>
        ) : uiPanelVisible ? (
          <CollapsiblePanel collapsed={uiCollapsed} onToggle={() => setUiCollapsed(!uiCollapsed)} width={uiW.width} onDragStart={uiW.onDragStart}
            icon={<Palette size={14}/>} label={t.editor.ui}>
            <UIEditor />
          </CollapsiblePanel>
        ) : assetPanelVisible ? (
          <CollapsiblePanel collapsed={assetCollapsed} onToggle={() => setAssetCollapsed(!assetCollapsed)} width={assetW.width} onDragStart={assetW.onDragStart}
            icon={<Image size={14}/>} label={t.editor.assets}>
            <AssetBrowser onImportClick={() => setShowImporter(true)} />
          </CollapsiblePanel>
        ) : null}

        {aiPanelOpen && (
          <CollapsiblePanel collapsed={aiCollapsed} onToggle={() => setAiCollapsed(!aiCollapsed)} width={aiW.width} onDragStart={aiW.onDragStart}
            icon={<Bot size={14}/>} label={t.editor.ai}>
            <div className="flex border-b border-editor-border">
              {([{ id: 'assist' as const, label: t.ai.assisted, icon: Sparkles }, { id: 'auto' as const, label: t.ai.auto, icon: Wand2 }, { id: 'config' as const, label: t.ai.config, icon: Settings }]).map(tab => (
                <button key={tab.id} onClick={() => setAiMode(tab.id)} className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] border-b-2 transition-colors ${aiMode === tab.id ? 'border-accent text-accent' : 'border-transparent text-editor-muted hover:text-editor-text'}`}><tab.icon size={12} /> {tab.label}</button>
              ))}
            </div>
            {aiMode === 'config' && <LLMConfig onSave={() => setAiMode('assist')} onCancel={() => setAiMode('assist')} />}
            {aiMode === 'assist' && <AssistChatPanel />}
            {aiMode === 'auto' && <AutoGenPanel />}
          </CollapsiblePanel>
        )}
      </div>

      {previewStatus !== 'idle' && (
        <div className={`fixed bottom-8 right-4 px-4 py-2 rounded-lg shadow-lg text-xs z-50 flex items-center gap-2 ${
          previewStatus === 'launching' ? 'bg-accent/20 text-accent border border-accent/30' :
          previewStatus === 'running' ? 'bg-accent-alt/20 text-accent-alt border border-accent-alt/30' :
          'bg-red-400/20 text-red-400 border border-red-400/30'
        }`}>
          {previewStatus === 'launching' && <Loader2 size={14} className="animate-spin" />}
          <span className="whitespace-pre-wrap">{previewMsg}</span>
          <button onClick={() => setPreviewStatus('idle')} className="ml-2 hover:opacity-70"><X size={12} /></button>
        </div>
      )}

      {/* Exit confirmation dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setShowExitDialog(false)}>
          <div className="bg-editor-surface border border-editor-border rounded-lg shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-editor-text mb-2">{lang === 'zh' ? '退出前保存？' : 'Save before exit?'}</h3>
            <p className="text-[11px] text-editor-muted mb-4">{lang === 'zh' ? '当前项目有未保存的更改。' : 'You have unsaved changes.'}</p>
            <div className="flex gap-2">
              <button onClick={handleExitSave} className="flex-1 py-2 bg-accent text-editor-bg text-xs font-semibold rounded hover:bg-accent/80">
                {lang === 'zh' ? '💾 保存并退出' : '💾 Save & Exit'}
              </button>
              <button onClick={handleExitDiscard} className="flex-1 py-2 bg-editor-bg border border-editor-border text-editor-text text-xs rounded hover:bg-editor-border">
                {lang === 'zh' ? '不保存' : 'Discard'}
              </button>
            </div>
            <button onClick={() => setShowExitDialog(false)} className="w-full mt-2 py-1.5 text-[10px] text-editor-muted hover:text-editor-text rounded">
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <footer className="flex items-center h-6 px-3 bg-editor-surface border-t border-editor-border text-[10px] text-editor-muted shrink-0 gap-2">
        <span title={lang==='zh'?'当前编辑模式':'Edit mode'}>{activeMode.toUpperCase()}</span>
        <span className="text-editor-muted/30">|</span>
        <span title={lang==='zh'?'素材数量':'Assets'}>{t.status.assets}: {project.assets.length}</span>
        <span className="text-editor-muted/30">|</span>
        <span title={lang==='zh'?'节点/实体数量':'Nodes/Entities'}>{t.status.nodes}: {(project.galgame?.dialogueNodes.length||0)+(project.galgame?.branchNodes.length||0)||project.rpg?.entities.length||0}</span>
        <span className="text-editor-muted/30">|</span>
        <span>{(project.galgame?.scenes.length||0)>0?`${lang==='zh'?'场景':'Scenes'}:${project.galgame?.scenes.length}`:`${lang==='zh'?'地图':'Maps'}:${project.rpg?.maps.length||0}`}</span>
        {isDirty && <span className="text-accent-alt">● {lang==='zh'?'未保存':'Unsaved'}</span>}
        {exportMsg && <span className={`truncate ${exportMsg.startsWith('❌') ? 'text-red-400' : exportMsg.startsWith('✅') ? 'text-accent-alt' : 'text-accent'}`}>{exportMsg}</span>}
        <span className="flex-1" /><span className="text-editor-muted/50" title={lang==='zh'?'按F5启动Pygame预览':'Press F5 for Pygame preview'}>F5 {lang==='zh'?'试运行':'Preview'}</span>
      </footer>
    </div>
  )
}

export default MainLayout
