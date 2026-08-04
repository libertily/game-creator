import React, { useState } from 'react'
import type { MenuUIConfig, MenuScreenDef, MenuButtonDef } from '@shared/models/project'
import { Monitor, Plus, Trash2, Image, GripVertical } from 'lucide-react'

interface MenuEditorProps {
  menu: MenuUIConfig
  onChange: (menu: MenuUIConfig) => void
}

const screenLabels: { key: keyof MenuUIConfig; label: string }[] = [
  { key: 'titleScreen', label: '标题画面' },
  { key: 'saveLoadScreen', label: '存档/读档' },
  { key: 'settingsScreen', label: '设置' },
]

const MenuEditor: React.FC<MenuEditorProps> = ({ menu, onChange }) => {
  const [activeScreen, setActiveScreen] = useState<keyof MenuUIConfig>('titleScreen')
  const screen = menu[activeScreen]

  const updateScreen = (patch: Partial<MenuScreenDef>) => {
    onChange({ ...menu, [activeScreen]: { ...screen, ...patch } })
  }

  const addButton = () => {
    const btn: MenuButtonDef = {
      id: `btn-${Date.now()}`,
      text: '新按钮',
      x: 50,
      y: 50 + screen.buttons.length * 50,
      width: 160,
      height: 36,
      style: 'primary'
    }
    updateScreen({ buttons: [...screen.buttons, btn] })
  }

  const updateButton = (id: string, patch: Partial<MenuButtonDef>) => {
    updateScreen({ buttons: screen.buttons.map(b => b.id === id ? { ...b, ...patch } : b) })
  }

  const removeButton = (id: string) => {
    updateScreen({ buttons: screen.buttons.filter(b => b.id !== id) })
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-editor-text mb-1">菜单界面</h3>
        <p className="text-[11px] text-editor-muted">设计标题画面、存档读档和设置界面 — 拖拽按钮直接调整位置</p>
      </div>

      {/* Screen tabs */}
      <div className="flex gap-2">
        {screenLabels.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveScreen(s.key)}
            className={`px-3 py-1.5 rounded text-[11px] border transition-all ${
              activeScreen === s.key
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-editor-border text-editor-muted hover:text-editor-text'
            }`}
          >
            <Monitor size={12} className="inline mr-1" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Canvas Preview */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">预览（拖拽按钮可调位置）</label>
        <div className="relative w-full h-56 rounded-lg border border-editor-border bg-[#12121e] overflow-hidden">
          {/* Simulated background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1040] to-[#0a0a20]" />

          {/* Title text */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center">
            <p className="text-sm font-bold text-white/80">{screenLabels.find(s => s.key === activeScreen)?.label}</p>
          </div>

          {/* Buttons */}
          {screen.buttons.map(btn => (
            <div
              key={btn.id}
              className="absolute flex items-center justify-center rounded cursor-move text-xs font-medium select-none"
              style={{
                left: btn.x, top: btn.y, width: btn.width, height: btn.height,
                backgroundColor: btn.style === 'primary' ? 'rgba(137,180,250,0.8)'
                  : btn.style === 'secondary' ? 'rgba(166,227,161,0.7)'
                  : 'transparent',
                color: btn.style === 'text' ? 'rgba(255,255,255,0.8)' : '#1e1e2e',
                border: btn.style === 'text' ? 'none' : '1px solid transparent'
              }}
              onMouseDown={e => {
                e.stopPropagation()
                const rect = (e.currentTarget.parentElement!).getBoundingClientRect()
                const sx = e.clientX; const sy = e.clientY
                const ox = btn.x; const oy = btn.y
                const move = (ev: MouseEvent) => updateButton(btn.id, { x: ox + ev.clientX - sx, y: oy + ev.clientY - sy })
                const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
                document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
              }}
            >
              {btn.text}
            </div>
          ))}
        </div>
      </div>

      {/* Background selector */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-1 block">
          <Image size={12} className="inline mr-1" /> 背景图
        </label>
        <input
          type="text"
          value={screen.backgroundId}
          onChange={(e) => updateScreen({ backgroundId: e.target.value })}
          placeholder="素材ID，留空使用默认"
          className="w-full px-2 py-1.5 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text"
        />
      </div>

      {/* Buttons list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider">按钮 ({screen.buttons.length})</label>
          <button onClick={addButton}
            className="p-1 rounded text-accent hover:bg-accent/10 transition-colors">
            <Plus size={14} />
          </button>
        </div>

        {screen.buttons.length === 0 ? (
          <p className="text-[11px] text-editor-muted text-center py-4">暂无按钮，点击 + 添加</p>
        ) : (
          <div className="space-y-1.5">
            {screen.buttons.map(btn => (
              <div key={btn.id} className="p-2 bg-editor-bg rounded border border-editor-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <GripVertical size={12} className="text-editor-muted" />
                  <input
                    type="text" value={btn.text}
                    onChange={(e) => updateButton(btn.id, { text: e.target.value })}
                    className="flex-1 px-2 py-1 bg-editor-surface border border-editor-border rounded text-[11px] text-editor-text"
                  />
                  <select value={btn.style}
                    onChange={(e) => updateButton(btn.id, { style: e.target.value as MenuButtonDef['style'] })}
                    className="px-2 py-1 bg-editor-surface border border-editor-border rounded text-[11px] text-editor-text">
                    <option value="primary">主按钮</option>
                    <option value="secondary">次按钮</option>
                    <option value="text">文字</option>
                  </select>
                  <button onClick={() => removeButton(btn.id)}
                    className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex gap-2">
                  {([{f:'x',l:'X'},{f:'y',l:'Y'},{f:'width',l:'宽'},{f:'height',l:'高'}] as const).map(({f,l}) => (
                    <div key={f} className="flex-1">
                      <label className="text-[8px] text-editor-muted block">{l}</label>
                      <input
                        type="number" value={btn[f]}
                        onChange={(e) => updateButton(btn.id, { [f]: Number(e.target.value) })}
                        className="w-full px-1 py-0.5 bg-editor-surface border border-editor-border rounded text-[10px] text-editor-text text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MenuEditor
