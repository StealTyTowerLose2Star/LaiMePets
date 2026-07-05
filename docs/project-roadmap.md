# LaiMePet 项目全景规划

> **更新日期**：2026-07-05 | **当前阶段**：Sprint 1 完成 → Sprint 2 待启动 | **目标版本**：V1.0 MVP

---

## 一、项目愿景

```
┌─────────────────────────────────────────────────────────────────┐
│                     LaiMePet — 让宠物"活"在桌面上                    │
│                                                                 │
│   V1.0 "宠物数字化"        V2.0 "虚实联动"        V3.0 "数字永生"     │
│   AI 照片→3D 桌面伴侣      IoT 智能硬件联动         行为建模+记忆系统   │
│   ─────────────────▶      ─────────▶             ─────────▶      │
│   2026 Q3-Q4              2027                    2028+           │
└─────────────────────────────────────────────────────────────────┘
```

**一句话**：用户上传真实宠物照片，AI 生成 3D 形象，作为桌面宠物长期陪伴。

**产品形态**：Tauri v2 Windows 桌面原生应用（非 Web 页面）。

---

## 二、技术架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                     LaiMePet 架构全景                          │
│                                                              │
│   ┌─ Windows/macOS ──────────────────────────────────────┐  │
│   │                                                       │  │
│   │  ┌─────────────┐     ┌──────────────────────┐        │  │
│   │  │ Tauri Shell │     │  WebView2 (React 19)  │        │  │
│   │  │  (Rust)     │◀───▶│  ┌────────────────┐  │        │  │
│   │  │             │ IPC │  │ Three.js/R3F   │  │        │  │
│   │  │ • 窗口管理   │     │  │ 3D 宠物渲染     │  │        │  │
│   │  │ • 系统托盘   │     │  └────────────────┘  │        │  │
│   │  │ • 材质API   │     │  ┌────────────────┐  │        │  │
│   │  │ • 原生通知   │     │  │ React 组件树    │  │        │  │
│   │  │ • 开机自启   │     │  │ (UI 面板/弹窗)  │  │        │  │
│   │  │ • 快捷键     │     │  └────────────────┘  │        │  │
│   │  └──────┬──────┘     └──────────┬───────────┘        │  │
│   │         │                       │                    │  │
│   │         │         ┌─────────────▼───────────┐        │  │
│   │         │         │  Zustand Store (状态管理) │        │  │
│   │         │         │  • petStore              │        │  │
│   │         │         │  • settingsStore         │        │  │
│   │         │         └─────────────┬───────────┘        │  │
│   │         │                       │                    │  │
│   │  ┌──────▼───────────────────────▼───────────┐        │  │
│   │  │  Python Sidecar (FastAPI :8000)           │        │  │
│   │  │  • 7 路 AI 后端路由                       │        │  │
│   │  │  • 照片质量预检 / rembg 背景移除            │        │  │
│   │  │  • GLB 模型存储 / 缩略图                   │        │  │
│   │  │  • 任务状态轮询 / 过期清理                  │        │  │
│   │  └──────────────────────────────────────────┘        │  │
│   └───────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌─ 云端 API ──────────────────────────────────────────┐   │
│   │  DashScope (阿里云百炼) — 主力 AI 后端               │   │
│   │  Replicate / Tripo / Meshy — 备选/对照              │   │
│   └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

| 层 | 技术 | 职责 |
|----|------|------|
| **Shell** | Tauri v2 (Rust) | 窗口管理、系统托盘、Mica/Acrylic 材质、快捷键、Sidecar 生命周期 |
| **UI** | React 19 + TypeScript 5.8 | 界面面板、弹窗、Toast、引导流程、设置 |
| **3D** | Three.js 0.185 + R3F 9.6 + Drei 10.7 | 宠物模型渲染、骨骼动画、场景光照、写实度着色 |
| **状态** | Zustand 5 | 宠物数据(petStore)、设置(settingsStore)、路由(useRouter) |
| **AI Sidecar** | Python FastAPI 0.115 | 照片→3D 生成、rembg 抠图、模型存储、任务管理 |
| **构建** | Vite 6 + Tailwind CSS 4 | 前端构建、设计 Token 系统 |

---

## 三、当前进度总览（2026-07-05）

### 3.1 代码完成度

| 模块 | 完成度 | 状态 | 说明 |
|------|:------:|:----:|------|
| Tauri Shell 框架 | 🟢 80% | 开发中 | 窗口管理/托盘/Sidecar 已实现；打包未做 |
| React 前端界面 | 🟢 80% | 基本完成 | 4 页面全部实现，已清理 DEV-only 代码 |
| 3D 宠物渲染 | 🟡 70% | 核心就绪 | PetCanvas/动画/着色器完成，真实 GLB 待验证 |
| FastAPI Sidecar | 🟢 80% | 基本完成 | 7 端点全部实现，DashScope E2E 通过 |
| UI 组件库 | 🟢 80% | 基本完成 | Button/Slider/Toggle/Toast/Dialog/ContextMenu |
| 前端测试 | 🟡 50% | 基础覆盖 | 6 组件测试通过，E2E 未做 |
| 后端测试 | 🟢 75% | 分层完整 | smoke + error handling + cloud E2E 参数化 |
| 打包/安装 | 🔴 0% | 未开始 | tauri.conf 已配置，未构建 MSI/NSIS |

### 3.2 2026-07-05 清理记录

| 操作 | 文件 | 原因 |
|------|------|------|
| 删除 | `src/pages/ThreeDemo.tsx` | DEV-only 3D 验证页 |
| 删除 | `src/components/pet/ModelInspector.tsx` | DEV-only GLB 调试面板 |
| 清理 | `PetCanvas.tsx` | 移除 ModelInspector + DEV 性能标签 |
| 清理 | `useRouter.ts` `App.tsx` `index.ts` | 移除 ThreeDemo/ModelInspector 引用 |
| 清理 | `AGENTS.md` `config.py` | 移除 codex.py/Copilot 旧引用 |
| 删除 | `.claude/backend_developer.md` | 空无效文件 |
| 删除 | `services/services/openai_client.py` | OpenAI API 模式（用户用 Codex OAuth） |
| 删除 | `services/tools/codex.py` | OpenAI API 辅助脚本 |

### 3.3 按用户故事覆盖

| 优先级 | 用户故事 | 设计 | 前端 | 后端 | 集成 |
|:------:|---------|:----:|:----:|:----:|:----:|
| P0 | US-01 照片→3D 生成 | ✅ | ✅ | ✅ | ⚠️ |
| P0 | US-02 写实度控制 | ✅ | ✅ | — | ❌ |
| P0 | US-03 自主行为 | ✅ | ✅ | N/A | ⚠️ |
| P0 | US-04 抚摸互动 | ✅ | ✅ | N/A | ⚠️ |
| P0 | US-05 显示模式切换 | ✅ | ✅ | N/A | ⚠️ |
| P1 | US-06 互动按钮 | ✅ | ✅ | N/A | ⚠️ |
| P1 | US-07 投喂 | ✅ | ✅ | N/A | ⚠️ |
| P1 | US-08 心情系统 | ✅ | ✅ | N/A | ⚠️ |
| P1 | US-09 多宠切换 | ✅ | ✅ | ✅ | ⚠️ |
| P2 | US-10 真实声音 | ❌ | ❌ | ❌ | ❌ |
| P2 | US-11 定时提醒 | ✅ | ✅ | N/A | ⚠️ |
| P2 | US-12 虚拟配饰 | ❌ | ❌ | ❌ | ❌ |

---

## 四、Claude Code ↔ Codex CLI 完整分工

### 分工原则

```
Claude Code（本会话）                     Codex CLI（终端 codex 命令）
┌───────────────────────┐              ┌──────────────────────────┐
│ /pm   产品经理          │              │ /fe   前端开发              │
│ /design  UI/UX 设计师   │              │ /be   后端开发              │
│ /pjm   项目经理         │              │ /qa   测试工程师            │
│                       │              │                          │
│ 读 .claude/prompts/   │              │ 读 AGENTS.md             │
│ 产品策略/设计/管理      │              │ 写代码/审查/测试            │
└───────────────────────┘              └──────────────────────────┘
```

### Claude Code 角色详情

| 触发词 | 角色 | 提示词 | 职责 |
|--------|------|--------|------|
| `/pm`、`产品经理` | PM | `.claude/prompts/product_manage.md` | PRD、用户故事、功能优先级、竞品分析 |
| `/design`、`设计师`、`UI`、`UX` | Designer | `.claude/prompts/designer.md` | 交互设计、视觉规范、动效定义、设计系统 |
| `/pjm`、`项目经理`、`进度` | PjM | `.claude/prompts/project_manager.md` | 进度跟踪、风险管理、阶段评审、方向把控 |

### Codex CLI 角色详情

| 触发词 | 角色 | 上下文 | 示例命令 |
|--------|------|--------|---------|
| `/fe`、`前端` | FE | `AGENTS.md` | `codex "优化 PetCanvas LOD 渲染"` |
| `/be`、`后端` | BE | `AGENTS.md` | `codex "添加 Sidecar 崩溃重启逻辑"` |
| `/qa`、`测试` | QA | `AGENTS.md` | `codex "写 Tauri 窗口切换 E2E 测试"` |

### 切换流程

```
用户消息触发 /fe /be /qa
  → Claude 输出引导："请在终端使用 codex 命令"
  → 不读取代码提示词文件，不写代码
  → 可提及 AGENTS.md 已配置项目上下文

用户消息触发 /pm /design /pjm
  → Claude 读取 .claude/prompts/*.md
  → 以对应角色身份执行
  → 按思考链路 + 输出规范交付

用户消息无触发词
  → Claude 判断是否属于产品/设计/管理范畴
  → 无法判断时主动询问
```

---

## 五、Sprint 2 — 可打包运行的桌面宠物 MVP

```
目标：让 LaiMePet 作为真正的 Windows 原生应用运行起来
```

| # | 任务 | 角色 | 优先级 | 估时 | 依赖 |
|---|------|------|:------:|:----:|------|
| 2.1 | **Tauri 打包配置**：MSI/NSIS WiX 定制 + 品牌化 | /be | 🔴 P0 | 2d | — |
| 2.2 | **Sidecar 打包**：PyInstaller 打包 services/ 为独立 exe，配置 externalBin | /be | 🔴 P0 | 2d | — |
| 2.3 | **真实 GLB 验收**：真实猫照片 → DashScope → Tauri WebView 加载 | /fe | 🔴 P0 | 2d | — |
| 2.4 | **Sidecar 集成测试**：启动/重启/崩溃恢复/端口检测 | /be+fe | 🔴 P0 | 2d | 2.2 |
| 2.5 | **悬浮窗完整验证**：透明无边框 + 点击穿透 + 置顶 + 任务栏隐藏 | /fe | 🔴 P0 | 1d | — |
| 2.6 | **动画打磨**：骨骼动画混合过渡 + 9 行为最终效果 | /fe | 🟡 P1 | 2d | 2.3 |
| 2.7 | **性能优化**：LOD 分级 + dpr 自适应 + 视锥剔除 | /fe | 🟡 P1 | 2d | — |
| 2.8 | **持久化迁移**：localStorage → Tauri FS API | /fe | 🟡 P1 | 1d | — |
| 2.9 | **前/后端联调**：API 全链路（健康/生成/轮询/下载/列表） | /fe+be | 🔴 P0 | 1d | 2.2 |
| 2.10 | **E2E 测试**：安装→启动→创建→桌面显示完整流程 | /qa | 🔴 P0 | 2d | 2.1-2.9 |
| 2.11 | **L2 设计走查**：视觉还原度/材质/动效 | /design | 🟡 P1 | 1d | 2.5-2.7 |

### Sprint 2 完成标准

- ✅ 双击 .msi/.exe 可安装
- ✅ Python 随安装包分发（用户无需单独安装 Python）
- ✅ 宠物在 Windows 桌面正常渲染
- ✅ 照片→3D 宠物全链路打通
- ✅ 基础性能达标（30fps+ on integrated GPU）
- ✅ 安装→启动→创建→桌面显示 E2E 通过

---

## 六、Sprint 3 — 交互增强 + 质量

| # | 任务 | 角色 | 优先级 |
|---|------|------|:------:|
| 3.1 | 系统托盘完整实现（气泡通知 + 状态图标） | /fe | P0 |
| 3.2 | 自主行为系统（随机行为池 + 心情衰减） | /fe | P0 |
| 3.3 | 全局快捷键注册（Ctrl+Shift+S 等） | /fe | P1 |
| 3.4 | 开机自启 | /fe | P1 |
| 3.5 | Tauri updater 自动更新 | /fe+be | P1 |
| 3.6 | L3 交互验收（74 项） | /qa | P0 |
| 3.7 | 多显示器/高 DPI/边界测试 | /qa | P1 |
| 3.8 | 暗色模式全覆盖测试 | /qa | P1 |
| 3.9 | 性能分级验证（low/medium/high） | /qa | P1 |
| 3.10 | P0/P1 Bug 修复 | /fe+be | P0 |

---

## 七、Sprint 4 — 内测发布

| # | 任务 | 角色 | 优先级 |
|---|------|------|:------:|
| 4.1 | 内测用户招募 + 分发 | /pm | P0 |
| 4.2 | 崩溃日志收集（Sentry 或本地） | /be | P1 |
| 4.3 | 更新热修复通道验证 | /fe | P1 |
| 4.4 | 用户反馈收集 + 优先级排序 | /pm | P0 |
| 4.5 | V1.1 路线图规划 | /pm+/pjm | P1 |

---

## 八、关键里程碑

```
2026.07 ────┬────  Sprint 2 启动（当前）
            │
            │  ┌─ M1: 真实猫 → GLB 验证通过（Sprint 2 前期）
            │  │   • DashScope 生成质量 OK
            │  │   • Tauri WebView 渲染正常
            │  │
            ├──┴─ M2: 桌面原生 MVP（Sprint 2 末）
            │     • 安装包可分发
            │     • Sidecar 随包分发
            │     • 创建→桌面 全链路可跑
            │
2026.08 ────┬──── M3: 交互完整版（Sprint 3 末）
            │     • 自主行为 + 心情系统
            │     • L3 验收 74 项通过
            │     • P0/P1 Bug 清零
            │
2026.09 ────┴──── M4: 内测发布 V1.0-beta.1（Sprint 4）
                  • 内测用户可用
                  • 自动更新就绪
                  • 反馈收集运行
```

---

## 九、风险与应对

| # | 风险 | 影响 | 概率 | 应对 |
|---|------|:----:|:----:|------|
| R1 | DashScope 真实猫照片生成质量不达标 | 🔴 高 | 中 | 已备 Replicate/Tripo/Meshy 替代方案 |
| R2 | Tauri 打包兼容性 (Win10 vs Win11) | 🔴 高 | 中 | Win11 优先；Win10 降级方案 |
| R3 | Python sidecar 嵌入体积过大 | 🟡 中 | 高 | 精简依赖；考虑 onnxruntime 替代 |
| R4 | WebView2 材质效果不达预期 | 🟡 中 | 中 | 已实现 Rust API；设计系统有纯色回退 |
| R5 | 骨骼动画生态不成熟（自动 rigging） | 🟡 中 | 中 | 程序化动画已就绪作为回退 |
| R6 | 单人项目时间不足 | 🔴 高 | 高 | MVP 优先；P2 功能（声音/配饰）→ V1.1 |

---

## 十、项目文件结构（Sprint 1 清理后）

```
LaiMePets/
├── src/                              # 前端 React 19 + TS 5.8
│   ├── main.tsx                      # 入口
│   ├── App.tsx                       # 路由分发（welcome/create-pet/desktop/settings）
│   ├── pages/
│   │   ├── Welcome.tsx               # 品牌欢迎 → 隐私授权 → 引导
│   │   ├── CreatePet.tsx             # 5 步创建向导
│   │   ├── Desktop.tsx               # 桌面宠物主界面
│   │   └── Settings.tsx              # 4 Tab 设置面板
│   ├── components/
│   │   ├── pet/                      # 3D 宠物组件
│   │   │   ├── PetCanvas.tsx         # R3F Canvas + GLB 加载 + ErrorBoundary
│   │   │   ├── PlaceholderPet.tsx    # 程序化占位模型（9 行为）
│   │   │   ├── Environment.tsx       # 场景灯光
│   │   │   ├── MoodIndicator.tsx     # 心情指示器
│   │   │   ├── hooks/                # useModelFit / usePetAnimation / useRealismShader
│   │   │   ├── shaders/              # toon 着色器
│   │   │   └── utils/                # GLB 元数据提取
│   │   └── ui/                       # 通用组件（Button/Slider/Toggle/Toast/Dialog/ContextMenu）
│   ├── services/
│   │   ├── api.ts                    # FastAPI 客户端（Tauri 自动切换 base URL）
│   │   └── tauri-service.ts          # Tauri IPC 封装（浏览器降级）
│   ├── stores/                       # Zustand（petStore / settingsStore）
│   ├── hooks/                        # useRouter（内存路由） / useTheme
│   └── types/                        # TypeScript 类型
├── services/                         # Python FastAPI (Sidecar)
│   ├── main.py                       # 入口（CORS / lifespan / 路由注册）
│   ├── config.py                     # Pydantic Settings（7 AI 后端）
│   ├── routes/api.py                 # REST API
│   ├── services/
│   │   ├── inference.py              # AI 推理引擎（~1119 行）
│   │   ├── preprocessing.py          # 照片预处理 + rembg 抠图
│   │   └── storage.py                # 文件存储
│   ├── models/schemas.py             # Pydantic 数据模型
│   └── tests/                        # pytest（smoke / error / cloud E2E）
├── src-tauri/                        # Rust Tauri 2
│   ├── src/lib.rs                    # 窗口/托盘/Sidecar/Tauri commands
│   ├── src/main.rs                   # 入口
│   └── tauri.conf.json               # 窗口/构建/安全配置
├── docs/                             # 产品/设计/项目文档
│   ├── pm/                           # PRD / AI 可行性
│   ├── design/                       # 设计系统 / 交互设计 / 界面设计
│   └── project-roadmap.md            # 本文档
├── AGENTS.md                         # Codex CLI 项目上下文
├── CLAUDE.md                         # Claude Code 角色路由
├── package.json                      # 前端依赖 + scripts
├── vite.config.ts                    # Vite 构建配置
└── index.html                        # HTML 入口
```

---

## 十一、下次评审节点

| 节点 | 触发条件 | 评审内容 |
|------|---------|---------|
| **Sprint 2 中期** | Sidecar 打包完成 | PyInstaller 方案确认 / Go/No-Go |
| **Sprint 2 末尾** | 安装包可运行 | 首次启动→创建→桌面 全链路 |
| **Sprint 3 设计走查** | Alpha 可运行 | L2 视觉还原度 / 材质 / 动效 |
| **Sprint 4 QA 门禁** | 功能完成 | L3 交互验收 / Bug Review |
| **发布评审** | 内测前 | 全部文档 + 测试通过 + 安装包验证 |

---

> **如何使用本文档**：
> - **Claude Code**：`/pm` 需求优先级 / `/design` 设计走查 / `/pjm` 进度跟踪和风险
> - **Codex CLI**：终端 `codex "认领 Sprint 2 任务"` 开始代码开发
> - 任务认领后请更新上方表格的状态
