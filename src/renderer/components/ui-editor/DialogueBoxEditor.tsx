import React from 'react'
import type { DialogueBoxConfig } from '@shared/models/project'
import { Type, AlignJustify, Palette } from 'lucide-react'

interface DialogueBoxEditorProps {
  box: DialogueBoxConfig
  onChange: (box: DialogueBoxConfig) => void
}

const DialogueBoxEditor: React.FC<DialogueBoxEditorProps> = ({ box, onChange }) => {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-editor-text mb-1">对话框样式</h3>
        <p className="text-[11px] text-editor-muted">自定义视觉小说场景中的对话框外观</p>
      </div>

      {/* Position */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">
          <AlignJustify size={12} className="inline mr-1" /> 位置
        </label>
        <div className="flex gap-2">
          {(['bottom', 'top', 'fullscreen'] as const).map(pos => (
            <button
              key={pos}
              onClick={() => onChange({ ...box, position: pos })}
              className={`px-3 py-1.5 rounded text-[11px] border transition-all capitalize ${
                box.position === pos
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-editor-border text-editor-muted hover:text-editor-text'
              }`}
            >
              {pos==='bottom'?'底部':pos==='top'?'顶部':'全屏'}
            </button>
          ))}
        </div>
      </div>

      {/* Background Style */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">
          <Palette size={12} className="inline mr-1" /> 背景
        </label>
        <div className="flex gap-2 mb-2">
          {(['solid', 'gradient', 'image'] as const).map(style => (
            <button
              key={style}
              onClick={() => onChange({ ...box, backgroundStyle: style })}
              className={`px-3 py-1.5 rounded text-[11px] border transition-all capitalize ${
                box.backgroundStyle === style
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-editor-border text-editor-muted hover:text-editor-text'
              }`}
            >
              {style==='solid'?'纯色':style==='gradient'?'渐变':'图片'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={box.backgroundColor}
            onChange={(e) => onChange({ ...box, backgroundColor: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border border-editor-border"
          />
          <input
            type="text"
            value={box.backgroundColor}
            onChange={(e) => onChange({ ...box, backgroundColor: e.target.value })}
            className="flex-1 px-2 py-1 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text font-mono"
          />
        </div>
      </div>

      {/* Text Settings */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">
          <Type size={12} className="inline mr-1" /> 文字
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-editor-muted block mb-0.5">字号</label>
            <input
              type="range" min={12} max={36} value={box.fontSize}
              onChange={(e) => onChange({ ...box, fontSize: Number(e.target.value) })}
              className="w-full accent-accent"
            />
            <span className="text-[10px] text-editor-muted">{box.fontSize}px</span>
          </div>
          <div>
            <label className="text-[9px] text-editor-muted block mb-0.5">圆角</label>
            <input
              type="range" min={0} max={24} value={box.borderRadius}
              onChange={(e) => onChange({ ...box, borderRadius: Number(e.target.value) })}
              className="w-full accent-accent"
            />
            <span className="text-[10px] text-editor-muted">{box.borderRadius}px</span>
          </div>
          <div>
            <label className="text-[9px] text-editor-muted block mb-0.5">Typewriter Speed</label>
            <input
              type="range" min={5} max={80} value={box.typewriterSpeed}
              onChange={(e) => onChange({ ...box, typewriterSpeed: Number(e.target.value) })}
              className="w-full accent-accent"
            />
            <span className="text-[10px] text-editor-muted">{box.typewriterSpeed}ms/char</span>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <label className="text-[9px] text-editor-muted block mb-0.5">Text Color</label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={box.textColor}
                onChange={(e) => onChange({ ...box, textColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-editor-border" />
              <code className="text-[10px] text-editor-muted bg-editor-bg px-1.5 py-0.5 rounded">{box.textColor}</code>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[9px] text-editor-muted block mb-0.5">Name Box Color</label>
            <div className="flex items-center gap-1.5">
              <input type="color" value={box.nameBoxColor}
                onChange={(e) => onChange({ ...box, nameBoxColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border border-editor-border" />
              <code className="text-[10px] text-editor-muted bg-editor-bg px-1.5 py-0.5 rounded">{box.nameBoxColor}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div>
        <label className="text-[10px] font-semibold text-editor-muted uppercase tracking-wider mb-2 block">Preview</label>
        <div className="relative w-full h-40 rounded-lg border border-editor-border bg-[#12121e] overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a3e] to-[#0d0d1a]" />

          {/* Name box */}
          <div
            className={`absolute ${box.position === 'top' ? 'top-2' : 'bottom-[88px]'} left-3 z-10`}
            style={{
              backgroundColor: box.nameBoxColor,
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff'
            }}
          >
            Speaker Name
          </div>

          {/* Dialogue box */}
          <div
            className="absolute left-2 right-2 h-[80px] flex items-center px-3"
            style={{
              [box.position === 'top' ? 'top' : 'bottom']: box.position === 'fullscreen' ? 0 : 4,
              backgroundColor: box.backgroundColor,
              borderRadius: box.borderRadius,
              ...(box.position === 'fullscreen' ? { top: 0, height: '100%' } : {})
            }}
          >
            <p style={{ color: box.textColor, fontSize: box.fontSize }}>
              This is a sample dialogue text with your custom settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DialogueBoxEditor
