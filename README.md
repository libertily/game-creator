# 🎮 游戏创作器 (Game Creator)

> 2D 游戏创作桌面应用 — 可视化编辑器，AI 辅助，一键 Pygame 预览

支持 **RPG（俯视角冒险）** 和 **Galgame（视觉小说）** 两种游戏类型。

## ✨ 功能特性

- 🗺️ **RPG 地图编辑器** — 瓦片绘制、碰撞层、实体放置（NPC/传送门/道具）
- 💬 **Galgame 对话树** — ReactFlow 节点编辑器，分支选择，角色绑定，场景切换
- 🎨 **可视化场景管理** — 背景图/视频/BGM 导入，自定义过渡效果，场景-对话联动
- 👤 **角色系统** — 立绘导入、多表情管理、屏幕位置设置
- 🎛️ **UI 主题编辑器** — 配色方案、对话框样式、HUD 布局、菜单界面
- 🤖 **AI 多模型协作** — 支持多个 LLM 配置，不同角色（通用/对话/地图/主题）
- 📦 **素材库** — 拖拽导入，拖放到场景/角色快速绑定
- 🕹️ **一键预览** — F5 启动 Pygame 引擎实时试玩
- 🌐 **中英双语** — 完整 i18n 支持
- 💾 **退出确认** — 未保存提示，localStorage 自动缓存 Demo

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 31 |
| 前端 | React 18 + TypeScript 5 + Vite 5 |
| 样式 | Tailwind CSS 3 |
| 节点编辑器 | ReactFlow 11 + @reactflow/node-resizer |
| 状态管理 | Zustand 4 |
| 图标 | Lucide React |
| 游戏引擎 | Pygame-ce 2.5 + Python 3.14 |
| 后端 API | FastAPI (Uvicorn) |
| 打包 | electron-builder 24 |

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Python 3.14+ (推荐) 或 3.10+
- Windows / macOS / Linux

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/libertily/game-creator.git
cd game-creator

# 安装前端依赖
npm install

# 安装 Python 依赖
pip install -r backend/requirements.txt

# 启动开发模式
npm run dev

# 打包为 EXE
npm run build
```

### 开发模式
- 前端：`http://localhost:5173`
- Python 后端：`http://127.0.0.1:18721`
- F5 启动 Pygame 预览窗口

## 📂 项目结构

```
game-creator/
├── electron/           # Electron 主进程
├── src/
│   └── renderer/
│       ├── components/
│       │   ├── layout/      # 主布局、面板管理
│       │   ├── project/     # 项目创建、Demo 加载
│       │   ├── rpg/         # RPG 地图/实体编辑器
│       │   ├── galgame/     # 对话树/场景/角色管理
│       │   ├── ui-editor/   # UI 主题/对话框/菜单编辑器
│       │   ├── ai/          # LLM 配置、AI 助手
│       │   └── asset/       # 素材浏览器/导入器
│       ├── stores/          # Zustand 状态管理
│       ├── i18n/            # 中英文翻译
│       └── demoData.ts      # 内嵌 Demo 数据
├── shared/models/      # TypeScript 数据模型
├── backend/
│   ├── engine/         # Pygame 游戏引擎
│   └── main.py         # FastAPI 服务
├── demos/              # 示例项目文件
└── templates/          # 项目模板
```

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。

部分代码由 AI（GitHub Copilot / Claude）辅助生成。

---

**Made with ❤️ by libertily**
