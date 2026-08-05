import React, { useState, useRef, useCallback } from 'react'
import { useT } from '../../i18n'
import type { CharacterDef, CharacterImageConfig } from '@shared/models/project'
import { User, Plus, Trash2, FolderOpen, ChevronDown, ChevronRight, Move, Image as ImgIcon } from 'lucide-react'

interface Props {
  characters: CharacterDef[]
  scenes: { id: string; name: string; characterIds?: string[] }[]
  onCharactersChange: (c: CharacterDef[]) => void
  onSceneCharBind: (sceneId: string, charIds: string[]) => void
}

const clamp = (v: number, lo = -50, hi = 50) => Math.max(lo, Math.min(hi, v))

const CharacterManager: React.FC<Props> = ({ characters, scenes, onCharactersChange, onSceneCharBind }) => {
  const t = useT()
  const [selId, setSelId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [newExprName, setNewExprName] = useState('')
  // which image we are currently positioning: '' = default portrait, otherwise expression name
  const [activeImg, setActiveImg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const exprInputRef = useRef<HTMLInputElement>(null)
  const pendingExprRef = useRef<string>('')
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; w: number; h: number } | null>(null)
  const sel = characters.find(c => c.id === selId)

  const add = () => {
    const id = `c-${Date.now()}`
    onCharactersChange([...characters, { id, name: `角色 ${characters.length + 1}`, portraitPath: '', expressions: {} }])
    setSelId(id); setActiveImg('')
  }
  const upd = (id: string, p: Partial<CharacterDef>) => onCharactersChange(characters.map(c => c.id === id ? { ...c, ...p } : c))
  const del = (id: string) => { onCharactersChange(characters.filter(c => c.id !== id)); if (selId === id) setSelId(null) }

  // image path for a key ('' = default portrait, otherwise expression name)
  const imgPath = (key: string): string => key === '' ? (sel?.portraitPath || '') : (sel?.expressions[key] || '')

  // effective config for a key (per-image config overrides legacy character-level values)
  const cfgOf = (key: string): CharacterImageConfig => {
    const legacy = { position: sel?.position, scale: sel?.scale, offsetX: sel?.offsetX, offsetY: sel?.offsetY }
    const per = (sel?.imageConfigs || {})[key] || {}
    return {
      position: per.position ?? legacy.position ?? 'center',
      scale: per.scale ?? legacy.scale ?? 0.33,
      offsetX: per.offsetX ?? legacy.offsetX ?? 0,
      offsetY: per.offsetY ?? legacy.offsetY ?? 0,
    }
  }

  const setCfg = (key: string, patch: Partial<CharacterImageConfig>) => {
    if (!sel) return
    const next = { ...cfgOf(key), ...patch }
    upd(sel.id, { imageConfigs: { ...(sel.imageConfigs || {}), [key]: next } })
  }

  const setImg = (key: string, path: string) => {
    if (!sel) return
    if (key === '') upd(sel.id, { portraitPath: path })
    else upd(sel.id, { expressions: { ...sel.expressions, [key]: path } })
  }

  const handleDefaultFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !sel) { e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = () => { setImg('', reader.result as string) }
    reader.readAsDataURL(f); e.target.value = ''
  }, [sel])

  // add a new expression slot by name
  const addExpr = () => {
    if (!sel || !newExprName.trim()) return
    const name = newExprName.trim()
    if (name in sel.expressions) { setNewExprName(''); return }
    upd(sel.id, { expressions: { ...sel.expressions, [name]: '' } })
    setActiveImg(name); setNewExprName('')
  }

  const pickExprPortrait = (exprName: string) => {
    if (!sel) return
    pendingExprRef.current = exprName
    exprInputRef.current?.click()
  }

  const handleExprFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; const exprName = pendingExprRef.current
    pendingExprRef.current = ''
    if (!f || !sel || !exprName) { e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = () => setImg(exprName, reader.result as string)
    reader.readAsDataURL(f); e.target.value = ''
  }, [sel])

  const delExpr = (exprName: string) => {
    if (!sel) return
    const { [exprName]: _, ...rest } = sel.expressions
    const cfg = { ...(sel.imageConfigs || {}) }; delete cfg[exprName]
    upd(sel.id, { expressions: rest, imageConfigs: Object.keys(cfg).length ? cfg : undefined })
    if (activeImg === exprName) setActiveImg('')
  }

  const onPreviewDragStart = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cfg = cfgOf(activeImg)
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: cfg.offsetX || 0, oy: cfg.offsetY || 0, w: rect.width, h: rect.height }
    const move = (ev: MouseEvent) => {
      const d = dragRef.current; if (!d) return
      setCfg(activeImg, {
        offsetX: clamp(d.ox + ((ev.clientX - d.sx) / d.w) * 100),
        offsetY: clamp(d.oy + ((ev.clientY - d.sy) / d.h) * 100),
      })
    }
    const up = () => { dragRef.current = null; document.body.style.cursor = ''; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.body.style.cursor = 'move'
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }

  const inp = "w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text focus:outline-none focus:border-accent"
  const exprNames = Object.keys(sel?.expressions || {})

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
            <div className="border-t border-editor-border p-2 space-y-2 max-h-[55%] overflow-y-auto shrink-0">
              <div><label className="text-[8px] text-editor-muted block mb-0.5">名称</label><input type="text" value={sel.name} onChange={e => upd(sel.id, { name: e.target.value })} className={inp}/></div>

              {/* ── 图片选择（点击切换要定位的图片） ── */}
              <div>
                <div className="flex items-center gap-1 mb-1"><ImgIcon size={10} className="text-accent-alt"/><label className="text-[9px] font-semibold text-editor-muted">图片</label></div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setActiveImg('')}
                    className={`flex items-center gap-1 px-1.5 py-1 rounded border text-[9px] ${activeImg===''?'bg-accent/15 border-accent text-accent':'border-editor-border text-editor-muted hover:border-accent/30'}`}>
                    {sel.portraitPath ? <img src={sel.portraitPath} className="w-4 h-5 rounded object-cover" alt=""/> : <User size={10}/>}
                    默认
                  </button>
                  {exprNames.map(name => (
                    <button key={name} onClick={() => setActiveImg(name)}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded border text-[9px] ${activeImg===name?'bg-accent/15 border-accent text-accent':'border-editor-border text-editor-muted hover:border-accent/30'}`}>
                      {sel.expressions[name] ? <img src={sel.expressions[name]} className="w-4 h-5 rounded object-cover" alt=""/> : <ImgIcon size={10}/>}
                      <span className="max-w-14 truncate">{name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <input type="text" value={newExprName} onChange={e => setNewExprName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addExpr() }}
                    placeholder="添加表情，如 happy..." className="flex-1 px-1.5 py-0.5 bg-editor-bg border border-editor-border rounded text-[9px] text-editor-text focus:outline-none focus:border-accent"/>
                  <button onClick={addExpr} disabled={!newExprName.trim()} className="px-1.5 py-0.5 text-[9px] bg-accent/15 text-accent rounded hover:bg-accent/25 disabled:opacity-30 shrink-0">+ 添加</button>
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleDefaultFile}/>
                <input ref={exprInputRef} type="file" accept="image/*" className="hidden" onChange={handleExprFile}/>
              </div>

              {/* ── 当前图片的位置与大小 ── */}
              {(() => {
                const key = activeImg
                const path = imgPath(key)
                const cfg = cfgOf(key)
                return (
                  <div className="p-1.5 bg-editor-bg rounded border border-editor-border/50 space-y-1.5">
                    <div className="flex items-center gap-1"><Move size={10} className="text-accent-alt"/><label className="text-[9px] font-semibold text-editor-muted">{key==='' ? '默认立绘' : `表情「${key}」`} · 位置</label></div>
                    {!path ? (
                      <p className="text-[8px] text-editor-muted">请先为这张图片选择图片文件：<button onClick={() => { if (key==='') inputRef.current?.click(); else pickExprPortrait(key) }} className="text-accent hover:underline">设图</button></p>
                    ) : (
                      <>
                        <div className="flex gap-1">
                          {(['left','center','right'] as const).map(pos => (
                            <button key={pos} onClick={() => setCfg(key, { position: pos })}
                              className={`flex-1 py-0.5 text-[9px] rounded border ${cfg.position===pos?'bg-accent/15 border-accent text-accent':'border-editor-border text-editor-muted'}`}>
                              {pos==='left'?'⬅ 左':pos==='center'?'⬆ 中':'➡ 右'}
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="text-[8px] text-editor-muted block mb-0.5">立绘大小: {Math.round((cfg.scale||0.33)*100)}%</label>
                          <input type="range" min={10} max={100} value={Math.round((cfg.scale||0.33)*100)}
                            onChange={e => setCfg(key, { scale: Number(e.target.value)/100 })}
                            className="w-full accent-accent"/>
                        </div>
                        <div>
                          <label className="text-[8px] text-editor-muted block mb-0.5">拖拽调整位置 (X: {(cfg.offsetX||0).toFixed(0)}%, Y: {(cfg.offsetY||0).toFixed(0)}%)</label>
                          {/* 4:3 stage matching the game (800x600); bottom anchor matches the dialogue-box gap (190/600 ≈ 31.7%) */}
                          <div className="relative w-full aspect-[4/3] rounded bg-gradient-to-b from-[#1a1040] to-[#0a0a20] overflow-hidden border border-editor-border cursor-move"
                            onMouseDown={onPreviewDragStart}>
                            {(() => {
                              const scale = cfg.scale || 0.33
                              const ox = cfg.offsetX || 0; const oy = cfg.offsetY || 0
                              const pos = cfg.position || 'center'
                              const baseLeft = pos === 'left' ? 0 : pos === 'right' ? 100 : 50
                              const shift = pos === 'left' ? 0 : pos === 'right' ? -100 : -50
                              return (
                                <div className="absolute pointer-events-none"
                                  style={{ left: `calc(${baseLeft}% + ${ox}%)`, bottom: `calc(31.7% - ${oy}%)`, transform: `translateX(${shift}%)` }}>
                                  <img src={path} className="object-contain" style={{ width: `${scale*100}%` }} alt=""/>
                                </div>
                              )
                            })()}
                            <span className="absolute bottom-0.5 right-1 text-[7px] text-white/30">拖拽定位（占屏幕百分比，与游戏一致）</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* ── 表情列表（设图/删除） ── */}
              {exprNames.length > 0 && (
                <div>
                  <label className="text-[9px] font-semibold text-editor-muted mb-1 block">表情列表 ({exprNames.length})</label>
                  <div className="space-y-1">
                    {exprNames.map(name => (
                      <div key={name} className="flex items-center gap-1 bg-editor-bg rounded px-1.5 py-0.5">
                        {sel.expressions[name] ? <img src={sel.expressions[name]} className="w-4 h-5 rounded object-cover" alt=""/> : <div className="w-4 h-5 rounded bg-editor-border"/>}
                        <span className="text-[9px] flex-1 truncate">{name}</span>
                        <button onClick={() => setActiveImg(name)} className="text-[8px] text-accent-alt hover:underline shrink-0">定位</button>
                        <button onClick={() => pickExprPortrait(name)} className="text-[8px] text-accent hover:underline shrink-0">设图</button>
                        <button onClick={() => delExpr(name)} className="text-[8px] text-red-400 hover:underline shrink-0">删</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 出场场景 ── */}
              <div>
                <label className="text-[8px] text-editor-muted block mb-0.5">出场场景</label>
                <div className="flex flex-wrap gap-0.5">
                  {scenes.length === 0 ? <p className="text-[8px] text-editor-muted">暂无场景</p> : scenes.map(s => {
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
