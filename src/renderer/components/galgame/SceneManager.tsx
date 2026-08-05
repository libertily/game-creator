import React, { useState, useRef, useCallback } from 'react'
import { useT } from '../../i18n'
import type { SceneDef, DialogueNode, BranchNode, CharacterDef, AssetRef } from '@shared/models/project'
import { Image, Plus, Trash2, Music, Video, FolderOpen, Link2, Unlink, ChevronDown, ChevronRight, User, Library } from 'lucide-react'
import { useEditorStore } from '../../stores/editorStore'

const PRESET_TRANSITIONS = ['none','fade','slideLeft','slideRight','zoomIn','zoomOut','dissolve']

interface Props {
  scenes: SceneDef[]
  startSceneId: string
  dialogueNodes: DialogueNode[]
  branchNodes: BranchNode[]
  characters: CharacterDef[]
  onScenesChange: (s: SceneDef[]) => void
  onStartSceneChange: (id: string) => void
  onSceneCharBind: (sceneId: string, charIds: string[]) => void
  height?: number     // fixed height for split layout
  flexHeight?: boolean // take remaining space (default)
  collapsed?: boolean // controlled collapse (from split auto-collapse)
  onCollapseChange?: (c: boolean) => void
  onExpand?: () => void
}

// ── File Picker ────────────────────────────────────────────
const FilePicker: React.FC<{
  label: string; value: string; accept: string; icon: React.ReactNode
  onChange: (v: string) => void; placeholder: string
}> = ({ label, value, accept, icon, onChange, placeholder }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showAssets, setShowAssets] = useState(false)
  const isImage = accept.startsWith('image')
  const projectAssets = useEditorStore(s => s.project?.assets || [])

  const handleBrowse = useCallback(async () => {
    if ((window as any).electronAPI?.openFileDialog) {
      try {
        const result = await (window as any).electronAPI.openFileDialog({ filters: accept })
        if (result && result.length > 0) { onChange(result[0]); return }
      } catch { /* fall through */ }
    }
    inputRef.current?.click()
  }, [accept, onChange])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onerror = () => { e.target.value = ''; return }
    reader.onload = () => { onChange(reader.result as string); e.target.value = '' }
    reader.readAsDataURL(f)
  }, [onChange])

  const matchingAssets = projectAssets.filter(a => {
    if (isImage) return a.type === 'background' || a.type === 'sprite' || a.type === 'portrait'
    if (accept.startsWith('audio')) return a.type === 'audio'
    return false
  })

  const isDataUrl = value && value.startsWith('data:')
  const displayName = isDataUrl ? (isImage ? '✓ 图片已加载' : accept.startsWith('audio') ? '✓ 音频已加载' : '✓ 视频已加载') : (value ? value.replace(/^.*[\\/]/, '') : '')

  return (
    <div className="relative">
      <label className="text-[9px] text-editor-muted block mb-0.5">{label}</label>
      <div className="flex items-center gap-1">
        <div className="flex-1 flex items-center gap-1 bg-editor-bg border border-editor-border rounded px-1.5 h-7">
          {value && isImage
            ? <img src={value} className="w-6 h-6 rounded object-cover shrink-0 border border-editor-border" alt="" />
            : <span className="shrink-0">{icon}</span>
          }
          <span className="text-[9px] text-editor-muted truncate flex-1">{displayName || placeholder}</span>
        </div>
        <button onClick={handleBrowse} className="shrink-0 p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border" title="浏览文件"><FolderOpen size={12}/></button>
        {matchingAssets.length > 0 && (
          <button onClick={() => setShowAssets(!showAssets)} className={`shrink-0 p-1 rounded ${showAssets ? 'text-accent bg-accent/10' : 'text-editor-muted hover:text-editor-text hover:bg-editor-border'}`} title="从素材库选取"><Library size={12}/></button>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
      {value && <button onClick={() => onChange('')} className="text-[9px] text-red-400 hover:underline mt-0.5">清除</button>}
      {showAssets && matchingAssets.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-30 bg-editor-surface border border-editor-border rounded shadow-lg max-h-32 overflow-y-auto">
          {matchingAssets.map(a => (
            <button key={a.id} onClick={() => { onChange(a.dataUrl || ''); setShowAssets(false) }}
              className="w-full text-left px-2 py-1 text-[10px] hover:bg-accent/10 flex items-center gap-1.5">
              <span className="text-xs">{a.type==='audio'?'🎵':a.type==='portrait'?'👤':'🖼️'}</span>
              <span className="truncate flex-1">{a.name}</span>
              <span className="text-[8px] text-editor-muted">{a.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Scene Manager ──────────────────────────────────────────
const SceneManager: React.FC<Props> = ({ scenes, startSceneId, dialogueNodes, branchNodes, characters, onScenesChange, onStartSceneChange, onSceneCharBind, height, flexHeight = true, collapsed = false, onCollapseChange, onExpand }) => {
  const t = useT()
  const [selId, setSelId] = useState<string | null>(null)
  const [showBind, setShowBind] = useState(false)
  const sel = scenes.find(s => s.id === selId)

  const allNodes = [...dialogueNodes, ...branchNodes]
  const boundIds = sel?.dialogueNodeIds || []

  const add = () => {
    const id = `s-${Date.now()}`
    onScenesChange([...scenes, { id, name: `${t.galgame.scenes} ${scenes.length+1}`, backgroundType: 'image', backgroundPath: '', bgmPath: null, transition: 'fade', customTransition: '', dialogueNodeIds: [] }])
    setSelId(id)
  }
  const upd = (id: string, p: Partial<SceneDef>) => onScenesChange(scenes.map(s => s.id===id ? { ...s, ...p } : s))
  const del = (id: string) => { onScenesChange(scenes.filter(s => s.id!==id)); if (selId===id) setSelId(null) }

  const toggleBind = (nodeId: string) => {
    if (!sel) return
    const newIds = boundIds.includes(nodeId) ? boundIds.filter(id => id !== nodeId) : [...boundIds, nodeId]
    upd(sel.id, { dialogueNodeIds: newIds })
  }
  const unbindAll = () => { if (sel) upd(sel.id, { dialogueNodeIds: [] }) }

  const inp = "w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text focus:outline-none focus:border-accent"

  return (
    <div className={`flex flex-col overflow-hidden ${collapsed ? 'shrink-0' : (height ? 'min-h-0' : 'flex-1 min-h-0')}`}
      style={height ? { height } : collapsed ? { height: 30 } : undefined}>
      <div className="px-2 py-1.5 border-b border-editor-border flex items-center shrink-0 cursor-pointer select-none" onClick={() => onCollapseChange && onCollapseChange(!collapsed)}>
        <span className="shrink-0 mr-1">{collapsed ? <ChevronRight size={12} className="text-editor-muted"/> : <ChevronDown size={12} className="text-editor-muted"/>}</span>
        <h3 className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider truncate">{t.galgame.scenes} ({scenes.length})</h3>
        {collapsed && (
          <button onClick={ev => { ev.stopPropagation(); onExpand && onExpand() }}
            className="ml-auto flex items-center gap-0.5 text-[9px] text-accent hover:underline px-1.5 py-0.5 rounded hover:bg-accent/10">
            <ChevronDown size={10}/> 展开
          </button>
        )}
      </div>
      {!collapsed && (<>
      <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {scenes.length===0 ? (
          <div className="text-center py-8 text-editor-muted"><Image size={24} className="mx-auto mb-1 opacity-50"/><p className="text-[11px]">{t.galgame.noScenes}</p><button onClick={add} className="mt-1 text-[10px] text-accent hover:underline">{t.galgame.addScene}</button></div>
        ) : scenes.map(s => {
          const bc = s.dialogueNodeIds?.length || 0
          const transLabel = s.customTransition || s.transition || 'fade'
          return (
            <div key={s.id} onClick={()=>setSelId(s.id)}
              draggable onDragStart={e => { e.dataTransfer.setData('sceneId', s.id); e.dataTransfer.effectAllowed = 'link' }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'link' }}
              onDrop={e => {
                e.preventDefault(); e.stopPropagation()
                const charId = e.dataTransfer.getData('charId')
                const assetUrl = e.dataTransfer.getData('assetDataUrl')
                const assetType = e.dataTransfer.getData('assetType')
                if (charId && onSceneCharBind) {
                  const ids = s.characterIds || []
                  onSceneCharBind(s.id, ids.includes(charId) ? ids.filter(id => id !== charId) : [...ids, charId])
                } else if (assetUrl) {
                  // dropped an asset → set as background
                  upd(s.id, { backgroundPath: assetUrl, backgroundType: assetType === 'audio' ? 'image' : (s.backgroundType || 'image') })
                }
              }}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selId===s.id?'bg-accent/10 border border-accent/30':'hover:bg-editor-border border border-transparent'}`}>
              <div className="w-10 h-7 rounded bg-editor-bg flex items-center justify-center shrink-0 overflow-hidden border border-editor-border">
                {s.backgroundPath ? <img src={s.backgroundPath} className="w-full h-full object-cover" alt="" /> : <Image size={14} className="text-editor-muted"/>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] truncate">{s.name}</p>
                <p className="text-[9px] text-editor-muted">
                  {s.backgroundType==='video'?'🎬 ':''}{t.common[transLabel as keyof typeof t.common]||transLabel}{s.bgmPath?' · 🎵':''}{bc>0?` · 💬${bc}`:''}
                </p>
              </div>
              {s.id===startSceneId&&<span className="text-[10px] text-accent-alt shrink-0">⭐</span>}
              <button onClick={ev=>{ev.stopPropagation();del(s.id)}} className="p-0.5 rounded text-red-400 hover:bg-red-400/10"><Trash2 size={12}/></button>
            </div>
          )
        })}
        <button onClick={add} className="w-full mt-1 py-1 rounded text-[10px] text-accent hover:bg-accent/10 border border-dashed border-editor-border flex items-center justify-center gap-1">
          <Plus size={12}/> {t.galgame.addScene}
        </button>
      </div>
      {sel && (
        <div className="border-t border-editor-border p-3 space-y-2 overflow-y-auto shrink-0" style={{ maxHeight: '55%' }}>
          <h4 className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider">{t.rpg.properties}</h4>

          <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.rpg.name}</label><input type="text" value={sel.name} onChange={e=>upd(sel.id,{name:e.target.value})} className={inp}/></div>

          <div>
            <label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.backgroundType || '背景类型'}</label>
            <div className="flex gap-1">
              <button onClick={()=>upd(sel.id,{backgroundType:'image'})} className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] border ${sel.backgroundType!=='video'?'border-accent bg-accent/10 text-accent':'border-editor-border text-editor-muted'}`}><Image size={12}/> 图片</button>
              <button onClick={()=>upd(sel.id,{backgroundType:'video'})} className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] border ${sel.backgroundType==='video'?'border-accent bg-accent/10 text-accent':'border-editor-border text-editor-muted'}`}><Video size={12}/> 视频</button>
            </div>
          </div>

          <FilePicker label={t.galgame.background} value={sel.backgroundPath||''} accept={sel.backgroundType==='video'?'video/*':'image/*'}
            icon={sel.backgroundType==='video'?<Video size={12} className="text-editor-muted"/>:<Image size={12} className="text-editor-muted"/>}
            onChange={v=>upd(sel.id,{backgroundPath:v})} placeholder={sel.backgroundType==='video'?'选择视频文件...':'选择图片文件...'} />

          <FilePicker label={t.galgame.bgm} value={sel.bgmPath||''} accept="audio/*"
            icon={<Music size={12} className="text-editor-muted"/>} onChange={v=>upd(sel.id,{bgmPath:v||null})} placeholder="选择音频文件..." />

          <div>
            <label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.transitionPreset || '过渡预设'}</label>
            <select value={sel.transition||'fade'} onChange={e=>upd(sel.id,{transition:e.target.value})} className={inp}>
              {PRESET_TRANSITIONS.map(x=><option key={x} value={x}>{t.common[x as keyof typeof t.common]||x}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.customTransition || '自定义过渡'}</label>
            <input type="text" value={sel.customTransition||''} onChange={e=>upd(sel.id,{customTransition:e.target.value})} placeholder="如: ripple, pixelate..." className={inp}/>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] text-editor-muted">{t.galgame.boundNodes || '绑定节点'} ({boundIds.length})</label>
              <button onClick={()=>setShowBind(!showBind)} className={`text-[9px] flex items-center gap-0.5 ${showBind?'text-accent':'text-editor-muted'} hover:text-accent`}><Link2 size={10}/> {showBind?'收起':'管理'}</button>
            </div>
            {showBind && (
              <div className="bg-editor-bg rounded border border-editor-border p-2 max-h-32 overflow-y-auto space-y-0.5">
                {allNodes.length===0 ? (
                  <p className="text-[9px] text-editor-muted text-center py-2">暂无节点</p>
                ) : (
                  allNodes.map(n => {
                    const isB = boundIds.includes(n.id)
                    const label = 'speakerName' in n ? `💬 ${n.speakerName||'旁白'}: ${(n as DialogueNode).text?.slice(0,12)}...` : `🔀 ${(n as BranchNode).prompt?.slice(0,16)||'分支'}`
                    return (
                      <button key={n.id} onClick={()=>toggleBind(n.id)}
                        className={`w-full text-left text-[9px] px-1.5 py-1 rounded flex items-center gap-1 ${isB?'bg-accent/15 text-accent':'hover:bg-editor-border text-editor-muted'}`}>
                        {isB?<Link2 size={10}/>:<Unlink size={10}/>}<span className="truncate">{label}</span>
                      </button>
                    )
                  })
                )}
                {boundIds.length>0 && <button onClick={unbindAll} className="w-full text-[9px] text-red-400 hover:underline pt-1">解除全部绑定</button>}
              </div>
            )}
          </div>

          {sel.id===startSceneId
            ? <p className="text-[10px] text-accent-alt">⭐ {t.galgame.startScene}</p>
            : <button onClick={()=>onStartSceneChange(sel.id)} className="text-[10px] text-editor-muted hover:text-accent-alt">{t.galgame.setAsStart || '设为起始场景'}</button>}

          {/* Characters in this scene */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] text-editor-muted flex items-center gap-1"><User size={10}/> {t.galgame.sceneCharacters || '出场角色'}</label>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {characters.length === 0 ? (
                <p className="text-[8px] text-editor-muted">暂无角色，在角色栏创建</p>
              ) : (
                characters.map(c => {
                  const inScene = sel.characterIds?.includes(c.id)
                  return (
                    <button key={c.id} onClick={() => {
                      const ids = sel.characterIds || []
                      onSceneCharBind(sel.id, inScene ? ids.filter(id => id !== c.id) : [...ids, c.id])
                    }}
                      className={`text-[8px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${inScene ? 'bg-accent/15 border-accent/30 text-accent' : 'border-editor-border text-editor-muted hover:border-accent/30'}`}>
                      {c.portraitPath ? <img src={c.portraitPath} className="w-3 h-3 rounded object-cover"/> : <User size={8}/>}
                      {c.name}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      </>)}
    </div>
  )
}

export default SceneManager
