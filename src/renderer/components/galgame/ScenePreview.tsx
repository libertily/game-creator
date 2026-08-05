import React, { useRef } from 'react'
import type { SceneDef, CharacterDef, CharacterImageConfig } from '@shared/models/project'
import { X } from 'lucide-react'

const clamp = (v: number, lo = -50, hi = 50) => Math.max(lo, Math.min(hi, v))

// bottom anchor matching the game: portrait sits above the dialogue box (190/600 ≈ 31.7%)
const BOTTOM_ANCHOR = 31.7

interface Props {
  scene: SceneDef
  characters: CharacterDef[]
  onClose: () => void
  onCharConfig: (charId: string, key: string, patch: Partial<CharacterImageConfig>) => void
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

const ScenePreview: React.FC<Props> = ({ scene, characters, onClose, onCharConfig }) => {
  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ charId: string; sx: number; sy: number; ox: number; oy: number; w: number; h: number } | null>(null)
  const bound = characters.filter(c => (scene.characterIds || []).includes(c.id))
  const hasBg = !!scene.backgroundPath && !scene.backgroundPath.startsWith('#')

  const onDragStart = (e: React.MouseEvent, ch: CharacterDef) => {
    const stage = stageRef.current; if (!stage) return
    const cfg = charCfg(ch, '')
    const rect = stage.getBoundingClientRect()
    dragRef.current = { charId: ch.id, sx: e.clientX, sy: e.clientY, ox: cfg.offsetX || 0, oy: cfg.offsetY || 0, w: rect.width, h: rect.height }
    const move = (ev: MouseEvent) => {
      const d = dragRef.current; if (!d) return
      onCharConfig(d.charId, '', {
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
          <h3 className="text-sm font-semibold text-editor-text">场景预览 — {scene.name}</h3>
          <button onClick={onClose} className="p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border"><X size={16}/></button>
        </div>

        {/* Stage (4:3, matches the game's 800x600) */}
        <div ref={stageRef} className="relative w-full aspect-[4/3] rounded overflow-hidden border border-editor-border select-none"
          style={{ background: hasBg ? 'transparent' : 'linear-gradient(#1a1040, #0a0a20)' }}>
          {hasBg && <img src={scene.backgroundPath} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="" draggable={false}/>}
          {/* Bound characters (default portraits, draggable) */}
          {bound.map(ch => {
            const cfg = charCfg(ch, '')
            const scale = cfg.scale || 0.33
            const ox = cfg.offsetX || 0; const oy = cfg.offsetY || 0
            const pos = cfg.position || 'center'
            const baseLeft = pos === 'left' ? 0 : pos === 'right' ? 100 : 50
            const shift = pos === 'left' ? 0 : pos === 'right' ? -100 : -50
            if (!ch.portraitPath) return null
            return (
              <div key={ch.id}
                className="absolute cursor-move"
                style={{ left: `calc(${baseLeft}% + ${ox}%)`, bottom: `calc(${BOTTOM_ANCHOR}% - ${oy}%)`, transform: `translateX(${shift}%)` }}
                onMouseDown={e => onDragStart(e, ch)}>
                <img src={ch.portraitPath} className="object-contain pointer-events-none" style={{ width: `${scale*100}%` }} alt="" draggable={false}/>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] bg-black/60 text-white rounded px-1 whitespace-nowrap pointer-events-none">{ch.name}</span>
              </div>
            )
          })}
          {/* Dialogue box zone hint */}
          <div className="absolute left-1 right-1 bottom-0 h-[30%] rounded-t bg-black/30 border-t border-white/10 flex items-start justify-center pt-1 text-white/30 text-[10px] pointer-events-none">对话栏区域</div>
          {bound.length === 0 && <span className="absolute inset-0 flex items-center justify-center text-white/40 text-xs pointer-events-none">该场景尚未绑定角色，可在「出场角色」中添加</span>}
        </div>

        <p className="text-[10px] text-editor-muted mt-2 shrink-0">拖动角色可快速调整其在场景中的位置（保存到该角色「默认立绘」的位置设置）</p>
      </div>
    </div>
  )
}

export default ScenePreview
