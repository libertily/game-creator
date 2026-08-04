import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT } from '../../i18n'
import DialogueTreeEditor from './DialogueTreeEditor'
import SceneManager from './SceneManager'
import CharacterManager from './CharacterManager'
import { PanelRightClose, PanelRightOpen, Image, Users } from 'lucide-react'

function usePanelResize(initial: number) {
  const [w, setW] = useState(initial)
  const dragging = useRef(false); const sx = useRef(0); const sw = useRef(0)
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (!dragging.current) return; setW(Math.min(600, Math.max(120, sw.current + (sx.current - e.clientX)))) }
    const up = () => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])
  return { w, onDown: (e: React.MouseEvent) => { dragging.current = true; sx.current = e.clientX; sw.current = w; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' } }
}

const GalgameEditor: React.FC = () => {
  const t = useT()
  const project = useEditorStore(s => s.project)
  const setProjectData = useEditorStore(s => s.setProjectData)
  const [panelHidden, setPanelHidden] = useState(false)
  const panelW = usePanelResize(224)

  if (!project?.galgame) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg">
        <div className="text-center text-editor-muted">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-sm">{t.galgame.dialogueTree}</p>
          <button onClick={() => {
            const s = useEditorStore.getState(); if (!s.project) return
            setProjectData({ ...s.project, galgame: { scenes: [], dialogueNodes: [], branchNodes: [], characters: [], variables: {}, startSceneId: '', startNodeId: '' }, rpg: null })
          }} className="mt-3 px-4 py-2 bg-accent-alt text-editor-bg text-sm font-semibold rounded hover:bg-accent-alt/80">
            {t.galgame.addDialogue}
          </button>
        </div>
      </div>
    )
  }

  const gd = project.galgame

  const updateStore = useCallback((patch: Partial<typeof gd>) => {
    const s = useEditorStore.getState(); if (!s.project?.galgame) return
    setProjectData({ ...s.project, galgame: { ...s.project.galgame, ...patch } })
  }, [setProjectData])

  const handleSceneCharBind = (sceneId: string, charIds: string[]) => {
    const newScenes = gd.scenes.map(s => s.id === sceneId ? { ...s, characterIds: charIds } : s)
    updateStore({ scenes: newScenes })
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <DialogueTreeEditor
          dialogueNodes={gd.dialogueNodes} branchNodes={gd.branchNodes} startNodeId={gd.startNodeId} scenes={gd.scenes} characters={gd.characters || []}
          onNodesChange={(d, b) => updateStore({ dialogueNodes: d, branchNodes: b })}
          onStartNodeChange={(id) => updateStore({ startNodeId: id })}
          onNodeSceneBind={(nodeId, sceneId) => {
            const newScenes = gd.scenes.map(s => {
              const ids = s.dialogueNodeIds || []
              if (s.id === sceneId && !ids.includes(nodeId)) return { ...s, dialogueNodeIds: [...ids, nodeId] }
              if (s.id !== sceneId && ids.includes(nodeId)) return { ...s, dialogueNodeIds: ids.filter(id => id !== nodeId) }
              return s
            })
            updateStore({ scenes: newScenes })
          }} />
      </div>
      {/* Right Panel */}
      {panelHidden ? (
        <div className="w-8 bg-editor-surface border-l border-editor-border shrink-0 flex flex-col items-center py-2 gap-3">
          <button onClick={() => setPanelHidden(false)} className="p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border" title="展开面板">
            <PanelRightOpen size={14}/>
          </button>
          <div className="w-5 h-px bg-editor-border"/>
          <button onClick={() => setPanelHidden(false)} className="p-1 rounded text-editor-muted hover:text-accent" title="场景">
            <Image size={14}/>
          </button>
          <button onClick={() => setPanelHidden(false)} className="p-1 rounded text-editor-muted hover:text-accent" title="角色">
            <Users size={14}/>
          </button>
        </div>
      ) : (
        <div className="bg-editor-surface border-l border-editor-border shrink-0 flex flex-col relative" style={{ width: panelW.w }}>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/50 z-10 transition-colors" onMouseDown={panelW.onDown} />
          <button onClick={() => setPanelHidden(true)}
            className="absolute right-1 top-0.5 w-5 h-5 rounded bg-editor-bg border border-editor-border flex items-center justify-center text-editor-muted hover:text-editor-text hover:border-accent/40 z-20"
            title="折叠面板">
            <PanelRightClose size={10}/>
          </button>
          <SceneManager scenes={gd.scenes} startSceneId={gd.startSceneId}
            dialogueNodes={gd.dialogueNodes} branchNodes={gd.branchNodes} characters={gd.characters || []}
            onScenesChange={(s) => updateStore({ scenes: s })}
            onStartSceneChange={(id) => updateStore({ startSceneId: id })}
            onSceneCharBind={handleSceneCharBind} />
          <CharacterManager characters={gd.characters || []} scenes={gd.scenes}
            onCharactersChange={(c) => updateStore({ characters: c })}
            onSceneCharBind={handleSceneCharBind} />
        </div>
      )}
    </div>
  )
}

export default GalgameEditor
