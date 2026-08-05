import React, { useState, useRef, useCallback } from 'react'
import { useT } from '../../i18n'
import type { CharacterDef } from '@shared/models/project'
import { User, Plus, Trash2, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react'

interface Props {
  characters: CharacterDef[]
  scenes: { id: string; name: string; characterIds?: string[] }[]
  onCharactersChange: (c: CharacterDef[]) => void
  onSceneCharBind: (sceneId: string, charIds: string[]) => void
}

const CharacterManager: React.FC<Props> = ({ characters, scenes, onCharactersChange, onSceneCharBind }) => {
  const t = useT()
  const [selId, setSelId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [newExprName, setNewExprName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const exprInputRef = useRef<HTMLInputElement>(null)
  const pendingExprRef = useRef<string>('')
  const sel = characters.find(c => c.id === selId)

  const add = () => {
    const id = `c-${Date.now()}`
    onCharactersChange([...characters, { id, name: `角色 ${characters.length + 1}`, portraitPath: '', expressions: {} }])
    setSelId(id)
  }
  const upd = (id: string, p: Partial<CharacterDef>) => onCharactersChange(characters.map(c => c.id === id ? { ...c, ...p } : c))
  const del = (id: string) => { onCharactersChange(characters.filter(c => c.id !== id)); if (selId === id) setSelId(null) }

  const handlePortraitFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => { if (sel) upd(sel.id, { portraitPath: reader.result as string }) }
    reader.readAsDataURL(f)
    e.target.value = ''
  }, [sel])

  // add a new expression slot by name
  const addExpr = () => {
    if (!sel || !newExprName.trim()) return
    const name = newExprName.trim()
    if (name in sel.expressions) { setNewExprName(''); return }
    upd(sel.id, { expressions: { ...sel.expressions, [name]: '' } })
    setNewExprName('')
  }

  // open file picker for a specific expression
  const pickExprPortrait = (exprName: string) => {
    if (!sel) return
    pendingExprRef.current = exprName
    exprInputRef.current?.click()
  }

  // handle expression image file
  const handleExprFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; const exprName = pendingExprRef.current
    pendingExprRef.current = ''
    if (!f || !sel || !exprName) { e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = () => upd(sel.id, { expressions: { ...sel.expressions, [exprName]: reader.result as string } })
    reader.readAsDataURL(f)
    e.target.value = ''
  }, [sel])

  const delExpr = (exprName: string) => {
    if (!sel) return
    const { [exprName]: _, ...rest } = sel.expressions
    upd(sel.id, { expressions: rest })
  }

  const inp = "w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text focus:outline-none focus:border-accent"

  return (
    <div className={`flex flex-col border-t border-editor-border overflow-hidden ${collapsed ? '' : 'flex-1 min-h-0'}`}>
      {/* Header */}
      <div className="flex items-center px-2 py-1.5 bg-editor-surface cursor-pointer select-none shrink-0" onClick={() => setCollapsed(!collapsed)}>
        <span className="shrink-0 mr-1">{collapsed ? <ChevronRight size={12} className="text-editor-muted"/> : <ChevronDown size={12} className="text-editor-muted"/>}</span>
        <h3 className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider truncate">{t.galgame.characters || '角色'} ({characters.length})</h3>
      </div>

      {!collapsed && (
        <>
          {/* Character List */}
          <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">
            {characters.length === 0 ? (
              <div className="text-center py-4 text-editor-muted">
                <User size={20} className="mx-auto mb-1 opacity-50"/>
                <p className="text-[10px]">{t.galgame.noCharacters || '暂无角色'}</p>
              </div>
            ) : characters.map(c => (
              <div key={c.id} onClick={() => setSelId(c.id)}
                draggable onDragStart={e => { e.dataTransfer.setData('charId', c.id); e.dataTransfer.effectAllowed = 'link' }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation()
                  const assetUrl = e.dataTransfer.getData('assetDataUrl')
                  if (assetUrl) upd(c.id, { portraitPath: assetUrl })
                }}
                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${selId === c.id ? 'bg-accent/10 border border-accent/30' : 'hover:bg-editor-border border border-transparent'}`}>
                <div className="w-7 h-7 rounded bg-editor-bg flex items-center justify-center shrink-0 overflow-hidden">
                  {c.portraitPath ? <img src={c.portraitPath} className="w-full h-full object-cover" alt="" /> : <User size={14} className="text-editor-muted"/>}
                </div>
                <span className="text-[10px] truncate flex-1">{c.name}</span>
                <span className="text-[8px] text-editor-muted">{Object.keys(c.expressions).length} 表情</span>
                <button onClick={ev => { ev.stopPropagation(); del(c.id) }} className="p-0.5 rounded text-red-400 hover:bg-red-400/10 shrink-0"><Trash2 size={10}/></button>
              </div>
            ))}
            <button onClick={add} className="w-full mt-1 py-1 rounded text-[10px] text-accent hover:bg-accent/10 border border-dashed border-editor-border flex items-center justify-center gap-1">
              <Plus size={12}/> 添加角色
            </button>
          </div>

          {/* Character Properties */}
          {sel && (
            <div className="border-t border-editor-border p-2 space-y-1.5 max-h-48 overflow-y-auto">
              <div><label className="text-[8px] text-editor-muted block mb-0.5">名称</label><input type="text" value={sel.name} onChange={e => upd(sel.id, { name: e.target.value })} className={inp}/></div>

              <div>
                <label className="text-[8px] text-editor-muted block mb-0.5">默认立绘</label>
                <div className="flex items-center gap-1">
                  <div className="flex-1 flex items-center gap-1 bg-editor-bg border border-editor-border rounded px-1.5 h-6">
                    {sel.portraitPath ? <img src={sel.portraitPath} className="w-4 h-4 rounded object-cover" alt="" /> : <User size={10} className="text-editor-muted"/>}
                    <span className="text-[9px] text-editor-muted truncate flex-1">{sel.portraitPath ? '已设置' : '未设置'}</span>
                  </div>
                  <button onClick={() => inputRef.current?.click()} className="p-0.5 rounded text-editor-muted hover:text-editor-text"><FolderOpen size={10}/></button>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePortraitFile}/>
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="text-[8px] text-editor-muted block mb-0.5">屏幕位置</label>
                <div className="flex gap-1">
                  {(['left','center','right'] as const).map(pos => (
                    <button key={pos} onClick={() => upd(sel.id, { position: pos })}
                      className={`flex-1 py-0.5 text-[9px] rounded border ${sel.position===pos?'bg-accent/15 border-accent text-accent':'border-editor-border text-editor-muted'}`}>
                      {pos==='left'?'⬅ 左':pos==='center'?'⬆ 中':'➡ 右'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scale slider */}
              <div>
                <label className="text-[8px] text-editor-muted block mb-0.5">立绘大小: {Math.round((sel.scale ?? 0.33)*100)}%</label>
                <input type="range" min={10} max={100} value={Math.round((sel.scale ?? 0.33)*100)}
                  onChange={e => upd(sel.id, { scale: Number(e.target.value)/100 })}
                  className="w-full accent-accent"/>
              </div>

              {/* Live drag preview */}
              {sel.portraitPath && (
                <div>
                  <label className="text-[8px] text-editor-muted block mb-0.5">拖拽调整位置 (offsetX: {(sel.offsetX??0).toFixed(0)}%, offsetY: {(sel.offsetY??0).toFixed(0)}%)</label>
                  <div className="relative w-full aspect-video rounded bg-gradient-to-b from-[#1a1040] to-[#0a0a20] overflow-hidden border border-editor-border cursor-move"
                    onMouseDown={e => {
                      e.stopPropagation()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      const sx = e.clientX; const sy = e.clientY
                      const ox = sel.offsetX ?? 0; const oy = sel.offsetY ?? 0
                      const move = (ev: MouseEvent) => {
                        const dx = ((ev.clientX - sx) / rect.width) * 100
                        const dy = ((ev.clientY - sy) / rect.height) * 100
                        upd(sel.id, { offsetX: Math.max(-50, Math.min(50, ox + dx)), offsetY: Math.max(-50, Math.min(50, oy + dy)) })
                      }
                      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
                      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
                    }}
                  >
                    {(() => {
                      const scale = sel.scale ?? 0.33
                      const ox = sel.offsetX ?? 0
                      const oy = sel.offsetY ?? 0
                      const pos = sel.position ?? 'center'
                      // base left (% of container) + horizontal centering shift
                      const baseLeft = pos === 'left' ? 0 : pos === 'right' ? 100 : 50
                      const shift = pos === 'left' ? 0 : pos === 'right' ? -100 : -50
                      return (
                        <div className="absolute pointer-events-none"
                          style={{ left: `calc(${baseLeft}% + ${ox}%)`, top: `calc(68% + ${oy}%)`, transform: `translateX(${shift}%)` }}>
                          <img src={sel.portraitPath} className="object-contain" style={{ width: `${scale*100}%` }} alt=""/>
                        </div>
                      )
                    })()}
                    <span className="absolute bottom-0.5 right-1 text-[7px] text-white/30">拖拽定位（偏移为屏幕百分比）</span>
                  </div>
                </div>
              )}

              {/* Expressions */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[8px] text-editor-muted">表情 ({Object.keys(sel.expressions).length})</label>
                </div>
                {/* Add expression bar */}
                <div className="flex items-center gap-1 mb-1">
                  <input type="text" value={newExprName} onChange={e => setNewExprName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addExpr() }}
                    placeholder="表情名称，如 happy / angry..."
                    className="flex-1 px-1.5 py-0.5 bg-editor-bg border border-editor-border rounded text-[9px] text-editor-text focus:outline-none focus:border-accent"/>
                  <button onClick={addExpr} disabled={!newExprName.trim()} className="px-1.5 py-0.5 text-[9px] bg-accent/15 text-accent rounded hover:bg-accent/25 disabled:opacity-30">+ 添加</button>
                </div>
                <input ref={exprInputRef} type="file" accept="image/*" className="hidden" onChange={handleExprFile}/>
                {Object.keys(sel.expressions).length === 0 ? (
                  <p className="text-[8px] text-editor-muted">暂无自定义表情，输入名称点击添加</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(sel.expressions).map(([name, path]) => (
                      <div key={name} className="flex items-center gap-1 bg-editor-bg rounded px-1.5 py-0.5">
                        <span className="text-[9px] w-12 shrink-0 truncate">{name}</span>
                        <div className="flex-1 flex items-center gap-0.5">
                          {path ? <img src={path} className="w-4 h-4 rounded object-cover" alt=""/> : <div className="w-4 h-4 rounded bg-editor-border"/>}
                          <span className="text-[8px] text-editor-muted truncate">{path ? '已设置' : '未设置'}</span>
                        </div>
                        <button onClick={() => pickExprPortrait(name)} className="text-[8px] text-accent hover:underline shrink-0">设图</button>
                        <button onClick={() => delExpr(name)} className="text-[8px] text-red-400 hover:underline shrink-0">删</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scene binding - show which scenes this character appears in */}
              <div>
                <label className="text-[8px] text-editor-muted block mb-0.5">出场场景</label>
                <div className="flex flex-wrap gap-0.5">
                  {scenes.map(s => {
                    const inScene = s.characterIds?.includes(sel.id)
                    return (
                      <button key={s.id} onClick={() => {
                        const ids = s.characterIds || []
                        onSceneCharBind(s.id, inScene ? ids.filter(id => id !== sel.id) : [...ids, sel.id])
                      }}
                        className={`text-[8px] px-1.5 py-0.5 rounded border ${inScene ? 'bg-accent/15 border-accent/30 text-accent' : 'border-editor-border text-editor-muted hover:border-accent/30'}`}>
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  )
}

export default CharacterManager
