import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import ReactFlow, { Node, Edge, Controls, Background, MiniMap, useNodesState, useEdgesState, addEdge, Connection, NodeProps, Handle, Position, MarkerType, ReactFlowInstance } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import 'reactflow/dist/style.css'
import { useT } from '../../i18n'
import type { DialogueNode, BranchNode, ChoiceOption, SceneDef, CharacterDef } from '@shared/models/project'
import { MessageCircle, GitBranch, Plus, Trash2, MapPin, PanelRightClose, PanelRightOpen } from 'lucide-react'

const DNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div className={`px-3 py-2 rounded-lg border-2 ${selected?'border-accent bg-editor-surface':'border-editor-border bg-editor-bg'}`} style={{ minWidth: 160, minHeight: 60 }}>
    <NodeResizer minWidth={160} minHeight={60} isVisible={selected} lineStyle={{ borderColor: '#a6e3a1' }} handleStyle={{ backgroundColor: '#a6e3a1', borderColor: '#a6e3a1' }} />
    <Handle type="target" position={Position.Top} className="!bg-editor-muted"/>
    <div className="flex items-center gap-2 mb-1"><MessageCircle size={14} className="text-accent-alt"/><span className="text-[11px] font-semibold text-accent-alt">{data.speaker||'Narrator'}</span>{data.sceneTag&&<span className="text-[8px] px-1 rounded bg-accent/20 text-accent ml-auto">{data.sceneTag}</span>}</div>
    <p className="text-[11px] text-editor-text leading-snug">{data.text||'...'}</p>
    <Handle type="source" position={Position.Bottom} className="!bg-editor-muted"/>
  </div>
)

const BNode: React.FC<NodeProps> = ({ data, selected }) => (
  <div className={`px-3 py-2 rounded-lg border-2 ${selected?'border-[#f5c2e7] bg-editor-surface':'border-editor-border bg-editor-bg'}`} style={{ minWidth: 160, minHeight: 80 }}>
    <NodeResizer minWidth={160} minHeight={80} isVisible={selected} lineStyle={{ borderColor: '#f5c2e7' }} handleStyle={{ backgroundColor: '#f5c2e7', borderColor: '#f5c2e7' }} />
    <Handle type="target" position={Position.Top} className="!bg-editor-muted"/>
    <div className="flex items-center gap-2 mb-1"><GitBranch size={14} className="text-[#f5c2e7]"/><span className="text-[11px] font-semibold text-[#f5c2e7]">Branch</span>{data.sceneTag&&<span className="text-[8px] px-1 rounded bg-accent/20 text-accent ml-auto">{data.sceneTag}</span>}</div>
    <p className="text-[11px] text-editor-text mb-1">{data.prompt||'...'}</p>
    <div className="space-y-0.5">{(data.choices as ChoiceOption[]||[]).map((c,i)=>(<div key={i} className="text-[10px] text-editor-muted flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f5c2e7] shrink-0"/><span className="truncate">{c.text}</span></div>))}</div>
    <Handle type="source" position={Position.Bottom} className="!bg-editor-muted"/>
  </div>
)

// simple resize hook for right panel
function useResizePanel(initial: number) {
  const [w, setW] = useState(initial)
  const dragging = useRef(false)
  const sx = useRef(0)
  const sw = useRef(0)
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (!dragging.current) return; setW(Math.min(600, Math.max(180, sw.current + (sx.current - e.clientX)))) }
    const up = () => { dragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])
  return { w, onDown: (e: React.MouseEvent) => { dragging.current = true; sx.current = e.clientX; sw.current = w; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' } }
}

const nodeTypes = { dialogue: DNode, branch: BNode }

interface Props { dialogueNodes: DialogueNode[]; branchNodes: BranchNode[]; startNodeId: string; scenes: SceneDef[]; characters: CharacterDef[]; onNodesChange: (d: DialogueNode[], b: BranchNode[]) => void; onStartNodeChange: (id: string) => void; onNodeSceneBind?: (nodeId: string, sceneId: string) => void }

const DialogueTreeEditor: React.FC<Props> = ({ dialogueNodes, branchNodes, startNodeId, scenes, characters, onNodesChange, onStartNodeChange, onNodeSceneBind }) => {
  const t = useT()
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const panel = useResizePanel(260)

  // get effective scene ID for a node (direct field + reverse lookup from scene.dialogueNodeIds)
  const getEffectiveSceneId = useCallback((nodeId: string) => {
    const dn = dialogueNodes.find(n => n.id === nodeId); if (dn?.sceneId) return dn.sceneId
    const bn = branchNodes.find(n => n.id === nodeId); if (bn?.sceneId) return bn.sceneId
    for (const s of scenes) { if (s.dialogueNodeIds?.includes(nodeId)) return s.id }
    return ''
  }, [dialogueNodes, branchNodes, scenes])

  // get scene name for node tag display
  const nodeSceneName = useCallback((nodeId: string) => {
    const dn = dialogueNodes.find(n => n.id === nodeId)
    if (dn?.sceneId) { const s = scenes.find(x => x.id === dn.sceneId); if (s) return s.name }
    const bn = branchNodes.find(n => n.id === nodeId)
    if (bn?.sceneId) { const s = scenes.find(x => x.id === bn.sceneId); if (s) return s.name }
    for (const s of scenes) { if (s.dialogueNodeIds?.includes(nodeId)) return s.name }
    return ''
  }, [dialogueNodes, branchNodes, scenes])

  const buildFlow = useCallback(() => {
    const rfn: Node[] = []; const rfe: Edge[] = []
    dialogueNodes.forEach((dn, i) => {
      rfn.push({ id: dn.id, type: 'dialogue', position: { x: (i%3)*320+50, y: Math.floor(i/3)*200+50 }, data: { speaker: dn.speakerName, text: dn.text, sceneTag: nodeSceneName(dn.id), sceneId: dn.sceneId, changeSceneId: dn.changeSceneId } })
      if (dn.nextNodeId) rfe.push({ id: `e-${dn.id}-${dn.nextNodeId}`, source: dn.id, target: dn.nextNodeId, animated: true, style: { stroke: '#6c7086' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6c7086' } })
    })
    branchNodes.forEach((bn, i) => {
      rfn.push({ id: bn.id, type: 'branch', position: { x: (i%3)*320+50, y: Math.floor(i/3)*200+100+dialogueNodes.length*70 }, data: { prompt: bn.prompt, choices: bn.choices, sceneTag: nodeSceneName(bn.id), sceneId: bn.sceneId } })
      bn.choices.forEach((c, ci) => { if (c.nextNodeId) rfe.push({ id: `e-${bn.id}-${c.nextNodeId}-${ci}`, source: bn.id, target: c.nextNodeId, style: { stroke: '#f5c2e7' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f5c2e7' }, label: c.text.slice(0,20), labelStyle: { fontSize: 9, fill: '#6c7086' } }) })
    })
    return { nodes: rfn, edges: rfe }
  }, [dialogueNodes, branchNodes, nodeSceneName])

  const init = useMemo(() => buildFlow(), [buildFlow])
  const [nodes, setNodes, onNodesChangeRF] = useNodesState(init.nodes)
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState(init.edges)
  useEffect(() => { const { nodes: nn, edges: ee } = buildFlow(); setNodes(nn); setEdges(ee) }, [dialogueNodes, branchNodes, buildFlow, setNodes, setEdges])
  const onConnect = useCallback((p: Connection) => setEdges(eds => addEdge({ ...p, animated: true, style: { stroke: '#6c7086' } }, eds)), [setEdges])

  // WASD keyboard panning
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (!rfRef.current) return
      const speed = 40
      const vp = rfRef.current.getViewport()
      switch (e.key.toLowerCase()) {
        case 'w': rfRef.current.setViewport({ ...vp, y: vp.y + speed }, { duration: 80 }); e.preventDefault(); break
        case 's': rfRef.current.setViewport({ ...vp, y: vp.y - speed }, { duration: 80 }); e.preventDefault(); break
        case 'a': rfRef.current.setViewport({ ...vp, x: vp.x + speed }, { duration: 80 }); e.preventDefault(); break
        case 'd': rfRef.current.setViewport({ ...vp, x: vp.x - speed }, { duration: 80 }); e.preventDefault(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const [selId, setSelId] = useState<string | null>(null)
  const [propsCollapsed, setPropsCollapsed] = useState(false)
  const sd = dialogueNodes.find(n => n.id === selId)
  const sb = branchNodes.find(n => n.id === selId)
  const updD = (id: string, p: Partial<DialogueNode>) => onNodesChange(dialogueNodes.map(n => n.id===id?{...n,...p}:n), branchNodes)
  const updB = (id: string, p: Partial<BranchNode>) => onNodesChange(dialogueNodes, branchNodes.map(n => n.id===id?{...n,...p}:n))
  const addD = () => { const id = `d-${Date.now()}`; onNodesChange([...dialogueNodes, { id, speakerName: '', speakerPortraitId: '', portraitExpression: 'neutral', text: '', nextNodeId: null, effects: [] }], branchNodes); setSelId(id) }
  const addB = () => { const id = `b-${Date.now()}`; onNodesChange(dialogueNodes, [...branchNodes, { id, prompt: '', choices: [{ text: '选择 1', nextNodeId: '' }, { text: '选择 2', nextNodeId: '' }] }]); setSelId(id) }
  const del = () => { if (!selId) return; onNodesChange(dialogueNodes.filter(n=>n.id!==selId), branchNodes.filter(n=>n.id!==selId)); setSelId(null) }
  const inp = "w-full px-2 py-1 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text focus:outline-none focus:border-accent"

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-9 px-3 bg-editor-surface border-b border-editor-border gap-2 shrink-0">
        <button onClick={addD} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-accent-alt/20 text-accent-alt hover:bg-accent-alt/30"><Plus size={14}/>{t.galgame.addDialogue}</button>
        <button onClick={addB} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[#f5c2e7]/20 text-[#f5c2e7] hover:bg-[#f5c2e7]/30"><GitBranch size={14}/>{t.galgame.addBranch}</button>
        <div className="w-px h-4 bg-editor-border"/><button onClick={del} disabled={!selId} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-red-400 hover:bg-red-400/10 disabled:opacity-30"><Trash2 size={14}/>{t.galgame.delete}</button>
        <div className="flex-1"/><span className="text-[10px] text-editor-muted">{t.galgame.startScene}: <span className="text-accent-alt">{startNodeId||'—'}</span></span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1"
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'link' }}
          onDrop={e => {
            e.preventDefault()
            const sceneId = e.dataTransfer.getData('sceneId')
            if (!sceneId || !onNodeSceneBind) return
            // find node under cursor by checking ReactFlow viewport coordinates
            if (!rfRef.current) return
            const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const vp = rfRef.current.getViewport()
            const rx = (e.clientX - bounds.left - vp.x) / vp.zoom
            const ry = (e.clientY - bounds.top - vp.y) / vp.zoom
            // find closest node
            let closest = ''; let minDist = Infinity
            nodes.forEach(n => {
              const dx = n.position.x + 80 - rx; const dy = n.position.y + 30 - ry
              const d = dx*dx + dy*dy
              if (d < minDist) { minDist = d; closest = n.id }
            })
            if (closest && minDist < 20000) onNodeSceneBind(closest, sceneId)
          }}
        ><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChangeRF} onEdgesChange={onEdgesChangeRF} onConnect={onConnect} onNodeClick={(_,n)=>setSelId(n.id)} onInit={(inst) => { rfRef.current = inst }} nodeTypes={nodeTypes} nodesDraggable fitView className="bg-[#12121e]"><Controls className="!bg-editor-surface !border-editor-border !rounded-lg"/><Background color="#ffffff08" gap={20}/><MiniMap style={{background:'#1e1e2e'}} nodeColor={n=>n.type==='branch'?'#f5c2e7':'#a6e3a1'} maskColor="rgba(0,0,0,0.6)"/></ReactFlow></div>
        <div className="relative shrink-0 overflow-hidden border-l border-editor-border bg-editor-surface" style={{ width: propsCollapsed ? 28 : panel.w }}>
          {!propsCollapsed && <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/50 z-10 transition-colors" onMouseDown={panel.onDown} />}
          {!propsCollapsed && <button onClick={() => setPropsCollapsed(true)}
            className="absolute right-1 top-0.5 w-5 h-5 rounded bg-editor-bg border border-editor-border flex items-center justify-center text-editor-muted hover:text-editor-text hover:border-accent/40 z-20"
            title="折叠属性">
            <PanelRightClose size={10}/>
          </button>}
          {propsCollapsed ? (
            <div className="flex flex-col items-center py-2 gap-3 h-full">
              <button onClick={() => setPropsCollapsed(false)} className="p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border" title="展开属性"><PanelRightOpen size={14}/></button>
              <div className="w-5 h-px bg-editor-border"/>
              {selId && <button onClick={() => setPropsCollapsed(false)} className="p-1 rounded text-editor-muted hover:text-accent" title="属性"><MapPin size={14}/></button>}
            </div>
          ) : (
          <div className="h-full overflow-y-auto">
          {sd ? (<div className="p-3"><h4 className="text-[10px] font-semibold text-accent-alt uppercase tracking-wider mb-2">{t.galgame.addDialogue}</h4>
            <div className="space-y-2">
              <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.speaker}</label>
                <select value={sd.speakerName} onChange={e=>updD(sd.id,{speakerName:e.target.value})} className={inp}>
                  <option value="">— 旁白/叙述 —</option>
                  <option value="???">??? (未知)</option>
                  {characters.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.text}</label><textarea value={sd.text} onChange={e=>updD(sd.id,{text:e.target.value})} rows={4} className={`${inp} resize-none`}/></div>
              <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.expression}</label><select value={sd.portraitExpression} onChange={e=>updD(sd.id,{portraitExpression:e.target.value})} className={inp}>{['neutral','happy','sad','angry','surprised','blush'].map(x=><option key={x} value={x}>{t.common[x as keyof typeof t.common]}</option>)}</select></div>
              <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.nextNode}</label><input type="text" value={sd.nextNodeId||''} onChange={e=>updD(sd.id,{nextNodeId:e.target.value||null})} className={inp}/></div>
              {/* Scene Binding */}
              <div className="p-2 bg-editor-bg rounded border border-editor-border/50 space-y-2">
                <div className="flex items-center gap-1"><MapPin size={12} className="text-accent-alt"/><span className="text-[10px] font-semibold text-editor-muted uppercase">{t.galgame.sceneBinding || '场景联动'}</span></div>
                <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.belongScene || '所属场景'}</label>
                  <select value={getEffectiveSceneId(sd.id)} onChange={e=>updD(sd.id,{sceneId:e.target.value||undefined})} className={inp}>
                    <option value="">— 无 —</option>
                    {scenes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.changeToScene || '切换至场景'}</label>
                  <select value={sd.changeSceneId||''} onChange={e=>updD(sd.id,{changeSceneId:e.target.value||undefined})} className={inp}>
                    <option value="">— 不切换 —</option>
                    {scenes.filter(s=>s.id!==sd.sceneId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {sd.changeSceneId && <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.transitionEffect || '切换过渡'}</label><input type="text" value={sd.transitionEffect||''} onChange={e=>updD(sd.id,{transitionEffect:e.target.value||undefined})} placeholder="fade, slideLeft..." className={inp}/></div>}
              </div>
              {sd.id===startNodeId?<p className="text-[10px] text-accent-alt">⭐ {t.galgame.startScene}</p>:<button onClick={()=>onStartNodeChange(sd.id)} className="text-[10px] text-editor-muted hover:text-accent-alt">{t.rpg.setStartNode}</button>}
            </div>
          </div>) : sb ? (<div className="p-3"><h4 className="text-[10px] font-semibold text-[#f5c2e7] uppercase tracking-wider mb-2">{t.galgame.addBranch}</h4>
            <div className="space-y-2">
              <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.prompt}</label><input type="text" value={sb.prompt} onChange={e=>updB(sb.id,{prompt:e.target.value})} className={inp}/></div>
              {sb.choices.map((c,i)=>(<div key={i} className="p-2 bg-editor-bg rounded"><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.choices} {i+1}</label><input type="text" value={c.text} onChange={e=>{const nc=[...sb.choices];nc[i]={...nc[i],text:e.target.value};updB(sb.id,{choices:nc})}} className={`${inp} mb-1`}/><input type="text" value={c.nextNodeId} onChange={e=>{const nc=[...sb.choices];nc[i]={...nc[i],nextNodeId:e.target.value};updB(sb.id,{choices:nc})}} placeholder={t.galgame.targetNode} className={`${inp} text-[10px]`}/></div>))}
              <button onClick={()=>updB(sb.id,{choices:[...sb.choices,{text:`${t.galgame.choices} ${sb.choices.length+1}`,nextNodeId:''}]})} className="text-[10px] text-[#f5c2e7] hover:underline">+ {t.galgame.addChoice}</button>
              {/* Scene Binding */}
              <div className="p-2 bg-editor-bg rounded border border-editor-border/50 space-y-1">
                <div className="flex items-center gap-1"><MapPin size={12} className="text-accent-alt"/><span className="text-[10px] font-semibold text-editor-muted uppercase">{t.galgame.sceneBinding || '场景联动'}</span></div>
                <div><label className="text-[9px] text-editor-muted block mb-0.5">{t.galgame.belongScene || '所属场景'}</label>
                  <select value={getEffectiveSceneId(sb.id)} onChange={e=>updB(sb.id,{sceneId:e.target.value||undefined})} className={inp}>
                    <option value="">— 无 —</option>
                    {scenes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>) : (<div className="p-3 text-center text-editor-muted py-8"><GitBranch size={24} className="mx-auto mb-1 opacity-50"/><p className="text-[11px]">{t.galgame.selectNode}</p><p className="text-[10px] mt-1 opacity-60">{dialogueNodes.length+branchNodes.length} {t.galgame.nodes}</p></div>)}</div>)}
      </div>
    </div>
  </div>
  )
}

export default DialogueTreeEditor
