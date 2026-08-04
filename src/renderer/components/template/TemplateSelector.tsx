import React from 'react'
import { useEditorStore } from '../../stores/editorStore'
import type { GameProject, GameMode } from '@shared/models/project'
import { FileText, Check, Sparkles } from 'lucide-react'

// ── Inline template data ──────────────────────────────────

const templates: { id: string; mode: GameMode; name: string; desc: string; tags: string[]; icon: string; project: GameProject }[] = [
  {
    id: 'rpg-starter', mode: 'rpg', name: 'RPG Starter',
    desc: 'Empty project with a 20×15 map and collision layer',
    tags: ['Beginner', 'Top-Down'], icon: '🗺️',
    project: {
      meta: { name: 'RPG Starter', mode: 'rpg', version: '0.1.0', createdAt: '', updatedAt: '', description: '' },
      assets: [],
      ui: {} as any, rpg: {
        maps: [{ id: 'map-1', name: 'Main Map', width: 20, height: 15, tileWidth: 32, tileHeight: 32, tilesetId: '',
          layers: [{ id: 'l1', name: 'Ground', data: [], visible: true, opacity: 1, isCollision: false },
                   { id: 'l2', name: 'Collision', data: [], visible: true, opacity: 1, isCollision: true }] }],
        entities: [], currentMapId: 'map-1'
      }, galgame: null
    }
  },
  {
    id: 'gal-starter', mode: 'galgame', name: 'Galgame Starter',
    desc: 'Visual novel with a sample dialogue scene and branch',
    tags: ['Beginner', 'VN'], icon: '💬',
    project: {
      meta: { name: 'Galgame Starter', mode: 'galgame', version: '0.1.0', createdAt: '', updatedAt: '', description: '' },
      assets: [],
      ui: {} as any, rpg: null, galgame: {
        scenes: [{ id: 's1', name: 'Classroom', backgroundType: 'image', backgroundPath: '', bgmPath: null, transition: 'fade', customTransition: '', dialogueNodeIds: [] }],
        dialogueNodes: [
          { id: 'd1', speakerName: 'Narrator', speakerPortraitId: '', portraitExpression: 'neutral', text: 'Welcome to your visual novel!', nextNodeId: 'd2', effects: ['fadeIn'] },
          { id: 'd2', speakerName: 'Hero', speakerPortraitId: '', portraitExpression: 'happy', text: 'I\'m ready to start!', nextNodeId: 'b1', effects: [] }
        ],
        branchNodes: [{ id: 'b1', prompt: 'What now?', choices: [{ text: 'Explore', nextNodeId: '' }, { text: 'Rest', nextNodeId: '' }] }],
        variables: {}, characters: [], startSceneId: 's1', startNodeId: 'd1'
      }
    }
  },
  {
    id: 'rpg-village', mode: 'rpg', name: 'Village Adventure',
    desc: 'Small village map with NPCs, portals, and items',
    tags: ['Intermediate', 'Quest'], icon: '🏘️',
    project: {
      meta: { name: 'Village Adventure', mode: 'rpg', version: '0.1.0', createdAt: '', updatedAt: '', description: 'A small village with quests' },
      assets: [],
      ui: {} as any, rpg: {
        maps: [{ id: 'map-1', name: 'Village', width: 25, height: 20, tileWidth: 32, tileHeight: 32, tilesetId: '',
          layers: [{ id: 'l1', name: 'Ground', data: [], visible: true, opacity: 1, isCollision: false },
                   { id: 'l2', name: 'Collision', data: [], visible: true, opacity: 1, isCollision: true }] }],
        entities: [
          { id: 'e1', type: 'player_spawn', name: 'Spawn', spriteId: '', x: 12, y: 10, properties: {} },
          { id: 'e2', type: 'npc', name: 'Elder', spriteId: '', x: 8, y: 4, properties: { dialogue: '["Welcome traveler!","Our village needs your help."]' } },
          { id: 'e3', type: 'portal', name: 'Forest Exit', spriteId: '', x: 22, y: 18, properties: { targetMapId: '' } },
          { id: 'e4', type: 'item', name: 'Health Potion', spriteId: '', x: 5, y: 12, properties: {} }
        ], currentMapId: 'map-1'
      }, galgame: null
    }
  },
  {
    id: 'gal-romance', mode: 'galgame', name: 'Romance VN',
    desc: 'Branching romance story with affection system',
    tags: ['Intermediate', 'Romance'], icon: '💕',
    project: {
      meta: { name: 'Romance VN', mode: 'galgame', version: '0.1.0', createdAt: '', updatedAt: '', description: 'A branching romance story' },
      assets: [],
      ui: {} as any, rpg: null, galgame: {
        scenes: [
          { id: 's1', name: 'School Entrance', backgroundType: 'image', backgroundPath: '', bgmPath: null, transition: 'fade', customTransition: '', dialogueNodeIds: [] },
          { id: 's2', name: 'Classroom', backgroundType: 'image', backgroundPath: '', bgmPath: null, transition: 'slideLeft', customTransition: '', dialogueNodeIds: [] }
        ],
        dialogueNodes: [
          { id: 'd1', speakerName: 'Narrator', speakerPortraitId: '', portraitExpression: 'neutral', text: 'First day of school...', nextNodeId: 'd2', effects: ['fadeIn'] },
          { id: 'd2', speakerName: '???', speakerPortraitId: '', portraitExpression: 'surprised', text: 'Oh! Are you new here?', nextNodeId: 'b1', effects: [] }
        ],
        branchNodes: [
          { id: 'b1', prompt: 'How do you respond?', choices: [
            { text: 'Smile and say hi!', nextNodeId: '' },
            { text: 'Nod silently.', nextNodeId: '' }
          ]}
        ],
        variables: { affection: 0 }, characters: [], startSceneId: 's1', startNodeId: 'd1'
      }
    }
  }
]

// ── Component ──────────────────────────────────────────────

interface TemplateSelectorProps {
  mode: GameMode
  onSelect: (project: GameProject) => void
  onCancel: () => void
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ mode, onSelect, onCancel }) => {
  const filtered = templates.filter(t => t.mode === mode)

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-editor-muted uppercase tracking-wider">
          Templates
        </h3>
        <button onClick={onCancel} className="text-editor-muted hover:text-editor-text text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-editor-muted text-center py-8">No templates available</p>
        ) : (
          filtered.map(t => (
            <div
              key={t.id}
              onClick={() => onSelect(t.project)}
              className="p-3 rounded-lg border border-editor-border hover:border-accent cursor-pointer
                         transition-all hover:bg-accent/5 group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-editor-text">{t.name}</p>
                  <p className="text-[11px] text-editor-muted mt-0.5">{t.desc}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {t.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-editor-bg rounded text-[9px] text-editor-muted">{tag}</span>
                    ))}
                  </div>
                </div>
                <Check size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-editor-border">
        <button
          onClick={onCancel}
          className="w-full py-1.5 text-[11px] text-editor-muted hover:text-editor-text transition-colors"
        >
          Skip — start from scratch
        </button>
      </div>
    </div>
  )
}

export default TemplateSelector
