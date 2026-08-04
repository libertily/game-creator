import React, { useCallback } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT } from '../../i18n'
import TileMapEditor from './TileMapEditor'
import EntityPlacer from './EntityPlacer'
import type { RPGMap, RPGEntity } from '@shared/models/project'

const RPGEditor: React.FC = () => {
  const t = useT()
  const project = useEditorStore(s => s.project)
  const setProjectData = useEditorStore(s => s.setProjectData)

  if (!project?.rpg) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center text-editor-muted">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-sm">{t.rpg.noMap}</p>
          <button onClick={() => {
            const s = useEditorStore.getState()
            if (!s.project) return
            setProjectData({ ...s.project, rpg: { maps: [], entities: [], currentMapId: '' }, galgame: null })
          }} className="mt-3 px-4 py-2 bg-accent text-editor-bg text-sm font-semibold rounded hover:bg-accent/80">
            {t.rpg.createMap}
          </button>
        </div>
      </div>
    )
  }

  const rpgData = project.rpg
  const currentMap = rpgData.maps.find(m => m.id === rpgData.currentMapId) || rpgData.maps[0]

  const handleMapChange = useCallback((updatedMap: RPGMap) => {
    const s = useEditorStore.getState(); if (!s.project?.rpg) return
    const newMaps = s.project.rpg.maps.map(m => m.id === updatedMap.id ? updatedMap : m)
    setProjectData({ ...s.project, rpg: { ...s.project.rpg, maps: newMaps } })
  }, [setProjectData])

  const handleEntitiesChange = useCallback((entities: RPGEntity[]) => {
    const s = useEditorStore.getState(); if (!s.project?.rpg) return
    setProjectData({ ...s.project, rpg: { ...s.project.rpg, entities } })
  }, [setProjectData])

  const handleEntityPlace = useCallback((entity: Omit<RPGEntity, 'id'>) => {
    const newEntity: RPGEntity = { ...entity, id: `entity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
    handleEntitiesChange([...rpgData.entities, newEntity])
  }, [rpgData.entities, handleEntitiesChange])

  if (!currentMap) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center text-editor-muted">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-sm">{t.rpg.noMap}</p>
          <button onClick={() => {
            const s = useEditorStore.getState(); if (!s.project?.rpg) return
            const newMap: RPGMap = {
              id: `map-${Date.now()}`, name: t.rpg.ground, width: 20, height: 15, tileWidth: 32, tileHeight: 32, tilesetId: '',
              layers: [
                { id: 'layer-ground', name: t.rpg.ground, data: [], visible: true, opacity: 1, isCollision: false },
                { id: 'layer-collision', name: t.rpg.collision, data: [], visible: true, opacity: 1, isCollision: true }
              ]
            }
            setProjectData({ ...s.project, rpg: { ...s.project.rpg, maps: [...s.project.rpg.maps, newMap], currentMapId: newMap.id } })
          }} className="mt-3 px-4 py-2 bg-accent text-editor-bg text-sm font-semibold rounded hover:bg-accent/80">
            {t.rpg.createMap}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <TileMapEditor map={currentMap} onMapChange={handleMapChange} onEntityPlace={handleEntityPlace} />
      </div>
      <div className="w-56 bg-editor-surface border-l border-editor-border shrink-0 overflow-y-auto">
        <EntityPlacer entities={rpgData.entities} onEntitiesChange={handleEntitiesChange} />
      </div>
    </div>
  )
}

export default RPGEditor
