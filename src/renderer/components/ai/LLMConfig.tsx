import React, { useState } from 'react'
import { useT, useLanguage } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import { Bot, Key, Globe, Cpu, Check, Eye, EyeOff, Plus, Trash2, Tag, MessageSquare, Palette, Map } from 'lucide-react'

const ROLES = [
  { id: 'general', label: '通用', icon: Bot },
  { id: 'dialogue', label: '对话/剧情', icon: MessageSquare },
  { id: 'map', label: '地图生成', icon: Map },
  { id: 'theme', label: 'UI/主题', icon: Palette },
]

interface LLMConfigProps { onSave: () => void; onCancel: () => void }

const LLMConfig: React.FC<LLMConfigProps> = ({ onSave, onCancel }) => {
  const t = useT()
  const { lang } = useLanguage()
  const { llmModels, addLLMModel, removeLLMModel, updateLLMModel } = useEditorStore()
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})

  const [newName, setNewName] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [newBaseUrl, setNewBaseUrl] = useState('https://api.openai.com/v1')
  const [newModel, setNewModel] = useState('')
  const [newRole, setNewRole] = useState('general')

  const addModel = () => {
    if (!newModel.trim()) return
    addLLMModel({ id: `llm-${Date.now()}`, name: newName.trim() || newModel.trim(), apiKey: newApiKey, baseUrl: newBaseUrl, model: newModel.trim(), role: newRole })
    setNewName(''); setNewApiKey(''); setNewModel(''); setNewBaseUrl('https://api.openai.com/v1'); setNewRole('general')
  }

  const inp = "w-full px-2 py-1.5 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text focus:outline-none focus:border-accent font-mono"
  const lbl = "text-[9px] text-editor-muted block mb-0.5"

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border flex items-center justify-between shrink-0">
        <h3 className="text-xs font-semibold text-editor-muted uppercase tracking-wider flex items-center gap-1"><Bot size={14} className="text-accent" /> {t.ai.configTitle}</h3>
        <button onClick={onCancel} className="text-editor-muted hover:text-editor-text text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <p className="text-[10px] text-editor-muted">{lang === 'zh' ? '配置多个 LLM 模型，不同任务可选用不同模型协作。' : 'Configure multiple LLM models for different tasks.'}</p>

        {llmModels.map(m => {
          const roleInfo = ROLES.find(r => r.id === m.role) || ROLES[0]
          return (
            <div key={m.id} className="p-3 bg-editor-bg rounded border border-editor-border space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <roleInfo.icon size={12} className="text-accent-alt"/>
                  <span className="text-[11px] font-semibold text-editor-text">{m.name}</span>
                  <span className="text-[8px] px-1 rounded bg-accent/10 text-accent">{roleInfo.label}</span>
                </div>
                <button onClick={() => removeLLMModel(m.id)} className="p-0.5 rounded text-red-400 hover:bg-red-400/10"><Trash2 size={12}/></button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div><label className={lbl}><Globe size={10} className="inline mr-0.5"/>URL</label><input type="text" value={m.baseUrl} onChange={e => updateLLMModel(m.id, { baseUrl: e.target.value })} className={`${inp} text-[10px]`}/></div>
                <div><label className={lbl}><Cpu size={10} className="inline mr-0.5"/>Model</label><input type="text" value={m.model} onChange={e => updateLLMModel(m.id, { model: e.target.value })} className={`${inp} text-[10px]`}/></div>
              </div>
              <div><label className={lbl}><Key size={10} className="inline mr-0.5"/>Key</label>
                <div className="relative">
                  <input type={showKey[m.id] ? 'text' : 'password'} value={m.apiKey} onChange={e => updateLLMModel(m.id, { apiKey: e.target.value })} className={inp} placeholder="sk-..."/>
                  <button onClick={() => setShowKey(s => ({ ...s, [m.id]: !s[m.id] }))} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-editor-muted hover:text-editor-text">{showKey[m.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
                </div>
              </div>
              <div><label className={lbl}><Tag size={10} className="inline mr-0.5"/>Role</label>
                <div className="flex gap-1 flex-wrap">{ROLES.map(r => (<button key={r.id} onClick={() => updateLLMModel(m.id, { role: r.id })} className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${m.role===r.id?'bg-accent/15 border-accent/30 text-accent':'border-editor-border text-editor-muted hover:border-accent/30'}`}><r.icon size={10}/> {r.label}</button>))}</div>
              </div>
            </div>
          )
        })}

        <div className="p-3 bg-editor-bg rounded border border-editor-border border-dashed space-y-2">
          <h4 className="text-[10px] font-semibold text-editor-muted uppercase flex items-center gap-1"><Plus size={12}/> {lang === 'zh' ? '添加模型' : 'Add Model'}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}><Cpu size={10} className="inline mr-0.5"/>Model *</label><input type="text" value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="gpt-4o / claude-3.5-sonnet / deepseek-chat..." className={inp}/></div>
            <div><label className={lbl}>Name</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={lang==='zh'?'可选别名':'Optional alias'} className={inp}/></div>
          </div>
          <div><label className={lbl}><Key size={10} className="inline mr-0.5"/>API Key</label><input type="password" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} placeholder="sk-..." className={inp}/></div>
          <div><label className={lbl}><Globe size={10} className="inline mr-0.5"/>Base URL</label><input type="text" value={newBaseUrl} onChange={e => setNewBaseUrl(e.target.value)} className={inp}/></div>
          <div><label className={lbl}><Tag size={10} className="inline mr-0.5"/>Role</label>
            <div className="flex gap-1 flex-wrap">{ROLES.map(r => (<button key={r.id} onClick={() => setNewRole(r.id)} className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${newRole===r.id?'bg-accent/15 border-accent/30 text-accent':'border-editor-border text-editor-muted hover:border-accent/30'}`}><r.icon size={10}/> {r.label}</button>))}</div>
          </div>
          <button onClick={addModel} disabled={!newModel.trim()} className="w-full py-1.5 bg-accent text-editor-bg text-[11px] font-semibold rounded hover:bg-accent/80 disabled:opacity-30 flex items-center justify-center gap-1"><Plus size={12}/> {lang==='zh'?'添加此模型':'Add Model'}</button>
        </div>
      </div>

      <div className="p-3 border-t border-editor-border flex gap-2 shrink-0">
        <button onClick={() => onSave()} className="flex-1 py-2 bg-accent text-editor-bg text-xs font-semibold rounded hover:bg-accent/80 flex items-center justify-center gap-1"><Check size={14} /> {t.ai.saveConnect}</button>
        <button onClick={onCancel} className="px-4 py-2 text-xs text-editor-muted hover:text-editor-text">{t.ai.cancel}</button>
      </div>
    </div>
  )
}

export default LLMConfig
