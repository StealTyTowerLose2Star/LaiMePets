# AGENTS.md — LaiMePets 项目上下文（Codex CLI）

你正在参与 **LaiMePets（来咪宠物）**：一款将真实宠物照片 3D 化并放置在 Windows 桌面的桌面宠物应用。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Rust Tauri 2 (GNU toolchain, Windows 11) |
| 前端 | TypeScript 5.8 + React 19 + Vite 6 + Tailwind CSS 4 |
| 3D 渲染 | Three.js 0.185 + @react-three/fiber 9.6 + @react-three/drei 10.7 |
| 状态管理 | Zustand 5 |
| 后端 | Python FastAPI 0.115 (sidecar 模式) |
| AI 引擎 | DashScope/Tripo API + rembg + Replicate |
| 前端测试 | Vitest 3 + jsdom 26 + @testing-library/react 16 |
| 后端测试 | pytest |

---

## 常用命令

```bash
# 前端
npm run dev          # Vite 开发服务器 (:1420)
npm run build        # TypeScript 检查 + Vite 构建
npm test             # 运行 Vitest
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化

# 后端
cd services && uvicorn main:app --reload  # FastAPI 开发服务器 (:8000)

cd services && pytest tests/              # 运行后端测试

# Tauri（需要内部启动 sidecar）
npm run tauri dev    # Tauri 开发模式
```

---

## 目录结构

```
src/                    # 前端源码
  components/ui/        # 通用 UI 组件 (Button, Slider, Toast, Dialog...)
  components/pet/       # 宠物 3D 组件 (PetCanvas, PlaceholderPet)
    hooks/              # R3F hooks (useModelFit, usePetAnimation, useRealismShader)
    shaders/            # 自定义着色器 (toon.ts)
    utils/              # 工具函数 (glb-utils.ts)
    __tests__/          # 组件测试
  pages/                # 页面 (Welcome, CreatePet, Desktop, Settings, ThreeDemo)
  stores/               # Zustand stores (petStore, settingsStore)
  services/             # API 调用层 (api.ts, tauri-service.ts)
  types/                # TypeScript 类型 (pet.ts, settings.ts)
  test/                 # 测试配置 (setup.ts — WebGL mock)

services/               # Python AI 服务
  routes/api.py         # REST API
  services/inference.py # AI 推理引擎
  services/preprocessing.py # 照片预处理
  config.py             # Pydantic Settings

src-tauri/src/          # Rust Tauri 桌面壳
  lib.rs                # 窗口管理、sidecar 生命周期、Tauri commands
  main.rs               # 入口
```

---

## 编码规范

### TypeScript / React
- **严格模式**：`strict: true`, `verbatimModuleSyntax: true`（必须用 `import type` 导入纯类型）
- **路径别名**：`@/` → `src/`
- **函数组件 + Hooks**，不做 class component
- **每个组件覆盖**：默认、加载、空、错误、边界状态
- **懒加载**：页面用 `React.lazy()` + `<Suspense>`
- **3D 组件**：必须包裹 ErrorBoundary，GLB 用 `useGLTF` 加载
- **样式**：Tailwind CSS 原子类优先，颜色用语义 token（`text-neutral-*`、`bg-brand-*`），暗色用 `dark:` 前缀
- **API 调用**：走 `src/services/api.ts`，不直接写 fetch
- **命名**：组件 PascalCase，函数 camelCase，常量 UPPER_SNAKE_CASE

### Python / FastAPI
- Pydantic v2 schemas 在 `models/schemas.py`
- 配置通过 `Settings` 类读取 `.env`
- 路由 `/api/v1/` 前缀
- async/await 模式，CPU 密集型放 BackgroundTasks

### Rust / Tauri 2
- **Crate 类型**：`lib` + `staticlib`（禁止 `cdylib` — GNU ld export ordinal 上限 65535）
- Sidecar 模式管理 Python 子进程生命周期
- Dev: `debug = 0, codegen-units = 16`

---

## 关键模式

### 3D 渲染管线
```
照片 → FastAPI (rembg 抠图 → DashScope API) → GLB → PetCanvas.tsx
→ useGLTF 加载 → useModelFit 自动缩放
→ usePetAnimation 骨骼动画（回退 useProceduralAnimation）
→ useRealismShader toon/hybrid/PBR 着色
```

### 前端测试 mock
- `@react-three/fiber` → mock Canvas 为 HTML div
- `@react-three/drei` → mock useGLTF 等
- 全局 setup `src/test/setup.ts` 提供 WebGL context mock

---

## 禁止事项

- ❌ 不引入新状态管理库（坚持 Zustand）
- ❌ 不引入 React Router（用现有 `useRouter` hook）
- ❌ 不给 Cargo.toml 加 `cdylib` crate-type
- ❌ 不用 `any` 类型
- ❌ 不硬编码颜色/间距（用 Tailwind token）
- ❌ 不提交 API Key/secret
- ❌ 不用夜间 Rust features
