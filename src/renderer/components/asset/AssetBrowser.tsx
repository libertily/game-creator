import React, { useMemo, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT } from '../../i18n'
import { Search, Plus, Trash2, Grid3X3, List } from 'lucide-react'
import type { AssetRef, AssetType } from '@shared/models/project'

const typeIcons: Record<AssetType, string> = { sprite: '🧍', tileset: '🧱', background: '🖼️', portrait: '👤', effect: '✨', audio: '🔊', ui: '🎛️', other: '📦' }

interface Props { onImportClick: () => void; onAssetSelect?: (a: AssetRef) => void; compact?: boolean }

const AssetBrowser: React.FC<Props> = ({ onImportClick, onAssetSelect }) => {
  const t = useT()
  const project = useEditorStore(s => s.project)
  const selectedAssetId = useEditorStore(s => s.selectedAssetId)
  const selectAsset = useEditorStore(s => s.selectAsset)
  const removeAsset = useEditorStore(s => s.removeAsset)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const types: (AssetType | 'all')[] = ['all','sprite','tileset','background','portrait','effect','audio','ui','other']

  const filtered = useMemo(() => {
    if (!project) return []
    let list = project.assets
    if (filterType !== 'all') list = list.filter(a => a.type === filterType)
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(a => a.name.toLowerCase().includes(q)) }
    return list
  }, [project, search, filterType])

  const counts = useMemo(() => {
    if (!project) return {} as Record<string, number>
    const c: Record<string, number> = { all: project.assets.length }
    for (const a of project.assets) c[a.type] = (c[a.type] || 0) + 1
    return c
  }, [project])

  if (!project) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-editor-border">
        <h3 className="text-[11px] font-semibold text-editor-muted uppercase tracking-wider">{t.asset.title} ({project.assets.length})</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-1 rounded text-editor-muted hover:text-editor-text hover:bg-editor-border" title={viewMode === 'grid' ? t.asset.listView : t.asset.gridView}>{viewMode === 'grid' ? <List size={14} /> : <Grid3X3 size={14} />}</button>
          <button onClick={onImportClick} className="p-1 rounded text-accent hover:bg-accent/10" title={t.asset.importAssets}><Plus size={14} /></button>
        </div>
      </div>
      <div className="p-2"><div className="relative"><Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-editor-muted"/><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t.asset.search} className="w-full pl-7 pr-2 py-1 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text placeholder:text-editor-muted/50 focus:outline-none focus:border-accent"/></div></div>
      <div className="px-2 pb-2 flex flex-wrap gap-1">
        {types.map(tp => (<button key={tp} onClick={() => setFilterType(tp)} className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${filterType===tp?'bg-accent/20 text-accent':'text-editor-muted hover:text-editor-text hover:bg-editor-border'}`}>{tp==='all'?t.asset.all:t.asset[tp as keyof typeof t.asset] as string}<span className="ml-1 opacity-50">{counts[tp]||0}</span></button>))}
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {filtered.length===0?(
          <div className="text-center py-8 text-editor-muted"><div className="text-2xl mb-1">📂</div><p className="text-[11px]">{search?t.asset.noAssets:t.asset.noAssets}</p><button onClick={onImportClick} className="mt-2 text-[10px] text-accent hover:underline">{t.asset.importFirst}</button></div>
        ):viewMode==='grid'?(
          <div className="grid grid-cols-2 gap-1.5">{filtered.map(a=>(<div key={a.id} onClick={()=>{selectAsset(a.id);onAssetSelect?.(a)}} onContextMenu={e=>{e.preventDefault();if(confirm(`Delete "${a.name}"?`))removeAsset(a.id)}}
            draggable onDragStart={e => {
              e.dataTransfer.setData('assetDataUrl', a.dataUrl || a.relativePath || '')
              e.dataTransfer.setData('assetType', a.type)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className={`relative group p-2 rounded cursor-pointer transition-all border ${selectedAssetId===a.id?'border-accent bg-accent/10':'border-transparent hover:border-editor-border bg-editor-bg'}`}><div className="w-full aspect-square rounded bg-editor-border mb-1.5 flex items-center justify-center text-xl">{typeIcons[a.type]||'📄'}</div><p className="text-[10px] truncate leading-tight">{a.name}</p><p className="text-[9px] text-editor-muted capitalize">{a.type}</p><button onClick={e=>{e.stopPropagation();removeAsset(a.id)}} className="absolute top-1 right-1 p-0.5 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100"><Trash2 size={10}/></button></div>))}</div>
        ):(
          <div className="space-y-0.5">{filtered.map(a=>(<div key={a.id} onClick={()=>{selectAsset(a.id);onAssetSelect?.(a)}}
            draggable onDragStart={e => {
              e.dataTransfer.setData('assetDataUrl', a.dataUrl || a.relativePath || '')
              e.dataTransfer.setData('assetType', a.type)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors ${selectedAssetId===a.id?'bg-accent/10 text-accent':'hover:bg-editor-border text-editor-text'}`}><span className="text-sm">{typeIcons[a.type]}</span><span className="flex-1 truncate">{a.name}</span><span className="text-[10px] text-editor-muted uppercase">{a.type}</span></div>))}</div>
        )}
      </div>
      <div className="px-2 py-1 border-t border-editor-border text-[9px] text-editor-muted flex justify-between"><span>{filtered.length} {t.asset.shown}</span>{selectedAssetId&&<button onClick={()=>selectAsset(null)} className="hover:text-editor-text">{t.asset.deselect}</button>}</div>
    </div>
  )
}

export default AssetBrowser
