# LaiMePet 设计系统 — V1.1

> **版本**：v1.1
> **日期**：2026-07-04
> **作者**：UI/UX 设计师
> **状态**：评审中（D1+D2+D3+D4+D5 全部完成；L1 自检通过）
> **上一版本**：v1.0 (2026-07-01)
> **变更说明**：D1-术语修正；D5-新增附录 C：Tauri WebView2 渲染约束与浏览器差异（材质实现/JS API 差异/性能预算/设计实现对照速查表）；§4.3 补充材质技术实现交叉引用；L1 自检修复：暗色模式阴影 Token、字号声明修正、Token 命名规范补全、Danger 按钮属性表、心情色 Token、组件状态覆盖率、font 命名空间分离

---

## 0. 设计原则

| 原则 | 说明 |
|------|------|
| **宠物是主角** | UI 服务于宠物展示，不喧宾夺主。面板用亚克力/云母材质退后，宠物 3D 形象突出 |
| **融入桌面** | 长驻应用不打扰工作，悬浮态零 UI，控制面板可隐藏 |
| **冷暖平衡** | 亚克力冷材质（UI）+ 暖色调品牌色 + 温暖写实宠物，形成视觉张力 |
| **跟随系统** | 亮色/暗色自动切换，材质跟随 Windows 11 主题，保持原生感 |
| **性能可降级** | 动效跟随性能模式分级，低配机自动精简，保证流畅 |

---

## 1. 色彩系统

### 1.1 品牌色

> 暖琥珀色 — 源自宠物皮毛的温暖联想，同时保持专业感，不幼稚。

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-brand-50` | `#FFF5ED` | 品牌色浅底 |
| `--color-brand-100` | `#FFE8D5` | 标签背景、选中态底色 |
| `--color-brand-200` | `#FFD4AE` | 进度条填充、焦点环 |
| `--color-brand-300` | `#FFB87D` | 悬浮态（hover） |
| `--color-brand-400` | `#F59E5B` | **主色** — CTA按钮、链接、开关激活态 |
| `--color-brand-500` | `#E07D3A` | 按下态（active） |
| `--color-brand-600` | `#C06028` | 深色强调文字 |
| `--color-brand-700` | `#9A4A1C` | 暗色模式下主色 |
| `--color-brand-800` | `#7A3812` | 暗色模式按下态 |
| `--color-brand-900` | `#5C280A` | 极少使用 |

### 1.2 中性色 — 亮色模式

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-neutral-0` | `#FFFFFF` | 纯白底（卡片内容区） |
| `--color-neutral-50` | `#FAFAF9` | 默认窗口背景 |
| `--color-neutral-100` | `#F5F0ED` | 次级背景、分组底色 |
| `--color-neutral-200` | `#E8E0DB` | 分隔线、禁用态底色 |
| `--color-neutral-300` | `#D4CBC4` | 边框 |
| `--color-neutral-400` | `#A89F98` | 禁用态文字 |
| `--color-neutral-500` | `#7A716B` | 次要文字 |
| `--color-neutral-600` | `#5D5550` | 正文文字 |
| `--color-neutral-700` | `#423C38` | 标题文字 |
| `--color-neutral-800` | `#2A2522` | 主标题 |
| `--color-neutral-900` | `#1A1614` | 最高强调（极少） |

### 1.3 中性色 — 暗色模式

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-neutral-0` | `#1E1B19` | 暗色窗口背景 |
| `--color-neutral-50` | `#2A2522` | 默认暗色背景 |
| `--color-neutral-100` | `#38322E` | 次级暗色背景 |
| `--color-neutral-200` | `#4A433E` | 分隔线、禁用态底色 |
| `--color-neutral-300` | `#6B6159` | 暗色边框 |
| `--color-neutral-400` | `#8B8078` | 禁用态文字 |
| `--color-neutral-500` | `#A0968E` | 暗色次要文字 |
| `--color-neutral-600` | `#C4BCB5` | 暗色正文 |
| `--color-neutral-700` | `#DCD5CF` | 暗色标题 |
| `--color-neutral-800` | `#EFE9E4` | 暗色主标题 |
| `--color-neutral-900` | `#F8F4F1` | 暗色最高强调 |

### 1.4 语义色

| Token | 亮色 | 暗色 | 用途 |
|-------|------|------|------|
| `--color-success` | `#4CAF50` | `#5CBF60` | 成功/已完成 |
| `--color-success-bg` | `#EDF7EE` | `#1C2E1D` | 成功态背景 |
| `--color-warning` | `#F5A623` | `#F7B84D` | 警告/提醒 |
| `--color-warning-bg` | `#FEF6EC` | `#2E2516` | 警告态背景 |
| `--color-error` | `#E8553D` | `#ED6B55` | 错误/危险（暖红色，不刺眼）|
| `--color-error-bg` | `#FDEDEA` | `#2E1E1B` | 错误态背景 |
| `--color-info` | `#5B9BD5` | `#6BADE0` | 信息提示 |
| `--color-info-bg` | `#EDF4FB` | `#192433` | 信息态背景 |

### 1.5 宠物心情色（用于迷你指示器）

| Token | 心情 | 色值 | 渐变 |
|------|------|------|------|
| `--color-mood-happy` | 开心 😊 | `#F59E5B` | `#FFB87D → #F59E5B` |
| `--color-mood-bored` | 无聊 😐 | `#A89F98` | `#C4BCB5 → #8B8078` |
| `--color-mood-sad` | 难过 😢 | `#7BADD4` | `#9CC8E8 → #5B9BD5` |
| `--color-mood-hungry` | 饥饿 🍽️ | `#F2A65A` | `#F7C98B → #E07D3A` |

> 迷你指示器为 8px 直径的发光圆点，使用对应心情渐变色 + 4px 外发光（blur-radius: 6px, 透明度 40%）。渐变通过 `--color-mood-*-gradient` 自定义属性单独定义（如 `--color-mood-happy-gradient: linear-gradient(135deg, #FFB87D, #F59E5B)`），由组件按需引用。

---

## 2. 字体系统

### 2.1 字体族

```css
/* Windows 11 系统字体栈 */
--font-sans: "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif;
--font-sans-static: "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;  /* 静态回退 */
--font-mono: "Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, monospace;
```

| 用途 | 字体 | 说明 |
|------|------|------|
| UI 正文（拉丁/数字） | Segoe UI Variable / Segoe UI | Windows 11 系统字体，可变字重 |
| UI 正文（中文） | Microsoft YaHei（微软雅黑）| Windows 预装，覆盖 CJK |
| 代码/数据 | Cascadia Code | Windows Terminal 默认等宽字体 |
| macOS 回退（预留） | SF Pro Text + PingFang SC | 未来跨平台时启用 |

### 2.2 字号层级

> 基准：系统 WebView 默认 16px。Display/标题字号基于 4px 递增；正文字号基于视觉可读性微调（15/14/13/11/10），遵循 Windows 11 Segoe UI Variable 光学尺寸优化。

| Token | 字号 | 行高 | 字重 | 用途 | 命名说明 |
|-------|------|------|------|------|---------|
| `--text-display` | 32px | 40px (1.25) | Semibold 600 | 启动页标题、大时刻 | 特例：独立角色 |
| `--text-h1` | 24px | 32px (1.33) | Semibold 600 | 窗口标题 | 标题级（role=级别号） |
| `--text-h2` | 20px | 28px (1.4) | Semibold 600 | 区块标题 | 标题级（role=级别号） |
| `--text-h3` | 16px | 24px (1.5) | Semibold 600 | 小标题 | 标题级（role=级别号） |
| `--text-body-l` | 15px | 22px (1.47) | Regular 400 | 长文、说明 | 正文级（role=body, variant=尺寸） |
| `--text-body-m` | 14px | 20px (1.43) | Regular 400 | **默认正文** | 正文级（role=body, variant=尺寸） |
| `--text-body-s` | 13px | 18px (1.38) | Regular 400 | 辅助信息 | 正文级（role=body, variant=尺寸） |
| `--text-caption` | 11px | 16px (1.45) | Regular 400 | 角标、提示 | 特例：独立角色 |
| `--text-overline` | 10px | 14px (1.4) | Semibold 600 | 标签（大写） | 特例：独立角色 |

### 2.3 字重

| Token | 值 | 用途 |
|-------|-----|------|
| `--font-weight-light` | 300 | 极少使用（Display 级别备选）|
| `--font-weight-regular` | 400 | 正文、标签 |
| `--font-weight-medium` | 500 | 强调文字、按钮 |
| `--font-weight-semibold` | 600 | 标题、CTA |
| `--font-weight-bold` | 700 | 极强调（数字、价格）|

---

## 3. 间距系统

> 基于 **4px 网格**。所有间距必须是 4 的倍数。

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-0` | 0px | 无间距 |
| `--space-xs` | 4px | 紧密元素之间（图标与文字、标签内边距）|
| `--space-sm` | 8px | 相关元素间距（按钮组、表单行内间距）|
| `--space-md` | 16px | **默认间距**（卡片内边距、区块内间距）|
| `--space-lg` | 24px | 区块间距、弹窗内边距 |
| `--space-xl` | 32px | 界面级间距、大区块分隔 |
| `--space-2xl` | 48px | 界面上下留白、主区块间距 |
| `--space-3xl` | 64px | 极少使用（启动页、引导页）|

### 3.1 应用规则

```
┌────────────────────────────────────┐
│  Panel (Mica)                      │
│  ┌──────────────────────────────┐  │
│  │  Section                     │  │
│  │  padding: --space-md (16px)  │  │
│  │  ┌────┐ ┌────┐              │  │
│  │  │ Btn│ │ Btn│  gap: 8px    │  │
│  │  └────┘ └────┘              │  │
│  └──────────────────────────────┘  │
│  ← gap: --space-lg (24px) →        │
│  ┌──────────────────────────────┐  │
│  │  Section 2                   │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## 4. 材质系统

### 4.1 Windows 11 材质类型

| 材质 | 透明度 | 模糊 | 性能 | 适用 |
|------|--------|------|------|------|
| **Mica** | 不透明，采样壁纸色调 | 无 | ★★★ | 主窗口背景、设置面板（长驻窗口）|
| **Mica Alt** | 同 Mica，色调略不同 | 无 | ★★★ | 次级面板、Tab 页背景 |
| **Acrylic** | 半透明 60-70% | 有（高斯模糊） | ★★☆ | 弹出菜单、右键菜单、悬停控制条（瞬态表面）|
| **Solid** | 100% 不透明 | 无 | ★★★ | 内容阅读区、代码区（保证可读性）|

### 4.2 LaiMePet 材质分配

| 表面 | 材质 | 圆角 | 说明 |
|------|------|------|------|
| 主控制面板 | Mica | `--radius-lg` (12px) | 双击宠物展开的完整面板 |
| 设置窗口 | Mica Alt | `--radius-lg` (12px) | 从控制面板进入的独立设置页 |
| 右键菜单 | Acrylic | `--radius-md` (8px) | 宠物身上右键 |
| 悬停控制条 | Acrylic (60%) | `--radius-full` | 鼠标悬停宠物时浮现 |
| 迷你心情指示器 | 全透明（仅光晕）| `--radius-full` | 宠物旁边 8px 圆点 |
| Toast 通知 | Acrylic (80%) | `--radius-md` (8px) | 右上角弹出 |
| 弹窗 / 对话框 | Mica | `--radius-lg` (12px) | 确认操作 |
| 宠物展示区 | **无材质（全透明）** | 无 | 宠物直接在桌面上，无窗口边框 |

### 4.3 材质使用原则

1. **Mica 用于长驻窗口** — 采样桌面壁纸一次，不会实时变化，性能友好
2. **Acrylic 用于瞬态表面** — 菜单、提示、悬停条。短暂出现，用完即消失
3. **宠物本身无材质** — 直接渲染在桌面上，周围完全透明（参考 Desktop Mate）
4. **暗色模式下材质自动跟随** — Windows 11 系统级材质在暗色模式下色调变暗
5. **⚠️ 材质由 Tauri Rust 层实现，非 CSS** — CSS `backdrop-filter` 在 WebView2 中无法穿透桌面。设计稿中的模糊/透明效果的实际技术方案，详见 [附录 C](#附录-ctauri-webview2-渲染约束与浏览器差异)

---

## 5. 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-none` | 0px | 无圆角 |
| `--radius-sm` | 4px | 小按钮、输入框、标签 |
| `--radius-md` | 8px | 卡片、菜单、通知 |
| `--radius-lg` | 12px | 面板、弹窗、大容器 |
| `--radius-full` | 9999px | 胶囊按钮、指示器、滑块 |

---

## 6. 阴影系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-none` | `none` | 无阴影 |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)` | 卡片（微弱） |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | 弹出菜单、悬停控制条 |
| `--shadow-lg` | `0 8px 16px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | 弹窗、对话框 |
| `--shadow-glow` | `0 0 8px rgba(245,158,91,0.4)` | 品牌发光（指示器、选中态） |

> 暗色模式下阴影透明度提高 50%，因为暗色背景上阴影需要更强对比。
>
> **暗色模式阴影值**：
>
> | Token（暗色覆盖） | 值 |
> |-------|-----|
> | `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.12)` |
> | `--shadow-md` | `0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)` |
> | `--shadow-lg` | `0 8px 16px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.09)` |
> | `--shadow-glow` | `0 0 12px rgba(245,158,91,0.5)`（暗色背景下发光增强）|
>
> 暗色模式阴影通过 `[data-theme="dark"]` 选择器覆盖对应 Token 值。

---

## 7. 动效系统

### 7.1 持续时间

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-instant` | 100ms | 微交互反馈（按钮按下、hover 切换）|
| `--duration-fast` | 200ms | 小过渡（开关切换、标签切换）|
| `--duration-normal` | 300ms | **默认过渡**（面板展开、菜单出现）|
| `--duration-slow` | 500ms | 大过渡（弹窗进出、宠物状态切换）|
| `--duration-expressive` | 800ms | 情感表达（宠物开心动画、特殊效果）|

### 7.2 缓动曲线

| Token | cubic-bezier() | 用途 |
|-------|---------------|------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | 标准过渡（Material 标准缓动）|
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | 元素进入/出现 |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | 元素离开/消失 |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性效果（抚摸反馈、宠物开心）|
| `--ease-spring` | `cubic-bezier(0.22, 0.99, 0.36, 1.04)` | 弹性过渡（指示器跳动）|

### 7.3 动效分级策略

| 性能模式 | 帧率 | 动效 | 说明 |
|---------|------|------|------|
| **高性能** | 60fps | 全部开启 | 骨骼动画流畅、毛发光影、粒子特效（开心时的星星）、弹性 UI 过渡 |
| **中性能** | 30fps | 保留核心 | 骨骼动画减帧、无粒子特效、弹性过渡降为默认缓动、毛发光影简化 |
| **低性能** | 15fps | 仅必要 | 关键帧动画（4-6 帧循环）、无过渡动画直接切换、无发光效果 |

> 性能模式由应用根据硬件配置自动检测推荐，用户可在设置中手动切换。

---

## 8. 图标系统

### 8.1 图标风格

- **风格**：线性图标 + 圆角端点（`stroke-linecap: round`, `stroke-linejoin: round`）
- **基准尺寸**：16px（工具栏）、20px（导航）、24px（大按钮）
- **描边宽度**：1.5px（与 Windows 11 Segoe Fluent Icons 保持一致）
- **填充**：默认描边，选中态可填充

### 8.2 核心图标清单（V1.0）

| 图标 | 用途 | 尺寸 |
|------|------|------|
| 宠物头像占位 | 宠物列表、托盘图标 | 24px / 48px |
| 抚摸（手型）| 互动按钮 | 20px |
| 投喂（骨头/鱼）| 互动按钮 | 20px |
| 设置（齿轮）| 设置入口 | 16px |
| 切换宠物 | 宠物列表 | 20px |
| 性能模式 | 性能切换 | 16px |
| 音量 | 音量控制 | 16px |
| 暗色/亮色 | 主题切换 | 16px |
| 通知铃铛 | 提醒 | 16px |
| 关闭 | 关闭面板 | 16px |

### 8.3 应用图标（Logo）

规格：
- `.ico` 格式，包含 16/24/32/48/256px 尺寸
- 主形象：提取品牌暖琥珀色 (#F59E5B) + 简化宠物剪影
- 托盘图标：16px 单色（亮色模式用深灰 #2A2522，暗色模式用浅灰 #EFE9E4）

> Logo 具体设计留待后续单独产出。

---

## 9. 组件基础规范

### 9.1 按钮

```
┌──────────────────────────────────────┐
│  Button Variants                     │
│                                      │
│  Primary:   [ === CTA按钮 === ]      │  品牌色填充
│  Secondary: [ === 次要按钮 === ]      │  描边，透明底
│  Ghost:      === 文字按钮 ===         │  无边框
│  Icon:       [ 🔔 ]                  │  仅图标，24px/20px
│  Danger:    [ === 危险操作 === ]      │  语义错误色
└──────────────────────────────────────┘
```

| 属性 | Primary | Secondary | Ghost | Icon | Danger |
|------|---------|-----------|-------|------|--------|
| 背景 | `--color-brand-400` | 透明 | 透明 | 透明 | `--color-error` |
| 边框 | 无 | `--color-neutral-300` | 无 | 无 | 无 |
| 文字 | `#FFF` | `--color-neutral-700` | `--color-brand-400` | — | `#FFF` |
| 圆角 | `--radius-sm` | `--radius-sm` | `--radius-sm` | `--radius-sm` | `--radius-sm` |
| 高度 | 32px | 32px | 32px | 32px / 24px | 32px |
| 内边距 | 0 16px | 0 16px | 0 8px | 4px | 0 16px |
| 字号 | `--text-body-m` | `--text-body-m` | `--text-body-m` | — | `--text-body-m` |
| 悬停 Hover | `bg: brand-300` | `bg: neutral-100` | `bg: neutral-100` | `bg: neutral-100` | `bg: #D9432F`（深一级） |
| 按下 Active | `bg: brand-500` | `bg: neutral-200` | `bg: neutral-200` | `bg: neutral-200` | `bg: #C0392B` |

**状态覆盖**（以 Primary 为例）：

| 状态 | 视觉 |
|------|------|
| 默认 | `bg: brand-400, text: #FFF` |
| 悬停 Hover | `bg: brand-300`（浅一级），光标 pointer |
| 按下 Active | `bg: brand-500`（深一级），`scale: 0.97`（100ms 微缩放）|
| 禁用 Disabled | `bg: neutral-200, text: neutral-400`，光标 not-allowed |
| 加载中 Loading | 按钮内显示 16px 旋转环，保持原宽度，禁止点击 |
| 聚焦 Focus | `outline: 2px solid brand-400, outline-offset: 2px`（键盘导航可见）|

### 9.2 滑块（写实度控制）

| 属性 | 值 |
|------|-----|
| 轨道高度 | 4px |
| 轨道颜色 | `--color-neutral-200`（未填充）/ `--color-brand-400`（已填充）|
| 滑块尺寸 | 20px × 20px |
| 滑块颜色 | `#FFF` + `--shadow-sm` |
| 滑块悬浮 | `--shadow-md` + `border: 2px solid brand-300` |
| 刻度标记 | 0 / 25 / 50 / 75 / 100（在轨道下方，caption 字号）|
| 两端标签 | 左「卡通」右「写实」（body-s）|
| 禁用态 | 整体透明度 40%，滑块不可拖动，光标 not-allowed |
| 聚焦态 | `outline: 2px solid brand-400, outline-offset: 2px`（键盘导航时可见）|

> **状态说明**：滑块为无状态瞬时操作组件，无独立 loading 态；hover/active 态已在属性表中定义。

### 9.3 开关 Toggle

| 属性 | 值 |
|------|-----|
| 尺寸 | 40px × 20px（轨道）/ 16px × 16px（滑块）|
| 关闭态 | 轨道 `neutral-200`，滑块 `#FFF` |
| 开启态 | 轨道 `brand-400`，滑块 `#FFF` 平移 20px |
| 过渡 | `--duration-fast` (200ms) + `--ease-default` |
| 禁用 | 整体透明度 40%，光标 not-allowed |
| 悬停态 | 轨道颜色加深至 `brand-300`，光标 pointer |
| 聚焦态 | `outline: 2px solid brand-400, outline-offset: 2px`（键盘导航时可见）|

> **状态说明**：Toggle 为即时切换组件，无独立 loading 态；active 态由系统开关语义承载（点击即切换），不设独立按下态。

### 9.4 右键菜单

| 属性 | 值 |
|------|-----|
| 材质 | Acrylic（80% 透明度 + 背景模糊）|
| 圆角 | `--radius-md` (8px) |
| 阴影 | `--shadow-md` |
| 宽度 | 最小 160px，最大 240px |
| 项高度 | 36px |
| 项内边距 | 8px 12px |
| 分隔线 | 1px `neutral-200`，上下 4px 间距 |
| 选中态 | 背景 `brand-100`（亮色）/ `brand-100 + 20%透明`（暗色）|
| 快捷键文字 | 右对齐，`--text-caption`，`neutral-500` |
| 悬停态 | 项背景变为 `brand-100`（亮色）/ `brand-100 + 20%透明`（暗色），100ms 过渡 |
| 按下态 | 项背景变为 `brand-200`，100ms |
| 禁用项 | 文字 `neutral-400`，光标 not-allowed，不可点击 |
| 子菜单指示 | 项右侧显示 `›` 箭头，hover 200ms 后展开子菜单 |

> **状态说明**：右键菜单为瞬态浮层，无 loading/聚焦态。菜单通过 Esc 或点击外部关闭，焦点管理由系统层处理。

### 9.5 悬停控制条

| 属性 | 值 |
|------|-----|
| 材质 | Acrylic（60%）|
| 形状 | 胶囊形（`radius-full`）|
| 高度 | 40px |
| 内边距 | 4px 12px |
| 内含 | 图标按钮组（抚摸、投喂、互动、设置），间距 4px |
| 浮现方式 | 鼠标悬停宠物 300ms 后，从宠物上方淡入 + 上移 8px |
| 消失 | 鼠标移出 500ms 后淡出，或鼠标进入控制条时保持 |
| 位置 | 宠物 bounding box 上方 12px，水平居中 |

### 9.6 迷你心情指示器

| 属性 | 值 |
|------|-----|
| 尺寸 | 8px 直径 |
| 位置 | 宠物右上角，距离宠物 bounding box 边缘 4px |
| 发光 | 4px 外发光（blur-radius: 6px），透明度 40%，心情色 |
| 颜色 | 见 §1.5 宠物心情色表 |
| 动效 | 开心时间歇跳动（`--ease-spring`，周期 3s）；无聊时缓慢明暗呼吸（周期 5s）|

### 9.7 Toast 通知

| 属性 | 值 |
|------|-----|
| 材质 | Acrylic（80%）|
| 圆角 | `--radius-md` (8px) |
| 阴影 | `--shadow-md` |
| 位置 | 屏幕右上角，距离顶部 16px，右侧 16px |
| 最大宽度 | 320px |
| 内边距 | 12px 16px |
| 内容 | 图标（16px）+ 文字（body-s）+ 关闭按钮 |
| 进入动画 | 从右侧滑入 + 淡入（300ms，`ease-out`）|
| 消失 | 5s 后自动淡出（200ms，`ease-in`），或手动关闭 |
| 类型 | 成功（绿）、警告（橙）、错误（红）、信息（蓝）、宠物提醒（品牌色 + 宠物图标）|

### 9.8 弹窗 / 对话框

| 属性 | 值 |
|------|-----|
| 材质 | Mica（主窗口背景）|
| 圆角 | `--radius-lg` (12px) |
| 阴影 | `--shadow-lg` |
| 最小宽度 | 360px |
| 最大宽度 | 480px |
| 内边距 | 24px（`--space-lg`）|
| 标题 | `--text-h2`，底部 16px 间距 |
| 正文 | `--text-body-m`，`neutral-600` |
| 按钮区 | 右对齐，按钮间距 8px，顶部 24px 间距 |
| 遮罩层 | 半透明黑 `rgba(0,0,0,0.3)`（亮色）/ `rgba(0,0,0,0.5)`（暗色）|
| 进入动画 | 遮罩淡入 + 弹窗缩放淡入（`scale: 0.95→1`，300ms，`ease-out`）|
| 退出动画 | 同上反向（200ms，`ease-in`）|

---

## 10. 响应式策略（预留）

> V1.0 聚焦 Windows 桌面端，但预留以下适配点：

| 断点 | 宽度 | 适配策略 |
|------|------|---------|
| Desktop | >1024px | 默认设计基准 |
| Tablet | 768-1024px | 面板缩小至 80%，宠物等比缩放 |
| Mobile | <768px | V1.0 不做；V2.0 考虑配套手机 App |

---

## 11. 可访问性（Accessibility）

| 项目 | 标准 | 实现 |
|------|------|------|
| 色彩对比度 | WCAG 2.1 AA（≥4.5:1 正文，≥3:1 大文字）| 所有文字-背景组合已验证 |
| 键盘导航 | Tab 焦点顺序、Enter/Space 激活、Esc 关闭 | 控制面板和设置页全键盘可达 |
| 焦点指示器 | 2px outline + 2px offset，品牌色 | 覆盖所有可交互元素 |
| 屏幕阅读器 | aria-label / role 属性 | 按钮、菜单、通知标注语义 |
| 高对比度模式 | Windows 高对比度 API 检测 | 关闭材质效果，使用纯色 |
| 动画控制 | `prefers-reduced-motion` 媒体查询 | 减少/禁用非必要动效 |

---

## 12. 设计 Token 命名规范

```
--{category}-{role}-{variant}-{state}
```

**Categories**：`color` / `text` / `font` / `font-weight` / `space` / `radius` / `shadow` / `duration` / `ease`

**示例**：
```
--color-brand-400          → 品牌主色
--color-neutral-600        → 中性正文色
--color-success-bg         → 成功态背景
--text-body-m              → 默认正文
--space-md                 → 默认间距 16px
--radius-lg                → 大圆角 12px
--shadow-glow              → 品牌发光
--duration-normal          → 标准过渡 300ms
--ease-bounce              → 弹性缓动
```

> Tauri WebView 渲染时映射为 CSS Custom Properties，定义在 `:root` 和 `[data-theme="dark"]` 下，由 JS 读取系统主题自动切换。

---

## 附录 A：与 PRD 的对应关系

| PRD 需求 | 设计系统映射 |
|---------|------------|
| 写实度滑块 0-100 | §9.2 滑块组件，带刻度标记和两端标签 |
| 显示模式切换（悬浮窗/固定窗口）| §9.4 右键菜单项，§9.5/9.6 悬浮态 UI |
| 互动按钮 | §9.1 图标按钮（Ghost + Icon variants），§9.5 悬停控制条 |
| 心情系统 | §1.5 心情色表，§9.6 迷你指示器 |
| 性能模式（低/中/高）| §7.3 动效分级策略 |
| 开机自启 & 托盘 | §8.3 托盘图标规格 |
| 宠物叫声控制 | §9.1 音量图标按钮 |
| 设置模块 | Mica 材质面板，§9.8 弹窗中的设置项 |

---

## 附录 B：文件目录约定

```
docs/design/
├── README.md                  ← 版本索引
├── v1.0/
│   ├── design-system.md       ← v1.0 归档
│   ├── interaction-design.md  ← v1.0 归档
│   └── ui-screens.md          ← v1.0 归档
├── v1.1/                      ← 当前版本（桌面原生应用适配）
│   ├── design-system.md       ← 本文件
│   ├── interaction-design.md
│   └── ui-screens.md
└── assets/                    ← 设计资源（SVG/PNG/Token JSON）
```

---

## 附录 C：Tauri WebView2 渲染约束与浏览器差异

> **目标读者**：设计师 + 前端开发  
> **目的**：明确 Tauri WebView2（Edge Chromium 内核）与标准浏览器的差异，避免设计时做出 WebView 无法实现或性能不可接受的决策。

### C.1 WebView2 概况

| 属性 | 值 |
|------|-----|
| 内核 | Edge Chromium（与系统 Edge 浏览器共享，Win11 内置） |
| 渲染引擎 | Blink（同 Chrome） |
| 字体渲染 | DirectWrite（Windows 原生文字渲染） |
| GPU 加速 | 支持（WebGL / WebGL2 / WebGPU 预览） |
| JavaScript 引擎 | V8（同 Chrome / Edge） |
| CSS 兼容性 | 与 Chrome/Edge 最新稳定版一致 |
| 进程模型 | 独立于浏览器，每个 WebView2 实例有独立渲染进程 |

### C.2 材质透明度约束（关键）

LaiMePet 大量依赖透明和模糊效果，这是 WebView2 与浏览器最大的差异点。

| 特性 | 标准浏览器 | Tauri WebView2 | 说明 |
|------|----------|---------------|------|
| `background: transparent` (CSS) | ✅ 窗口级透明需配置 | ⚠️ 需 Tauri 侧配合 | CSS 透明 ≠ 窗口透明，必须在 `tauri.conf.json` 启用 `transparent: true` |
| `backdrop-filter: blur()` (CSS) | ✅ 任意元素 | ❌ **不可用** | WebView2 的 CSS blur 只作用于 WebView 内部元素，**无法模糊 WebView 后面的桌面内容** |
| Mica 材质 | ❌ 浏览器无此概念 | ✅ **仅 Rust 侧** | Windows 11 Mica/Acrylic 是 Win32 API，必须通过 Tauri Rust 层调用，**不能通过 CSS 实现** |
| Acrylic 模糊 | ❌ | ⚠️ 部分可用 | Tauri 可设置窗口级 Acrylic，但 WebView 内元素无法单独应用 Acrylic 模糊 |
| 窗口穿透点击 | ❌ | ✅ `WS_EX_TRANSPARENT` | 宠物悬浮窗的非宠物区域需要点击穿透，由 Tauri Rust 侧控制 |
| 窗口置顶 (`alwaysOnTop`) | ❌ | ✅ Tauri 原生 | 宠物的 `WS_EX_TOPMOST` 置顶行为由 Rust 侧设置 |

**设计含义**：
- CSS `backdrop-filter` 在 LaiMePet 中**不可用于桌面穿透模糊**。设计稿中的"毛玻璃背后看到桌面"效果，实际由 Tauri 的窗口级 Mica/Acrylic 实现。
- 设计素材中的模糊背景是**示意效果**，前端实现时需用 Tauri Rust API 设置对应窗口材质，CSS 侧仅设置半透明色作为回退。
- 详见 §4 材质系统，已标注每种材质类型（Mica / Acrylic / Solid / 透明）的适用层级。

### C.3 CSS 兼容性对照

| CSS 特性 | WebView2 支持 | 注意事项 |
|----------|-------------|---------|
| CSS Grid / Flexbox | ✅ 完全支持 | 与 Chrome 行为一致 |
| CSS Variables (`--custom-property`) | ✅ | LaiMePet 的 Design Token 映射到此方案 |
| `@media (prefers-color-scheme)` | ✅ | 跟随 Windows 系统亮/暗主题 |
| `@media (prefers-reduced-motion)` | ✅ | 跟随 Windows 辅助功能设置 |
| `@media (prefers-contrast)` | ✅ | 跟随 Windows 高对比度模式 |
| `@font-face` | ✅ | 可加载本地字体，但建议优先用系统字体栈 |
| Viewport 单位 (`vw/vh/dvh`) | ✅ | `100dvh` 在 WebView2 中稳定，等同于窗口内容区高度 |
| `position: fixed` | ✅ | 相对于 WebView 视口，**不是相对于桌面** |
| `cursor: none/url()` | ✅ / ⚠️ | 自定义光标 URL 支持，但建议优先用系统光标 |
| `scroll-behavior: smooth` | ✅ | 面板内滚动可用 |
| `overscroll-behavior` | ✅ | 防止面板滚动链 |
| `accent-color` | ✅ | 表单控件品牌色 |
| `:has()` 选择器 | ✅ (Chromium 105+) | WebView2 ≥ 105 支持 |
| Container Queries | ✅ (Chromium 105+) | V1.0 暂不必要，V2.0 响应式适配有用 |
| View Transitions API | ✅ (较新版本) | 可用于界面切换过渡，但需检查 WebView2 版本 |
| `color-mix()` | ✅ | 可用于动态生成半透明色 |
| `animation-timeline: scroll()` | ⚠️ 较新 | 谨慎使用，需测试最低 WebView2 版本 |

### C.4 JavaScript API 差异

| API | 浏览器 | WebView2 | 说明 |
|-----|--------|---------|------|
| `window.open()` | 打开新标签页 | ❌ 不适用 | Tauri 中需用 `tauri::api::shell::open()` 打开外部链接 |
| `navigator.clipboard` | ✅ | ✅ | 读写剪贴板可用 |
| `navigator.geolocation` | ✅ (需 HTTPS) | ⚠️ 需权限 | WebView2 中可能不准确，V1.0 不使用 |
| `Notification API` | ✅ (需权限) | ✅ 映射到 Windows 原生通知 | WebView2 的通知会通过 Windows 通知中心显示，不经过 Toast 组件 |
| `requestFullscreen` | ✅ | ⚠️ | 会让 WebView 全屏（而非宠物独占），通常不启用 |
| `localStorage` / `sessionStorage` | ✅ | ✅ | 数据持久化，Tauri 侧建议用 Rust 的 `tauri-plugin-store` |
| `IndexedDB` | ✅ | ✅ | 较大数据可用，但 Tauri 有更高效的文件系统 API |
| `WebSocket` | ✅ | ✅ | 可用于云端 API 的实时通信（如生成进度推送） |
| `fetch` / XHR | ✅ | ✅ | 标准 HTTP 请求 |
| CORS | 受同源策略限制 | ✅ **无 CORS 限制** | WebView2 可自由请求任意 URL（这既是便利也是安全风险，需在 Rust 侧配置 CSP 白名单） |
| `requestIdleCallback` | ✅ | ✅ | 可用于低优先级 UI 更新 |
| `navigator.hardwareConcurrency` | ✅ | ✅ | 性能自动检测的依据之一 |
| `navigator.gpu` (WebGPU) | ⚠️ 实验性 | ⚠️ | 3D 渲染优先用 Three.js (WebGL2)，WebGPU 暂不作为主要方案 |

### C.5 3D 渲染约束

LaiMePet 的核心渲染引擎为 Three.js (WebGL2)。

| 约束项 | 说明 |
|--------|------|
| **WebGL2 支持** | WebView2 完整支持 WebGL2，等同于 Chrome 行为 |
| **透明背景** | Three.js 的 `alpha: true` + `setClearColor(0x000000, 0)` 可使 canvas 透明 → 宠物直接渲染在桌面上。前提：Tauri 窗口已配置 `transparent: true` |
| **抗锯齿** | 默认开启 MSAA 4x，高 DPI 屏下性能翻倍消耗。性能检测为"低"时应降至 2x 或关闭 |
| **阴影贴图** | 宠物自身的投影（假如需要投射到"桌面地面"）依赖 WebGL `shadowMap`，低性能模式下关闭 |
| **骨骼动画** | Three.js `SkinnedMesh` + 动画混合（`AnimationMixer`）支持流畅骨骼动画，不依赖 Web Worker |
| **后处理** | Bloom 发光（心情指示器光晕）、SSAO（宠物自身阴影）均可用 Three.js EffectComposer。低性能模式下全部关闭 |
| **纹理压缩** | 宠物毛皮纹理可使用 Basis Universal 压缩格式（`.basis`），减少 GPU 内存占用 |
| **加载性能** | GLB 模型文件建议压缩至 <5MB，首次加载控制台面板内用骨架屏过渡 |

### C.6 性能预算

| 资源 | 预算 | 说明 |
|------|------|------|
| WebView2 内存（空闲） | ≤ 80MB | 宠物在桌面空闲时，WebView 仅渲染 3D 宠物 + 迷你指示器 |
| WebView2 内存（面板打开） | ≤ 150MB | 控制面板 UI + 3D 宠物 + 状态管理 |
| GPU 显存（宠物模型） | ≤ 200MB | 单个宠物 GLB 模型 + 纹理 + 动画数据 |
| CPU（空闲，高性能模式） | ≤ 3% | 60fps 骨骼动画循环 |
| CPU（空闲，低性能模式） | ≤ 1% | 15fps 关键帧循环 |
| 首屏渲染（启动 → 宠物可见） | ≤ 5 秒 | 含 WebView2 初始化 + Three.js 场景加载 + 宠物模型 |
| 控制面板打开延迟 | ≤ 300ms | 面板 UI 为 React 组件，打开时为 display 切换 + 动画 |

### C.7 安全的 CSP 策略（Tauri 侧配置）

LaiMePet 的 WebView2 默认应用以下 Content Security Policy：

```
default-src 'self';
style-src 'self' 'unsafe-inline';
script-src 'self';
img-src 'self' data: https:;
connect-src 'self' https://dashscope.aliyuncs.com https://api.replicate.com;
font-src 'self' https://cdn.jsdelivr.net; (预留)
media-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
```

**对设计的约束**：
- 内联样式（`style="..."`）可用（`unsafe-inline`），但外部 CDN 字体受 `font-src` 限制
- 云端 API 请求受 `connect-src` 白名单管控，设计时如需接入新 API 需要同步更新 CSP
- 图片可从 `data:` URI 加载（支持 base64 缩略图）和 `https:` 远程 URL
- `eval()` 和新 Function 被禁止，不影响正常前端代码

### C.8 设计 ↔ 实现对照速查表

| 设计需求 | 设计系统中的表达 | 前端实现方式 | 注意事项 |
|---------|---------------|------------|---------|
| 窗口透明无边框 | 材质："无材质（全透明）" | `tauri.conf.json`: `transparent: true, decorations: false` | CSS `background: transparent` 仅辅助 |
| Mica 背景面板 | 材质：Mica | Rust: `window.set_mica(true)` | 采样桌面壁纸一次，暗色模式自动跟随 |
| Acrylic 右键菜单 | 材质：Acrylic (80%) | Rust: `window.set_acrylic(true)` 或 Tauri 菜单 API | 实际为窗口级模糊，非 CSS per-element blur |
| 宠物 3D 透明背景 | Three.js `alpha: true` | `renderer.setClearColor(0x000000, 0)` + WebGL canvas transparent | 窗口必须已配置 `transparent` |
| 点击穿透非宠物区 | 交互：点击穿透 | Rust: `WS_EX_TRANSPARENT` + 鼠标位置 hit-test | 宠物 bounding box 内不穿透 |
| 系统托盘 | 组件：托盘菜单 | `tauri-plugin-tray` (Rust) | 托盘菜单为 Windows 原生，不受 WebView CSS 控制 |
| 快捷键 | §8 键盘快捷键 | `tauri-plugin-global-shortcut` (Rust) | 快捷键注册在 Rust 层，不经过 WebView |
| Toast 从右侧滑入 | §4.8 Toast 微交互 | CSS `@keyframes` + `transform: translateX` | 相对于 WebView 视口（即窗口），不是屏幕 |
| 字体渲染 | §2 字体系统 | CSS `font-family` | 依赖系统安装的字体，Segoe UI Variable / Microsoft YaHei 均 Windows 预装 |

---

> **维护约定**：当设计师引入新的视觉特效或交互模式时，应先对照本附录确认 WebView2 可行性。不可行的方案标注为"设计探索（待技术验证）"，待前端/后端确认后再正式纳入设计系统。
