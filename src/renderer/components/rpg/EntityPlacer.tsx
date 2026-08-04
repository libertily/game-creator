import React, { useState } from 'react'
import { useT } from '../../i18n'
import type { RPGEntity } from '@shared/models/project'
import { MapPin, User, DoorOpen, Zap, Package, Trash2 } from 'lucide-react'

const entityTypeDefs = [
  { type: 'player_spawn' as const, icon: MapPin, color: '#89b4fa' },
  { type: 'npc' as const, icon: User, color: '#a6e3a1' },
  { type: 'portal' as const, icon: DoorOpen, color: '#f5c2e7' },
  { type: 'trigger' as const, icon: Zap, color: '#fab387' },
  { type: 'item' as const, icon: Package, color: '#f9e2af' },
]

interface Props { entities: RPGEntity[]; onEntitiesChange: (e: RPGEntity[]) => void }

const EntityPlacer: React.FC<Props> = ({ entities, onEntitiesChange }) => {
  const t = useT()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sel = entities.find(e => e.id === selectedId)

  const update = (id: string, patch: Partial<RPGEntity>) => onEntitiesChange(entities.map(e => e.id === id ? { ...e, ...patch } : e))
  const remove = (id: string) => { onEntitiesChange(entities.filter(e => e.id !== id)); if (selectedId === id) setSelectedId(null) }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-[11px] font-semibold text-editor-muted uppercase tracking-wider mb-1">{t.rpg.entities} ({entities.length})</h3>
        <p className="text-[10px] text-editor-muted/60">{t.rpg.entityHint}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {entities.length === 0 ? (
          <div className="text-center py-8 text-editor-muted"><Package size={24} className="mx-auto mb-1 opacity-50"/><p className="text-[11px]">{t.rpg.noEntities}</p></div>
        ) : (
          <div className="p-2 space-y-1">
            {entities.map(e => { const def = entityTypeDefs.find(d => d.type === e.type)
              return (
                <div key={e.id} onClick={() => setSelectedId(e.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedId===e.id?'bg-accent/10 border border-accent/30':'hover:bg-editor-border border border-transparent'}`}>
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{backgroundColor:def?.color+'30',color:def?.color}}>{def&&<def.icon size={14}/>}</div>
                  <div className="flex-1 min-w-0"><p className="text-[11px] truncate">{e.name}</p><p className="text-[10px] text-editor-muted">{t.rpg[e.type === 'player_spawn'?'playerSpawn':e.type]} · ({e.x}, {e.y})</p></div>
                  <button onClick={ev=>{ev.stopPropagation();remove(e.id)}} className="p-1 rounded text-red-400 hover:bg-red-400/10"><Trash2 size={12}/></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {sel && (
        <div className="border-t border-editor-border p-3">
          <h4 className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2">{t.rpg.properties}</h4>
          <div className="space-y-2">
            <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.rpg.name}</label><input type="text" value={sel.name} onChange={e=>update(sel.id,{name:e.target.value})} className="input-field"/></div>
            <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.rpg.type}</label><select value={sel.type} onChange={e=>update(sel.id,{type:e.target.value as RPGEntity['type']})} className="input-field">{entityTypeDefs.map(d=>(<option key={d.type} value={d.type}>{t.rpg[d.type==='player_spawn'?'playerSpawn':d.type]}</option>))}</select></div>
            <div className="flex gap-2"><div className="flex-1"><label className="text-[9px] text-editor-muted block mb-0.5">X</label><input type="number" value={sel.x} onChange={e=>update(sel.id,{x:parseInt(e.target.value)||0})} className="input-field"/></div><div className="flex-1"><label className="text-[9px] text-editor-muted block mb-0.5">Y</label><input type="number" value={sel.y} onChange={e=>update(sel.id,{y:parseInt(e.target.value)||0})} className="input-field"/></div></div>
            {sel.type==='npc'&&<div><label className="text-[9px] text-editor-muted block mb-0.5">{t.rpg.dialogue} (JSON)</label><textarea value={(sel.properties?.dialogue as string)||''} onChange={e=>update(sel.id,{properties:{...sel.properties,dialogue:e.target.value}})} rows={3} className="input-field resize-none font-mono" placeholder='["你好！","欢迎！"]'/></div>}
            {sel.type==='portal'&&<div><label className="text-[9px] text-editor-muted block mb-0.5">{t.rpg.targetMap}</label><input type="text" value={(sel.properties?.targetMapId as string)||''} onChange={e=>update(sel.id,{properties:{...sel.properties,targetMapId:e.target.value}})} className="input-field"/></div>}
          </div>
        </div>
      )}
    </div>
  )
}

export default EntityPlacer
