---
name: be
description: (重定向到 Codex) 后端开发任务请在终端中使用 Codex CLI 完成
---

## 后端开发任务 → Codex CLI

这是一个**代码开发任务**。本项目的代码工作（前端、后端、测试）由 **OpenAI Codex CLI** 负责，Claude Code 专注于产品和设计。

### 请在终端中使用 `codex` 命令：

```bash
cd d:/LaiMePets
codex "后端需求描述"
```

示例：
- `codex "帮我在 inference.py 中添加新的 AI 模型支持"`
- `codex "审查 services/routes/api.py 的错误处理"`
- `codex "为 preprocessing.py 写单元测试"`

Codex 已通过 **`AGENTS.md`** 获得了项目上下文（技术栈、目录结构、编码规范、禁止事项等）。

### 项目技术栈速查

| 项 | 内容 |
|----|------|
| 框架 | Python FastAPI 0.115 (async/await) |
| 配置 | pydantic-settings + .env |
| AI | DashScope/Tripo API + rembg + Replicate |
| 3D | trimesh |
| 图像 | Pillow + OpenCV + numpy |
| 任务队列 | Celery + Redis（开发模式用内存队列） |
| 数据校验 | Pydantic v2 |
| 测试 | pytest |
