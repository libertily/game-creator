import React, { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT, useLanguage } from '../../i18n'
import { Bot, Send, User, Sparkles, Loader2, Zap, ChevronDown, Plus, X } from 'lucide-react'
import { skillPresets, getSkillsForMode, skillCategories, type AISkill } from './skills'

interface Message { role: 'user' | 'assistant'; content: string }

const AssistChatPanel: React.FC = () => {
  const t = useT()
  const { lang } = useLanguage()
  const project = useEditorStore(s => s.project)
  const mode = project?.meta.mode || 'rpg'
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.ai.greeting }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [messages])

  const availableSkills = getSkillsForMode(mode).filter(s => selectedCategory === 'all' || s.category === selectedCategory)

  const applySkill = (skill: AISkill) => {
    setInput(skill.promptTemplate)
    setShowSkills(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg]); setInput(''); setLoading(true)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))

    const lower = userMsg.content.toLowerCase()
    let response = t.ai.mapHelp
    if (lower.includes('npc') || lower.includes('角色') || lower.includes('商人')) response = t.ai.npcHelp
    else if (lower.includes('对话') || lower.includes('剧情') || lower.includes('故事') || lower.includes('story')) response = t.ai.dialogueHelp
    else if (lower.includes('主题') || lower.includes('颜色') || lower.includes('配色') || lower.includes('theme')) response = t.ai.themeHelp
    else if (lower.includes('地牢') || lower.includes('森林') || lower.includes('dungeon')) response = '🏚️ 正在根据你的需求生成地牢/森林地图...\n\n请稍候，我将在编辑器中创建相应的地图和实体。'
    else if (lower.includes('战斗') || lower.includes('combat') || lower.includes('系统')) response = '⚔️ 战斗系统设计方案：\n\n1. 回合制：玩家选择攻击/防御/技能/道具\n2. 伤害 = 攻击力 - 防御力\n3. 经验值累积升级\n4. 敌人AI：随机选择攻击或技能'

    setMessages(prev => [...prev, { role: 'assistant', content: response }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1"><Sparkles size={14} /> {t.ai.assistant}</h3>
        <p className="text-[10px] text-editor-muted mt-0.5">{project?.meta.mode === 'rpg' ? t.ai.modeRPG : t.ai.modeGalgame} · {t.ai.assisted}</p>
      </div>

      {/* Skill Selector */}
      <div className="border-b border-editor-border">
        <button onClick={() => setShowSkills(!showSkills)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-editor-muted hover:text-editor-text hover:bg-editor-border/30 transition-colors">
          <span className="flex items-center gap-1.5"><Zap size={12} className="text-accent-alt" />{lang === 'zh' ? '技能预设' : 'Skill Presets'} ({availableSkills.length})</span>
          <ChevronDown size={12} className={`transition-transform ${showSkills ? 'rotate-180' : ''}`} />
        </button>
        {showSkills && (
          <div className="px-3 pb-2">
            {/* Category filter */}
            <div className="flex gap-1 mb-2 flex-wrap">
              <button onClick={() => setSelectedCategory('all')} className={`px-1.5 py-0.5 rounded text-[9px] ${selectedCategory === 'all' ? 'bg-accent/20 text-accent' : 'text-editor-muted hover:text-editor-text'}`}>{lang === 'zh' ? '全部' : 'All'}</button>
              {skillCategories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={`px-1.5 py-0.5 rounded text-[9px] ${selectedCategory === cat.id ? 'bg-accent/20 text-accent' : 'text-editor-muted hover:text-editor-text'}`}>
                  {lang === 'zh' ? cat.name : cat.nameEn}
                </button>
              ))}
            </div>
            {/* Skill cards */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableSkills.map(skill => (
                <button key={skill.id} onClick={() => applySkill(skill)}
                  className="w-full flex items-start gap-2 p-2 rounded text-left hover:bg-editor-border transition-colors group">
                  <span className="text-sm shrink-0 mt-0.5">{skill.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-editor-text font-medium">{lang === 'zh' ? skill.name : skill.nameEn}</p>
                    <p className="text-[9px] text-editor-muted line-clamp-1">{lang === 'zh' ? skill.description : skill.descriptionEn}</p>
                  </div>
                  <Plus size={12} className="text-accent opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                </button>
              ))}
              {availableSkills.length === 0 && (
                <p className="text-[10px] text-editor-muted text-center py-2">{lang === 'zh' ? '此分类下暂无技能' : 'No skills in this category'}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5"><Bot size={12} className="text-accent" /></div>}
            <div className={`px-3 py-2 rounded-lg text-xs max-w-[85%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-accent/20 text-editor-text' : 'bg-editor-bg text-editor-text'}`}>{msg.content}</div>
            {msg.role === 'user' && <div className="w-6 h-6 rounded-full bg-editor-border flex items-center justify-center shrink-0 mt-0.5"><User size={12} className="text-editor-muted" /></div>}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0"><Loader2 size={12} className="text-accent animate-spin" /></div><div className="px-3 py-2 rounded-lg bg-editor-bg text-xs text-editor-muted">{t.ai.thinking}</div></div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-editor-border">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={t.ai.askHelp}
            className="flex-1 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-xs text-editor-text placeholder:text-editor-muted/50 focus:outline-none focus:border-accent" />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            className="px-3 py-2 bg-accent text-editor-bg rounded-lg hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed"><Send size={14} /></button>
        </div>
      </div>
    </div>
  )
}

export default AssistChatPanel
