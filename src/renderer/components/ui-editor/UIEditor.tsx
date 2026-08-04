import React, { useState, useCallback } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import ThemeEditor from './ThemeEditor'
import HUDEditor from './HUDEditor'
import DialogueBoxEditor from './DialogueBoxEditor'
import MenuEditor from './MenuEditor'
import { Palette, Layout, MessageSquare, Monitor } from 'lucide-react'
import { useT } from '../../i18n'

const UIEditor: React.FC = () => {
  const t = useT()
  const mode = useEditorStore(s => s.activeMode)
  const allTabs = [
    { id: 'theme', label: t.uiEditor.theme, icon: Palette },
    { id: 'hud', label: t.uiEditor.hud, icon: Layout },
    { id: 'dialogue', label: t.uiEditor.dialogueBox, icon: MessageSquare },
    { id: 'menu', label: t.uiEditor.menu, icon: Monitor },
  ]
  const tabs = mode === 'galgame' ? allTabs.filter(t => t.id !== 'hud') : allTabs
  const [activeTab, setActiveTab] = useState('theme')
  const project = useEditorStore((s) => s.project)

  const setUI = useCallback((patch: any) => {
    useEditorStore.setState((s) => {
      if (!s.project) return s
      return {
        project: {
          ...s.project,
          ui: { ...s.project.ui, ...patch }
        },
        isDirty: true
      }
    })
  }, [])

  if (!project) return null
  const ui = project.ui

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-9 bg-editor-surface border-b border-editor-border shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-editor-muted hover:text-editor-text'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'theme' && <ThemeEditor theme={ui.theme} onChange={(t) => setUI({ theme: t })} />}
        {activeTab === 'hud' && <HUDEditor hud={ui.rpgHUD} onChange={(h) => setUI({ rpgHUD: h })} />}
        {activeTab === 'dialogue' && <DialogueBoxEditor box={ui.dialogueBox} onChange={(b) => setUI({ dialogueBox: b })} />}
        {activeTab === 'menu' && <MenuEditor menu={ui.menu} onChange={(m) => setUI({ menu: m })} />}
      </div>
    </div>
  )
}

export default UIEditor
