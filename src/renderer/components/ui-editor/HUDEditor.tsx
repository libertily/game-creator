import React from 'react'
import type { RPGHUDConfig, HUDComponent } from '@shared/models/project'
import { Heart, Zap, Map, Package, ClipboardList, Plus, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'

interface HUDEditorProps {
  hud: RPGHUDConfig
  onChange: (hud: RPGHUDConfig) => void
}

const componentTemplates: { type: HUDComponent['type']; label: string; icon: any }[] = [
  { type: 'health', label: '生命值', icon: Heart },
  { type: 'mana', label: '魔法值', icon: Zap },
  { type: 'minimap', label: '小地图', icon: Map },
  { type: 'inventory', label: '背包', icon: Package },
  { type: 'quest', label: '任务追踪', icon: ClipboardList },
]

const HUDEditor: React.FC<HUDEditorProps> = ({ hud, onChange }) => {
  const addComponent = (type: HUDComponent['type']) => {
    const comp: HUDComponent = {
      id: `hud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 10,
      y: 10 + hud.components.length * 60,
      width: 160,
      height: 40,
      visible: true
    }
    onChange({ ...hud, components: [...hud.components, comp] })
  }

  const updateComponent = (id: string, patch: Partial<HUDComponent>) => {
    onChange({
      ...hud,
      components: hud.components.map(c => c.id === id ? { ...c, ...patch } : c)
    })
  }

  const removeComponent = (id: string) => {
    onChange({ ...hud, components: hud.components.filter(c => c.id !== id) })
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-editor-text mb-1">RPG 界面布局</h3>
        <p className="text-[11px] text-editor-muted">配置游戏内的抬头显示（HUD）元素位置</p>
      </div>

      {/* Quick toggles */}
      <div className="flex gap-3 flex-wrap">
        {(['showHealth', 'showMana', 'showMinimap', 'showInventory'] as const).map(key => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hud[key]}
              onChange={(e) => onChange({ ...hud, [key]: e.target.checked })}
              className="accent-accent"
            />
              <span className="text-[11px] text-editor-text">{key==='showHealth'?'生命值':key==='showMana'?'魔法值':key==='showMinimap'?'小地图':'背包'}</span>
          </label>
        ))}
      </div>

      {/* HUD Preview Canvas */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">Preview</label>
        <div className="relative w-full h-48 rounded-lg border border-editor-border bg-[#12121e] overflow-hidden">
          {/* Game view area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-editor-muted/30">Game View</span>
          </div>
          {/* HUD Components */}
          {hud.components.filter(c => c.visible).map(comp => {
            const tmpl = componentTemplates.find(t => t.type === comp.type)
            return (
              <div
                key={comp.id}
                className="absolute border border-editor-border rounded bg-editor-surface/90 flex items-center gap-1.5 px-2"
                style={{ left: comp.x, top: comp.y, width: comp.width, height: comp.height }}
              >
                {tmpl && <tmpl.icon size={12} />}
                <span className="text-[9px] text-editor-text truncate">{tmpl?.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Components */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">添加组件</label>
        <div className="flex gap-1.5 flex-wrap">
          {componentTemplates.map(tmpl => (
            <button
              key={tmpl.type}
              onClick={() => addComponent(tmpl.type)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-editor-border text-[10px]
                         text-editor-muted hover:text-editor-text hover:border-accent transition-all"
            >
              <tmpl.icon size={12} /> {tmpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Component List */}
      {hud.components.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider block">已添加组件</label>
          {hud.components.map(comp => {
            const tmpl = componentTemplates.find(t => t.type === comp.type)
            return (
              <div key={comp.id} className="flex items-center gap-2 p-2 bg-editor-bg rounded border border-editor-border">
                <GripVertical size={12} className="text-editor-muted" />
                {tmpl && <tmpl.icon size={14} className="text-editor-muted" />}
                <span className="flex-1 text-[11px] text-editor-text">{tmpl?.label}</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={comp.x}
                    onChange={e => updateComponent(comp.id, { x: Number(e.target.value) })}
                    className="w-10 px-1 py-0.5 bg-editor-surface border border-editor-border rounded text-[10px] text-editor-text text-center" title="X" />
                  <input type="number" value={comp.y}
                    onChange={e => updateComponent(comp.id, { y: Number(e.target.value) })}
                    className="w-10 px-1 py-0.5 bg-editor-surface border border-editor-border rounded text-[10px] text-editor-text text-center" title="Y" />
                  <button onClick={() => updateComponent(comp.id, { visible: !comp.visible })}
                    className="p-1 text-editor-muted hover:text-editor-text">
                    {comp.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button onClick={() => removeComponent(comp.id)}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HUDEditor
