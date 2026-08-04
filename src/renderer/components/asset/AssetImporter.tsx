import React, { useCallback, useRef, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT } from '../../i18n'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { AssetRef, AssetType } from '@shared/models/project'

function detectAssetType(name: string): AssetType {
  const nl = name.toLowerCase()
  if (/\.(wav|mp3|ogg|flac)$/i.test(name)) return 'audio'
  if (nl.includes('tile')||nl.includes('tileset')) return 'tileset'
  if (nl.includes('bg')||nl.includes('background')) return 'background'
  if (nl.includes('portrait')||nl.includes('face')||nl.includes('chara')) return 'portrait'
  if (nl.includes('effect')||nl.includes('particle')) return 'effect'
  if (nl.includes('ui')||nl.includes('button')||nl.includes('icon')) return 'ui'
  if (nl.includes('sprite')||nl.includes('player')||nl.includes('npc')) return 'sprite'
  return 'sprite'
}

interface ImportItem { id: string; name: string; path: string; type: AssetType; status: 'pending'|'importing'|'done'|'error'; error?: string }

const AssetImporter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const t = useT()
  const addAsset = useEditorStore(s => s.addAsset)
  const [items, setItems] = useState<ImportItem[]>([])
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const processFiles = useCallback((paths: string[]) => {
    setItems(prev => [...prev, ...paths.map(fp => { const nm = fp.split(/[\\/]/).pop()||'unknown'; return { id: `imp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: nm, path: fp, type: detectAssetType(nm), status: 'pending' as const } })])
  }, [])

  const handlePick = useCallback(async () => {
    try { const files = await window.electronAPI.importAssetsDialog(); if (files?.length) processFiles(files) }
    catch { const inp = document.createElement('input'); inp.type='file'; inp.multiple=true; inp.accept='image/*,audio/*'; inp.onchange=e=>{const fs=(e.target as HTMLInputElement).files;if(fs)processFiles(Array.from(fs).map(f=>(f as any).path||f.name))};inp.click() }
  }, [processFiles])

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const fs = Array.from(e.dataTransfer.files); if (fs.length) processFiles(fs.map(f=>(f as any).path||f.name)) }, [processFiles])

  const handleImport = useCallback(async () => {
    const pending = items.filter(i=>i.status==='pending'); if (!pending.length) return
    setImporting(true)
    for (const item of pending) {
      setItems(prev=>prev.map(i=>i.id===item.id?{...i,status:'importing'}:i))
      try { await new Promise(r=>setTimeout(r,300)); addAsset({ id: item.id, name: item.name, type: item.type, relativePath: `assets/${item.name}`, width:0, height:0, importedAt: new Date().toISOString() }); setItems(prev=>prev.map(i=>i.id===item.id?{...i,status:'done'}:i)) }
      catch(err:any) { setItems(prev=>prev.map(i=>i.id===item.id?{...i,status:'error',error:err.message}:i)) }
    }
    setImporting(false)
  }, [items, addAsset])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-editor-border"><h3 className="text-xs font-semibold text-editor-muted uppercase tracking-wider">{t.asset.importAssets}</h3><button onClick={onClose} className="text-editor-muted hover:text-editor-text text-sm">✕</button></div>
      <div ref={useRef<HTMLDivElement>(null)} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={handlePick} className={`m-3 p-6 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${dragOver?'border-accent bg-accent/10':'border-editor-border hover:border-editor-muted'}`}><Upload size={28} className={`mx-auto mb-2 ${dragOver?'text-accent':'text-editor-muted'}`}/><p className="text-xs text-editor-muted">{t.asset.dragDrop}</p><p className="text-[10px] text-editor-muted/60 mt-1">{t.asset.formats}</p></div>
      {items.length>0&&(<div className="flex-1 overflow-y-auto px-3"><div className="space-y-1">{items.map(item=>(<div key={item.id} className="flex items-center gap-2 p-2 rounded bg-editor-bg text-xs">{item.status==='done'?<CheckCircle size={14} className="text-accent-alt shrink-0"/>:item.status==='error'?<AlertCircle size={14} className="text-red-400 shrink-0"/>:item.status==='importing'?<Loader2 size={14} className="text-accent animate-spin shrink-0"/>:<div className="w-3.5 h-3.5 rounded border border-editor-border shrink-0"/>}<span className="flex-1 truncate">{item.name}</span><span className="text-[10px] text-editor-muted uppercase shrink-0">{item.type}</span></div>))}</div></div>)}
      <div className="p-3 border-t border-editor-border flex gap-2">
        <button onClick={handleImport} disabled={importing||!items.filter(i=>i.status==='pending').length} className="flex-1 py-1.5 bg-accent text-editor-bg text-xs font-semibold rounded hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed">{importing?t.asset.importing:`${t.asset.importBtn} (${items.filter(i=>i.status==='pending').length})`}</button>
        <button onClick={()=>setItems(prev=>prev.filter(i=>i.status==='pending'))} className="px-3 py-1.5 text-xs text-editor-muted hover:text-editor-text">{t.asset.clear}</button>
      </div>
    </div>
  )
}

export default AssetImporter
