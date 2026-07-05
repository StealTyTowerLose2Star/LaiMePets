---
name: fe
description: (重定向到 Codex) 前端开发任务请在终端中使用 Codex CLI 完成
---

## 前端开发任务 → Codex CLI

这是一个**代码开发任务**。本项目的代码工作（前端、后端、测试）由 **OpenAI Codex CLI** 负责，Claude Code 专注于产品和设计。

### 请在终端中使用 `codex` 命令：

```bash
cd d:/LaiMePets
codex "前端需求描述"
```

示例：
- `codex "帮我在 PetCanvas 中添加一个 loading 进度条"`
- `codex "审查 src/components/pet/PetCanvas.tsx 的代码"`
- `codex "为 CreatePet 页面写组件测试"`

Codex 已通过 **`AGENTS.md`** 获得了项目上下文（技术栈、目录结构、编码规范、禁止事项等）。

### 项目技术栈速查

| 项 | 内容 |
|----|------|
| 框架 | React 19 + TypeScript 5.8 (strict) |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 4 |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| 状态 | Zustand 5 |
| 测试 | Vitest 3 + jsdom + @testing-library/react |
| 路径别名 | `@/` → `src/` |
