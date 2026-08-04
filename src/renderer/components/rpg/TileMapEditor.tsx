import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useT } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import type { RPGMap, TileLayer, RPGEntity } from '@shared/models/project'
import { Plus, Layers, Eye, EyeOff, Grid3X3, Move } from 'lucide-react'

const DEFAULT_TILE_SIZE = 32
const GRID_COLOR = 'rgba(255,255,255,0.06)'
const GRID_HOVER_COLOR = 'rgba(137,180,250,0.3)'
const COLLISION_COLOR = 'rgba(243,139,168,0.4)'
const TILE_PALETTE = ['#4a9e4a','#5aae5a','#3d8e3d','#8b7355','#a0845c','#6b5a3e','#6b6b6b','#808080','#555555','#4a6fa5','#5a8fc5','#3a5f95','#c4a44a','#d4b45a','#b4943a','#8b4513']

interface Props { map: RPGMap; onMapChange: (m: RPGMap) => void; onEntityPlace?: (e: Omit<RPGEntity, 'id'>) => void }

const TileMapEditor: React.FC<Props> = ({ map, onMapChange, onEntityPlace }) => {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedTile, setSelectedTile] = useState(0)
  const [activeLayerIdx, setActiveLayerIdx] = useState(0)
  const [tool, setTool] = useState<'paint'|'erase'|'entity'>('paint')
  const [hoverCell, setHoverCell] = useState<{x:number;y:number}|null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({x:0,y:0})
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({x:0,y:0})
  const activeLayer = map.layers[activeLayerIdx]
  if (!activeLayer) return null

  const ensureLayerData = useCallback((layer: TileLayer, w: number, h: number) => {
    if (layer.data.length !== h) return Array.from({length:h},()=>Array(w).fill(0))
    return layer.data.map(r => r.length < w ? [...r, ...Array(w-r.length).fill(0)] : r.slice(0,w))
  }, [])

  const paintTile = useCallback((gx: number, gy: number) => {
    if (tool === 'entity' && onEntityPlace) { onEntityPlace({ type: 'npc', name: `Entity_${gx}_${gy}`, spriteId: '', x: gx, y: gy, properties: {} }); return }
    const value = tool === 'erase' ? 0 : selectedTile
    const newLayers = map.layers.map((l, i) => i !== activeLayerIdx ? l : { ...l, data: ensureLayerData(l, map.width, map.height).map((r, ry) => ry === gy ? r.map((c, cx) => cx === gx ? value : c) : r) })
    onMapChange({ ...map, layers: newLayers })
  }, [tool, selectedTile, activeLayerIdx, map, ensureLayerData, onMapChange, onEntityPlace])

  const getCellPos = useCallback((cx: number, cy: number) => {
    const c = canvasRef.current; if (!c) return null
    const r = c.getBoundingClientRect()
    const gx = Math.floor((cx - r.left - pan.x) / zoom / DEFAULT_TILE_SIZE)
    const gy = Math.floor((cy - r.top - pan.y) / zoom / DEFAULT_TILE_SIZE)
    return (gx < 0 || gy < 0 || gx >= map.width || gy >= map.height) ? null : { x: gx, y: gy }
  }, [map.width, map.height, zoom, pan])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const tw = DEFAULT_TILE_SIZE; const cw = Math.max(map.width * tw, 400); const ch = Math.max(map.height * tw + 60, 300)
    c.width = cw; c.height = ch
    ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom)
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, cw, ch)
    for (let li = 0; li < map.layers.length; li++) {
      const layer = map.layers[li]; if (!layer.visible) continue
      const data = ensureLayerData(layer, map.width, map.height)
      for (let y = 0; y < map.height; y++)
        for (let x = 0; x < map.width; x++) {
          const ti = data[y]?.[x] || 0
          if (ti === 0 && li !== 0) continue
          if (layer.isCollision && ti > 0) { ctx.fillStyle = COLLISION_COLOR; ctx.fillRect(x*tw, y*tw, tw, tw) }
          else if (ti > 0) { ctx.fillStyle = TILE_PALETTE[(ti-1)%TILE_PALETTE.length]; ctx.fillRect(x*tw, y*tw, tw, tw); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(x*tw+0.5, y*tw+0.5, tw-1, tw-1) }
          else if (li === 0) { ctx.fillStyle = '#2a2a3e'; ctx.fillRect(x*tw, y*tw, tw, tw) }
        }
    }
    ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1
    for (let x = 0; x <= map.width; x++) { ctx.beginPath(); ctx.moveTo(x*tw, 0); ctx.lineTo(x*tw, map.height*tw); ctx.stroke() }
    for (let y = 0; y <= map.height; y++) { ctx.beginPath(); ctx.moveTo(0, y*tw); ctx.lineTo(map.width*tw, y*tw); ctx.stroke() }
    if (hoverCell && tool !== 'entity') { ctx.fillStyle = GRID_HOVER_COLOR; ctx.fillRect(hoverCell.x*tw, hoverCell.y*tw, tw, tw) }
    if (hoverCell && tool === 'entity') { ctx.strokeStyle = '#a6e3a1'; ctx.lineWidth = 2; ctx.strokeRect(hoverCell.x*tw+1, hoverCell.y*tw+1, tw-2, tw-2) }
    ctx.restore()
    const pY = map.height * tw * zoom + pan.y + 8
    if (pY < ch) { ctx.fillStyle = '#2a2a3e'; ctx.fillRect(0, pY, cw, 56); for (let i = 0; i < TILE_PALETTE.length; i++) { const px = 8+i*36; ctx.fillStyle = TILE_PALETTE[i]; ctx.fillRect(px, pY+4, 32, 32); if (selectedTile === i+1) { ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 2; ctx.strokeRect(px-1, pY+3, 34, 34) } if (i===0) { ctx.fillStyle = '#444'; ctx.fillRect(px, pY+4, 32, 32); ctx.fillStyle = '#888'; ctx.font = '18px sans-serif'; ctx.fillText('✕', px+9, pY+26) } } }
  }, [map, hoverCell, selectedTile, activeLayerIdx, tool, zoom, pan, ensureLayerData])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { setIsPanning(true); setPanStart({ x: e.clientX-pan.x, y: e.clientY-pan.y }); return }
    const cell = getCellPos(e.clientX, e.clientY)
    if (!cell) { const c = canvasRef.current; if (!c) return; const r = c.getBoundingClientRect(); const cy2 = (e.clientY-r.top-pan.y)/zoom; const cx2 = (e.clientX-r.left-pan.x)/zoom; const pY2 = map.height*DEFAULT_TILE_SIZE+8; if (cy2>=pY2 && cy2<=pY2+48) { const idx = Math.floor((cx2-8)/36); if (idx>=0 && idx<TILE_PALETTE.length) setSelectedTile(idx+1) }; return }
    setIsDrawing(true); paintTile(cell.x, cell.y)
  }, [getCellPos, paintTile, pan, map.height])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) { setPan({ x: e.clientX-panStart.x, y: e.clientY-panStart.y }); return }
    const cell = getCellPos(e.clientX, e.clientY); setHoverCell(cell)
    if (isDrawing && cell) paintTile(cell.x, cell.y)
  }, [isPanning, isDrawing, getCellPos, paintTile, panStart])

  const addLayer = () => { const nl: TileLayer = { id: `layer-${Date.now()}`, name: `${t.rpg.ground} ${map.layers.length+1}`, data: [], visible: true, opacity: 1, isCollision: false }; onMapChange({ ...map, layers: [...map.layers, nl] }); setActiveLayerIdx(map.layers.length) }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-9 px-3 bg-editor-surface border-b border-editor-border gap-2 shrink-0">
        <div className="flex items-center gap-0.5 bg-editor-bg rounded p-0.5">
          <button onClick={()=>setTool('paint')} className={`px-2 py-1 rounded text-[11px] transition-colors ${tool==='paint'?'bg-accent/20 text-accent':'text-editor-muted hover:text-editor-text'}`}><Grid3X3 size={14} className="inline mr-1"/>{t.rpg.paint}</button>
          <button onClick={()=>setTool('erase')} className={`px-2 py-1 rounded text-[11px] transition-colors ${tool==='erase'?'bg-accent/20 text-accent':'text-editor-muted hover:text-editor-text'}`}>{t.rpg.erase}</button>
          <button onClick={()=>setTool('entity')} className={`px-2 py-1 rounded text-[11px] transition-colors ${tool==='entity'?'bg-accent-alt/20 text-accent-alt':'text-editor-muted hover:text-editor-text'}`}>👤 {t.rpg.entity}</button>
          <button onClick={()=>setTool('paint')} className="px-2 py-1 rounded text-[11px] text-editor-muted hover:text-editor-text"><Move size={14} className="inline mr-1"/>{t.rpg.pan} (Alt+drag)</button>
        </div>
        <div className="w-px h-4 bg-editor-border"/>
        <span className="text-[10px] text-editor-muted">{t.rpg.zoom}: {Math.round(zoom*100)}%</span>
        <div className="flex-1"/>
        <div className="flex items-center gap-1"><Layers size={14} className="text-editor-muted"/>
          {map.layers.map((l,i)=>(
            <button key={l.id} onClick={()=>setActiveLayerIdx(i)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${i===activeLayerIdx?'bg-accent/20 text-accent':'text-editor-muted hover:text-editor-text'}`}>{l.isCollision?'🟥':'🟩'} {l.name}</button>
          ))}
          <button onClick={addLayer} className="p-0.5 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border"><Plus size={14}/></button>
        </div>
      </div>
      <div className="flex items-center h-7 px-3 bg-editor-bg border-b border-editor-border gap-3 shrink-0">
        <span className="text-[10px] text-editor-muted">{t.rpg.active}: <span className="text-editor-text">{activeLayer?.name}</span>{activeLayer?.isCollision&&<span className="text-red-400 ml-1">({t.rpg.collision})</span>}</span>
        <button onClick={()=>{const nl=map.layers.map((l,i)=>i===activeLayerIdx?{...l,visible:!l.visible}:l);onMapChange({...map,layers:nl})}} className="text-[10px] text-editor-muted hover:text-editor-text flex items-center gap-1">{activeLayer?.visible?<Eye size={12}/>:<EyeOff size={12}/>}{activeLayer?.visible?t.rpg.visible:t.rpg.hidden}</button>
        <span className="text-[10px] text-editor-muted">{t.rpg.mapEditor}: {map.width}×{map.height} · Tile: {DEFAULT_TILE_SIZE}px</span>
      </div>
      <div className="flex-1 overflow-auto bg-[#12121e]">
        <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={()=>{setIsDrawing(false);setIsPanning(false)}} onMouseLeave={()=>{setIsDrawing(false);setIsPanning(false)}} onWheel={(e)=>{e.preventDefault();setZoom(z=>Math.max(0.25,Math.min(3,z+(e.deltaY>0?-0.1:0.1))))}} className="cursor-crosshair" style={{minWidth:'100%',minHeight:'100%'}}/>
      </div>
    </div>
  )
}

export default TileMapEditor
