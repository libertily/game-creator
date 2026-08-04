import type { GameMode } from '@shared/models/project'

export interface AISkill {
  id: string
  name: string
  nameEn: string
  icon: string
  description: string
  descriptionEn: string
  mode: GameMode | 'both'
  promptTemplate: string
  category: 'map' | 'character' | 'story' | 'ui' | 'system' | 'custom'
}

export const skillPresets: AISkill[] = [
  // === Map / RPG ===
  {
    id: 'gen-village-map',
    name: '🏘️ 生成村庄地图',
    nameEn: '🏘️ Generate Village Map',
    icon: '🗺️',
    description: '生成一个有房屋、道路和NPC的村庄地图',
    descriptionEn: 'Generate a village map with houses, roads, and NPCs',
    mode: 'rpg',
    promptTemplate: '请为我的RPG游戏生成一个村庄地图。地图尺寸20×15，包含：石头围墙、土路、木屋建筑、草地。同时在地图上放置3-4个NPC。',
    category: 'map'
  },
  {
    id: 'gen-dungeon-map',
    name: '🏚️ 生成地牢地图',
    nameEn: '🏚️ Generate Dungeon Map',
    icon: '🏚️',
    description: '生成一个包含迷宫和怪物的地牢地图',
    descriptionEn: 'Generate a dungeon map with maze-like corridors and monsters',
    mode: 'rpg',
    promptTemplate: '请为我的RPG游戏生成一个地下城地图。地图尺寸25×20，包含：石墙走廊、暗室、陷阱区域。放置5-6个怪物NPC和一个Boss。',
    category: 'map'
  },
  {
    id: 'gen-forest-map',
    name: '🌲 生成森林地图',
    nameEn: '🌲 Generate Forest Map',
    icon: '🌲',
    description: '生成一个森林探索地图，包含隐藏区域',
    descriptionEn: 'Generate a forest exploration map with hidden areas',
    mode: 'rpg',
    promptTemplate: '请生成一个森林主题的RPG地图。包含：树林、河流、隐藏的洞穴入口、林间小路。放置精灵NPC和可收集的道具。',
    category: 'map'
  },
  // === NPC / Character ===
  {
    id: 'gen-merchant-npc',
    name: '🧑‍🌾 生成商人NPC',
    nameEn: '🧑‍🌾 Generate Merchant NPCs',
    icon: '👤',
    description: '生成带有商品对话的商人NPC',
    descriptionEn: 'Generate merchant NPCs with shop dialogue',
    mode: 'rpg',
    promptTemplate: '请创建2-3个商人NPC。每个商人有不同的商品类型（武器、药水、防具），并为每个商人写3-4句对话。',
    category: 'character'
  },
  {
    id: 'gen-quest-npc',
    name: '📜 生成任务NPC',
    nameEn: '📜 Generate Quest NPCs',
    icon: '📜',
    description: '生成能给出任务的NPC，包含任务对话',
    descriptionEn: 'Generate quest-giving NPCs with mission dialogue',
    mode: 'rpg',
    promptTemplate: '请创建2个任务NPC。一个给出主线任务，一个给出支线任务。每个NPC需要：名字、位置坐标、对话（包含任务描述和奖励说明）。',
    category: 'character'
  },
  // === Story / Galgame ===
  {
    id: 'gen-romance-story',
    name: '💕 生成恋爱剧情',
    nameEn: '💕 Generate Romance Plot',
    icon: '💕',
    description: '生成校园恋爱故事，包含分支和好感度',
    descriptionEn: 'Generate a school romance story with branches and affection',
    mode: 'galgame',
    promptTemplate: '请为视觉小说创作一个校园恋爱故事。包含：3个场景（教室、操场、天台），2个可攻略角色，每个角色3-4段对话，2个分支选择点，好感度变量系统。',
    category: 'story'
  },
  {
    id: 'gen-mystery-story',
    name: '🔍 生成悬疑剧情',
    nameEn: '🔍 Generate Mystery Plot',
    icon: '🔍',
    description: '生成侦探悬疑故事，包含线索和真相',
    descriptionEn: 'Generate a detective mystery with clues and truth reveals',
    mode: 'galgame',
    promptTemplate: '请创作一个侦探悬疑视觉小说。包含：5个场景（案发现场、侦探事务所、嫌疑人住所等），3个嫌疑人角色，每个角色对话中包含隐藏线索，2-3个关键选择影响结局。',
    category: 'story'
  },
  {
    id: 'gen-fantasy-story',
    name: '⚔️ 生成奇幻冒险剧情',
    nameEn: '⚔️ Generate Fantasy Adventure',
    icon: '⚔️',
    description: '生成剑与魔法的奇幻冒险故事',
    descriptionEn: 'Generate a sword & magic fantasy adventure story',
    mode: 'galgame',
    promptTemplate: '请为视觉小说创作一个奇幻冒险故事。包含：4个场景（王城、魔法学院、龙穴、神殿），主角是见习魔法师，3个分支选择影响最终结局（成为大法师/堕入黑暗/归隐田园）。',
    category: 'story'
  },
  // === UI ===
  {
    id: 'gen-dark-theme',
    name: '🌙 暗色主题推荐',
    nameEn: '🌙 Dark Theme Suggestion',
    icon: '🎨',
    description: '推荐一套暗色系UI配色方案',
    descriptionEn: 'Recommend a dark UI color scheme',
    mode: 'both',
    promptTemplate: '请推荐一套暗色系游戏UI配色方案。需要：主色、辅色、背景色、面板色、文字色、强调色、危险色。颜色要适合长时间阅读，对比度舒适。',
    category: 'ui'
  },
  {
    id: 'gen-hud-layout',
    name: '🎮 HUD布局设计',
    nameEn: '🎮 HUD Layout Design',
    icon: '🎛️',
    description: '设计RPG游戏的HUD界面布局',
    descriptionEn: 'Design RPG game HUD interface layout',
    mode: 'rpg',
    promptTemplate: '请为RPG游戏设计HUD布局。包含：血条位置、魔法条位置、小地图位置、快捷物品栏。给出每个组件的推荐坐标和尺寸。',
    category: 'ui'
  },
  // === System ===
  {
    id: 'gen-combat-system',
    name: '⚔️ 战斗系统设计',
    nameEn: '⚔️ Combat System Design',
    icon: '⚔️',
    description: '设计回合制RPG战斗系统',
    descriptionEn: 'Design a turn-based RPG combat system',
    mode: 'rpg',
    promptTemplate: '请设计一个简单的回合制RPG战斗系统。包含：玩家攻击/防御/技能/道具四个选项，敌人AI行为模式，伤害计算公式，经验值和升级系统。',
    category: 'system'
  },
  {
    id: 'gen-dialogue-box',
    name: '💬 对话框设计',
    nameEn: '💬 Dialogue Box Design',
    icon: '💬',
    description: '设计Galgame对话框样式',
    descriptionEn: 'Design Galgame dialogue box style',
    mode: 'galgame',
    promptTemplate: '请为视觉小说设计对话框样式。包含：对话框位置（底部/顶部/全屏）、背景样式（纯色/渐变/图片）、字号、圆角、打字速度、名字框颜色。',
    category: 'system'
  }
]

export function getSkillsForMode(mode: GameMode): AISkill[] {
  return skillPresets.filter(s => s.mode === mode || s.mode === 'both')
}

export function getSkillsByCategory(category: AISkill['category']): AISkill[] {
  return skillPresets.filter(s => s.category === category)
}

export const skillCategories: { id: AISkill['category']; name: string; nameEn: string }[] = [
  { id: 'map', name: '🗺️ 地图', nameEn: '🗺️ Map' },
  { id: 'character', name: '👤 角色', nameEn: '👤 Character' },
  { id: 'story', name: '📖 剧情', nameEn: '📖 Story' },
  { id: 'ui', name: '🎨 UI', nameEn: '🎨 UI' },
  { id: 'system', name: '⚙️ 系统', nameEn: '⚙️ System' },
]
