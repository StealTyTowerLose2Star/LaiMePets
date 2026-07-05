---
name: qa
description: (重定向到 Codex) 测试任务请在终端中使用 Codex CLI 完成
---

## 测试任务 → Codex CLI

这是一个**代码开发任务**。本项目的代码工作（前端、后端、测试）由 **OpenAI Codex CLI** 负责，Claude Code 专注于产品和设计。

### 请在终端中使用 `codex` 命令：

```bash
cd d:/LaiMePets
codex "测试需求描述"
```

示例：
- `codex "为 PetCanvas 的 GLB 加载失败场景写测试"`
- `codex "检查 inference.py 的边界条件并补充测试"`
- `codex "写一个 e2e 测试覆盖创建宠物到桌面显示的完整流程"`

Codex 已通过 **`AGENTS.md`** 获得了项目上下文（测试框架、mock 策略、测试文件位置等）。

### 测试技术栈速查

| 层 | 框架 | 配置文件 |
|----|------|---------|
| 前端 | Vitest 3 + jsdom + @testing-library/react | `vitest.config.ts` |
| 前端 setup | WebGL mock + ResizeObserver polyfill | `src/test/setup.ts` |
| 后端 | pytest | `services/tests/` |
| 3D 组件 mock | mock `@react-three/fiber` 和 `@react-three/drei` | 参考 `PetCanvas.test.tsx` |
