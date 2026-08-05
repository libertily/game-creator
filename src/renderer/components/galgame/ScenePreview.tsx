import React, { useRef } from 'react'
import type { SceneDef, CharacterDef, CharacterImageConfig, DialogueNode } from '@shared/models/project'
import { X } from 'lucide-react'

const clamp = (v: number, lo = -50, hi = 50) => Math.max(lo, Math.min(hi, v))

// bottom anchor matching the game: portrait sits above the dialogue box (190/600 ≈ 31.7%)
const BOTTOM_ANCHOR = 31.7

interface Props {
  scene: SceneDef | null
  node?: DialogueNode        // when provided, render the actual dialogue frame (display chars + expressions + dialogue box)
  characters: CharacterDef[]
  onClose: () => void
  onCharConfig?: (charId: string, key: string, patch: Partial<CharacterImageConfig>) => void
}

function charCfg(ch: CharacterDef, key: string): CharacterImageConfig {
  const legacy = { position: ch.position, scale: ch.scale, offsetX: ch.offsetX, offsetY: ch.offsetY }
  const per = (ch.imageConfigs || {})[key] || {}
  return {
    position: per.position ?? legacy.position ?? 'center',
    scale: per.scale ?? legacy.scale ?? 0.33,
    offsetX: per.offsetX ?? legacy.offsetX ?? 0,
    offsetY: per.offsetY ?? legacy.offsetY ?? 0,
  }
}

const ScenePreview: React.FC<Props> = ({ scene, node, characters, onClose, onCharConfig }) => {
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ charId: string; key: string; sx: number; sy: number; ox: number; oy: number; w: number; h: number } | null>(null)

  // characters to show: node's display characters (with expressions), else scene-bound characters (default portraits)
  const displayIds = (node?.displayCharacterIds && node.displayCharacterIds.length ? node.displayCharacterIds : (scene?.characterIds || [])) || []
  const stageChars = displayIds.map(id => {
    const ch = characters.find(c => c.id === id)
    if (!ch) return null
    const exprKey = node ? ((node.displayCharacterExpressions || {})[id] || '') : ''
    const img = (exprKey && ch.expressions[exprKey]) ? ch.expressions[exprKey] : (ch.portraitPath || '')
    const cfgKey = (exprKey && ch.expressions[exprKey]) ? exprKey : ''
    return { id, ch, img, cfgKey, cfg: charCfg(ch, cfgKey) }
  }).filter((x): x is NonNullable<typeof x> => !!x)

  const hasBg = !!scene?.backgroundPath && !scene.backgroundPath.startsWith('#')
  const speaker = node?.speakerName || ''
  const text = node?.text || ''

  const onDragStart = (e: React.MouseEvent, entry: NonNullable<typeof stageChars[0]>) => {
    const stage = stageRef.current; if (!stage) return
    const rect = stage.getBoundingClientRect()
    dragRef.current = { charId: entry.id, key: entry.cfgKey, sx: e.clientX, sy: e.clientY, ox: entry.cfg.offsetX || 0, oy: entry.cfg.offsetY || 0, w: rect.width, h: rect.height }
    const move = (ev: MouseEvent) => {
      const d = dragRef.current; if (!d) return
      onCharConfig?.(d.charId, d.key, {
        offsetX: clamp(d.ox + ((ev.clientX - d.sx) / d.w) * 100),
        offsetY: clamp(d.oy + ((ev.clientY - d.sy) / d.h) * 100),
      })
    }
    const up = () => { dragRef.current = null; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-editor-surface border border-editor-border rounded-lg shadow-2xl p-4 w-[92%] max-w-[780px] max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="text-sm font-semibold text-editor-text">{node ? `对话渲染预览 — ${node.id}` : `场景预览 — ${scene?.name || ''}`}</h3>
          <button onClick={onClose} className="p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border"><X size={16}/></button>
        </div>

        {/* Stage (4:3, matches the game's 800x600) */}
        <div ref={stageRef} className="relative w-full aspect-[4/3] rounded overflow-hidden border border-editor-border select-none"
          style={{ background: hasBg ? 'transparent' : 'linear-gradient(#1a1040, #0a0a20)' }}>
          {hasBg && <img src={scene!.backgroundPath} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="" draggable={false}/>}

          {/* On-stage characters */}
          {stageChars.map(entry => {
            if (!entry.img) return null
            const cfg = entry.cfg
            const scale = cfg.scale || 0.33
            const ox = cfg.offsetX || 0; const oy = cfg.offsetY || 0
            const pos = cfg.position || 'center'
            const baseLeft = pos === 'left' ? 0 : pos === 'right' ? 100 : 50
            const shift = pos === 'left' ? 0 : pos === 'right' ? -100 : -50
            return (
              <div key={entry.id}
                className="absolute cursor-move"
                style={{ left: `calc(${baseLeft}% + ${ox}%)`, bottom: `calc(${BOTTOM_ANCHOR}% - ${oy}%)`, width: `${scale*100}%`, transform: `translateX(${shift}%)` }}
                onMouseDown={e => onDragStart(e, entry)}>
                <img src={entry.img} className="w-full h-auto object-contain pointer-events-none" alt="" draggable={false}/>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] bg-black/60 text-white rounded px-1 whitespace-nowrap pointer-events-none">{entry.ch.name}</span>
              </div>
            )
          })}

          {/* Actual dialogue box when rendering a node */}
          {node ? (
            <div className="absolute left-2 right-2 bottom-0 h-[30%] flex flex-col justify-end">
              {speaker && <div className="mb-1 w-fit px-2 py-0.5 rounded text-[11px] text-[#cba6f7] bg-[#313244] border border-white/10 max-w-full truncate">{speaker}</div>}
              <div className="rounded px-3 py-2 text-white text-[12px] leading-snug bg-black/75 border border-white/10" style={{ minHeight: '70%' }}>{text || '（无文本）'}</div>
            </div>
          ) : (
            <div className="absolute left-1 right-1 bottom-0 h-[30%] rounded-t bg-black/30 border-t border-white/10 flex items-start justify-center pt-1 text-white/30 text-[10px] pointer-events-none">对话栏区域</div>
          )}

          {stageChars.length === 0 && <span className="absolute inset-0 flex items-center justify-center text-white/40 text-xs pointer-events-none">该节点/场景尚未设置显示角色</span>}
        </div>

        <p className="text-[10px] text-editor-muted mt-2 shrink-0">
          {node ? '这是该对话节点在游戏中的实际渲染效果（背景 + 显示角色与表情 + 对话栏）。拖动角色可调整位置。' : '该场景的实际渲染效果（背景 + 全部绑定角色）。拖动角色可调整位置。'}
        </p>
      </div>
    </div>
  )
}

export default ScenePreview
