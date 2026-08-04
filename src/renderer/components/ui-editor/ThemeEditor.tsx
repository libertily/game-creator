import React from 'react'
import type { UIColorTheme } from '@shared/models/project'

interface ThemeEditorProps {
  theme: UIColorTheme
  onChange: (theme: UIColorTheme) => void
}

const colorSlots: { key: keyof UIColorTheme; label: string; desc: string }[] = [
  { key: 'primary', label: '主色', desc: '按钮和高亮的主色调' },
  { key: 'secondary', label: '辅色', desc: '辅助色（成功/绿色）' },
  { key: 'background', label: '背景色', desc: '游戏窗口背景' },
  { key: 'surface', label: '面板色', desc: '面板和卡片背景' },
  { key: 'text', label: '文字色', desc: '主要文字颜色' },
  { key: 'textMuted', label: '次要文字', desc: '次级/暗淡文字' },
  { key: 'accent', label: '强调色', desc: '重点和突出显示' },
  { key: 'danger', label: '危险色', desc: '错误/警告状态' },
]

const ThemeEditor: React.FC<ThemeEditorProps> = ({ theme, onChange }) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-editor-text mb-1">配色主题</h3>
        <p className="text-[11px] text-editor-muted">自定义游戏 UI 的调色板，实时预览效果</p>
      </div>

      {/* Presets */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">预设方案</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { name: 'Catppuccin', primary: '#89b4fa', secondary: '#a6e3a1', background: '#1e1e2e', surface: '#313244', text: '#cdd6f4', textMuted: '#6c7086', accent: '#f5c2e7', danger: '#f38ba8' },
            { name: 'Nord', primary: '#88c0d0', secondary: '#a3be8c', background: '#2e3440', surface: '#3b4252', text: '#eceff4', textMuted: '#81a1c1', accent: '#b48ead', danger: '#bf616a' },
            { name: 'Solarized', primary: '#268bd2', secondary: '#859900', background: '#002b36', surface: '#073642', text: '#839496', textMuted: '#586e75', accent: '#d33682', danger: '#dc322f' },
            { name: 'Dracula', primary: '#bd93f9', secondary: '#50fa7b', background: '#282a36', surface: '#44475a', text: '#f8f8f2', textMuted: '#6272a4', accent: '#ff79c6', danger: '#ff5555' },
            { name: 'Monokai', primary: '#66d9ef', secondary: '#a6e22e', background: '#272822', surface: '#3e3d32', text: '#f8f8f2', textMuted: '#75715e', accent: '#f92672', danger: '#e6db74' },
            { name: 'Light', primary: '#2563eb', secondary: '#16a34a', background: '#f8fafc', surface: '#e2e8f0', text: '#1e293b', textMuted: '#64748b', accent: '#d946ef', danger: '#ef4444' },
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => onChange({ ...preset })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-editor-border text-[10px]
                         hover:border-accent hover:bg-accent/5 transition-all"
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primary }} />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">实时预览</label>
        <div
          className="p-4 rounded-lg border border-editor-border space-y-2"
          style={{ backgroundColor: theme.background, color: theme.text, fontFamily: 'sans-serif' }}
        >
          <h4 style={{ color: theme.primary, fontWeight: 600, fontSize: 14 }}>示例标题</h4>
          <p style={{ fontSize: 12, color: theme.textMuted }}>这是你主题配色的实时预览效果。</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme.primary, color: theme.background }}>主色</span>
            <span className="px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme.secondary, color: theme.background }}>成功</span>
            <span className="px-3 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme.danger, color: '#fff' }}>危险</span>
          </div>
          <div className="p-2 rounded" style={{ backgroundColor: theme.surface }}>
            <span style={{ fontSize: 11, color: theme.textMuted }}>面板区域</span>
          </div>
        </div>
      </div>

      {/* Color Picker Slots */}
      <div className="space-y-3">
        {colorSlots.map(slot => (
          <div key={slot.key} className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={theme[slot.key]}
                onChange={(e) => onChange({ ...theme, [slot.key]: e.target.value })}
                className="w-9 h-9 rounded cursor-pointer border-2 border-editor-border"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-editor-text">{slot.label}</span>
                <code className="text-[10px] text-editor-muted bg-editor-bg px-1.5 py-0.5 rounded">{theme[slot.key]}</code>
              </div>
              <p className="text-[10px] text-editor-muted">{slot.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ThemeEditor
