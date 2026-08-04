import React, { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useT, useLanguage } from '../../i18n'
import { Gamepad2, MessageSquare, Sparkles, FolderOpen, BookOpen, Play } from 'lucide-react'
import type { GameMode, GameProject } from '@shared/models/project'
import { rpgVillageDemo, galgameSchoolDemo } from '../../demoData'

const templates = [
  { id: 'rpg-starter', mode: 'rpg' as GameMode, name: 'RPG 入门', desc: '空白RPG项目，包含基础地图模板', icon: '🗺️' },
  { id: 'galgame-starter', mode: 'galgame' as GameMode, name: 'Galgame 入门', desc: '空白视觉小说项目，包含示例场景', icon: '💬' },
]

const ProjectManager: React.FC = () => {
  const t = useT()
  const { lang } = useLanguage()
  const newProject = useEditorStore(s => s.newProject)
  const openProject = useEditorStore(s => s.openProject)
  const loadDemo = useEditorStore(s => s.loadDemo)
  const [mode, setMode] = useState<GameMode>('rpg')
  const [projectName, setProjectName] = useState('我的游戏')
  const [projectDesc, setProjectDesc] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [selTpl, setSelTpl] = useState('rpg-starter')
  const [showGuide, setShowGuide] = useState(false)

  const handleCreate = () => {
    newProject(mode, projectName || t.project.untitled)
    // store description + logo in project meta after creation
    if (projectDesc || logoUrl) {
      setTimeout(() => {
        const s = useEditorStore.getState()
        if (s.project) {
          s.updateMeta({ description: projectDesc })
        }
      }, 50)
    }
  }

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleOpen = async () => {
    try {
      const fp = await window.electronAPI.openProjectDialog()
      if (!fp) return
      const res = await fetch(`file://${fp}`)
      const data: GameProject = await res.json()
      openProject(data, fp)
    } catch { newProject('rpg', 'Demo') }
  }

  if (showGuide) {
    return (
      <div className="flex items-center justify-center h-full bg-editor-bg">
        <div className="w-full max-w-2xl p-8 overflow-y-auto max-h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-accent flex items-center gap-2"><BookOpen size={20}/>快速上手指南</h2>
            <button onClick={()=>setShowGuide(false)} className="text-sm text-editor-muted hover:text-editor-text">← 返回</button>
          </div>
          <div className="space-y-6 text-sm text-editor-text">
            {[
              { title: '🎮 第一步：选择游戏类型', body: <>点击 <span className="text-accent">RPG</span> 制作俯视角冒险游戏，点击 <span className="text-accent-alt">Galgame</span> 制作视觉小说。</> },
              { title: '🗺️ RPG 编辑器', body: <>左侧调色板选择瓦片 → 在画布上绘制地图 → 右侧放置 NPC/传送门/道具。<br/>按 <kbd className="px-1 py-0.5 bg-editor-bg rounded text-[10px]">Alt+拖拽</kbd> 平移，<kbd className="px-1 py-0.5 bg-editor-bg rounded text-[10px]">滚轮</kbd> 缩放。<br/>按 <kbd className="px-1 py-0.5 bg-editor-bg rounded text-[10px]">Ctrl+Z</kbd> 撤销，<kbd className="px-1 py-0.5 bg-editor-bg rounded text-[10px]">Ctrl+Y</kbd> 重做。</> },
              { title: '💬 Galgame 编辑器', body: <>点击「添加对话」创建对话节点 → 拖拽节点下方圆点连线 → 右侧编辑对话内容。<br/>「添加分支」可创建选项节点，让玩家做出选择。</> },
              { title: '🎨 UI 编辑器', body: '左侧工具栏点击调色板图标 → 自定义游戏主题色、HUD布局、对话框样式。' },
              { title: '🤖 AI 助手', body: <>左侧点击机器人图标 → 选择「辅助模式」分步生成，或「全自动」一键生成。<br/>展开「技能预设」可使用预制的 Prompt 模板。</> },
              { title: '💾 保存与导出', body: <>点击标题栏保存按钮下载 <code className="text-[11px] bg-editor-bg px-1 rounded">.gcproj</code> 项目文件。<br/>点击导出按钮导出 JSON，可用于 Pygame 引擎直接运行。</> },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-editor-surface border border-editor-border">
                <h3 className="font-bold text-accent mb-2">{item.title}</h3>
                <p className="text-editor-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full bg-editor-bg">
      <div className="w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-accent mb-1"><Sparkles className="inline mr-2" size={24}/>{t.app.title}</h1>
          <p className="text-sm text-editor-muted">{t.app.subtitle}</p>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-editor-muted uppercase tracking-wider mb-2">{t.project.gameType}</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>{setMode('rpg');setSelTpl('rpg-starter')}} className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${mode==='rpg'?'border-accent bg-accent/10':'border-editor-border hover:border-editor-muted'}`}>
              <Gamepad2 size={32} className={mode==='rpg'?'text-accent':'text-editor-muted'}/><span className="mt-2 text-sm font-medium">{t.project.rpg}</span><span className="text-[10px] text-editor-muted">{t.project.rpgDesc}</span>
            </button>
            <button onClick={()=>{setMode('galgame');setSelTpl('galgame-starter')}} className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${mode==='galgame'?'border-accent-alt bg-accent-alt/10':'border-editor-border hover:border-editor-muted'}`}>
              <MessageSquare size={32} className={mode==='galgame'?'text-accent-alt':'text-editor-muted'}/><span className="mt-2 text-sm font-medium">{t.project.galgame}</span><span className="text-[10px] text-editor-muted">{t.project.galgameDesc}</span>
            </button>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-editor-muted uppercase tracking-wider mb-2">{t.project.projectName}</label>
          <input type="text" value={projectName} onChange={e=>setProjectName(e.target.value)} className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text text-sm focus:outline-none focus:border-accent" placeholder={t.project.untitled}/>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-editor-muted uppercase tracking-wider mb-2">{t.project.description || '描述'}</label>
          <textarea value={projectDesc} onChange={e=>setProjectDesc(e.target.value)} rows={2} className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text text-sm focus:outline-none focus:border-accent resize-none" placeholder={lang==='zh'?'简要描述你的游戏...':'Briefly describe your game...'}/>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-editor-muted uppercase tracking-wider mb-2">Logo / 封面图</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-editor-bg border border-editor-border flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo"/> : <span className="text-2xl opacity-30">🖼️</span>}
            </div>
            <div>
              <label className="inline-block px-3 py-1.5 bg-editor-bg border border-editor-border rounded text-[11px] text-editor-text hover:bg-editor-border cursor-pointer">
                浏览文件
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile}/>
              </label>
              {logoUrl && <button onClick={()=>setLogoUrl('')} className="ml-2 text-[10px] text-red-400 hover:underline">清除</button>}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-editor-muted uppercase tracking-wider mb-2">{t.project.template}</label>
          <div className="space-y-2">
            {templates.filter(x=>x.mode===mode).map(tpl=>(
              <button key={tpl.id} onClick={()=>setSelTpl(tpl.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${selTpl===tpl.id?'border-accent bg-accent/5':'border-editor-border hover:border-editor-muted'}`}>
                <span className="text-xl">{tpl.icon}</span><div className="text-left"><p className="text-sm font-medium">{tpl.name}</p><p className="text-[10px] text-editor-muted">{tpl.desc}</p></div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          <button onClick={handleCreate} className="flex-1 py-2.5 bg-accent text-editor-bg font-semibold rounded-lg text-sm hover:bg-accent/80">{t.project.createNew}</button>
          <button onClick={handleOpen} className="flex items-center gap-1 px-4 py-2.5 border border-editor-border rounded-lg text-sm text-editor-text hover:bg-editor-surface"><FolderOpen size={16}/>{t.project.open}</button>
        </div>

        <div className="border-t border-editor-border pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-editor-muted uppercase tracking-wider">📦 示例作品</span>
            <button onClick={()=>setShowGuide(true)} className="ml-auto text-[11px] text-accent hover:underline flex items-center gap-1"><BookOpen size={12}/>快速上手</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => loadDemo(rpgVillageDemo)} className="flex items-center gap-2 p-3 rounded-lg border border-editor-border hover:border-accent transition-all text-left">
              <Play size={18} className="text-accent shrink-0"/><div><p className="text-xs font-medium text-editor-text">🏘️ 勇者村庄</p><p className="text-[10px] text-editor-muted">RPG · NPC对话 · 传送门</p></div>
            </button>
            <button onClick={() => loadDemo(galgameSchoolDemo)} className="flex items-center gap-2 p-3 rounded-lg border border-editor-border hover:border-accent-alt transition-all text-left">
              <Play size={18} className="text-accent-alt shrink-0"/><div><p className="text-xs font-medium text-editor-text">💕 校园物语</p><p className="text-[10px] text-editor-muted">Galgame · 分支 · 好感度</p></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectManager
