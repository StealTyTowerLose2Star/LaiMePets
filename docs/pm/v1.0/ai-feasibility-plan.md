# AI 形象生成 — 技术可行性验证计划

> **版本**：v1.1（基于 `services/` 实际情况修正）
> **日期**：2026-07-02
> **作者**：项目经理
> **状态**：执行中 — 大部分基础工作已完成，剩余核心差距明确
> **依赖**：[prd-deskpet.md](prd-deskpet.md) S4.1 形象生成模块

---

## 0. 背景

### 为什么这是当前最高优先级？

PRD S4.1 定义的核心流水线：

```
上传素材 - 预处理 - AI 模型推理 - 绑定骨骼动画 - 输出 3D 模型
```

**真实 AI 模型推理是整个产品可行性的基石。** 目前 mock 模式已跑通完整链路，但 TripoSR/InstantMesh 真实模型尚未在 GPU 环境实测。

### 当前状态（2026-07-02 修正版）

| 已完成 | 未完成 |
|--------|--------|
| FastAPI 后端服务 (`services/`) | TripoSR 真实模型 GPU 实测 |
| AI 推理管线框架 (TripoSR/InstantMesh/mock 三模式) | InstantMesh 真实模型 GPU 实测 |
| 照片预处理 (清晰度检测/降噪/格式校验) | 真实动物照片-3D 模型还原度验证 |
| 异步任务管理 (进度追踪/状态轮询) | 写实度控制的技术实现 |
| REST API (7 个端点) | Three.js 加载真实 AI 模型验证 |
| mock fallback GLB 生成 (trimesh 构建猫咪) | 骨骼绑定方案验证 |
| E2E 测试 (mock 模式生成有效 GLB) | |
| 前端上传-创建-预览 UI 流程 | |
| 技术选型 (TripoSR + InstantMesh 为候选) | |

---

## 1. 已完成：Task 0 — AI 后端脚手架 (`services/`)

`services/` 目录结构：

```
services/
  main.py                    FastAPI 入口 + CORS + lifespan
  config.py                  配置管理 (模型/设备/路径/安全)
  requirements.txt           完整依赖声明
  models/
    schemas.py               Pydantic 数据模型 (请求/响应)
  routes/
    api.py                   7 个 REST 端点
  services/
    inference.py             AI 推理核心 (TripoSR/InstantMesh/mock)
    preprocessing.py         照片质量检测 + 预处理
    storage.py               文件存储 (模型/缩略图持久化)
  tests/
    test_e2e_generation.py   E2E 测试 (mock 模式通过)
```

API 端点清单：

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/v1/health` | 健康检查 + GPU 状态 |
| POST | `/api/v1/generate` | 上传照片启动 3D 生成 |
| GET | `/api/v1/status/{task_id}` | 查询生成进度 |
| GET | `/api/v1/model/{pet_id}` | 下载 GLB 模型 |
| GET | `/api/v1/model/{pet_id}/thumbnail` | 获取缩略图 |
| GET | `/api/v1/pets` | 列出所有已生成宠物 |
| GET | `/` | 服务信息 |

**mock 模式能力**：用照片主色调通过 trimesh 构建含身体/头/耳/眼/鼻/尾/腿的简化猫咪模型，输出有效 GLB 文件（E2E 测试已验证 GLB magic number = `0x46546C67`）。

---

## 2. 待完成：Task 1 — 真实 AI 模型 GPU 实测

**负责人**：后端开发工程师 (需要 GPU 环境)
**优先级**：P0
**产出**：实测报告 (截图 + 数据)

在 **有 CUDA 的 GPU 机器上** 逐项实测：

| 步骤 | 操作 | 验证点 |
|------|------|--------|
| 1.1 | 安装 `requirements.txt` 依赖 | 环境搭建顺利度 |
| 1.2 | `ai_model="triposr"`, `ai_device="cuda"` | 模型加载是否成功、显存占用 |
| 1.3 | 用 3-5 张真实猫/狗照片调用 `/api/v1/generate` | 推理耗时、输出 GLB 面数/纹理/文件大小 |
| 1.4 | `ai_model="instantmesh"` 重复测试 | 与 TripoSR 对比质量和速度 |
| 1.5 | 在 Three.js PetCanvas 中加载生成的 GLB | 渲染是否正常、材质/纹理/骨骼、帧率 |
| 1.6 | 动物还原度主观评估 (与原始照片对比) | 评分 1-5 |

**关键问题清单**：
- TripoSR/InstantMesh 对猫/狗动物的还原度如何？(这些模型以通用物体为主)
- 输出模型是否带纹理 UV？纹理分辨率？
- 模型面数是否过高需要减面？
- GPU 显存要求 (最低配置目标：6-8GB)

---

## 3. 待完成：Task 2 — 写实度控制方案设计

**负责人**：前端开发工程师
**优先级**：P1 (Sprint 2 需要，可用简单方案先跑通)

PRD S4.1 要求 0-100 写实度滑块。当前 AI 方案输出固定写实度的模型。

| 技术路径 | 说明 | 复杂度 |
|---------|------|--------|
| **Shader 后处理** | Three.js 中用 toon shading 替换 PBR，参数控制卡通化程度 | 中 |
| **多 LOD 模型** | AI 生成 high-poly + low-poly 两个版本，切换显示 | 低 |
| **模型参数引导** | AI 推理时传入写实度参数 (需模型支持) | 高 |

**建议**：优先采用 Shader 后处理方案，在渲染层实现写实度控制，与 AI 模型解耦。

---

## 4. 待完成：Task 3 — 骨骼绑定方案验证

**负责人**：前端 + 后端协同
**优先级**：P1 (动画系统依赖骨骼)

TripoSR/InstantMesh 输出的 mesh 大概率 **不带骨骼绑定**。

| 方案 | 说明 | 适用性 |
|------|------|--------|
| **Mixamo (Adobe)** | 免费自动绑定，上传模型自动识别关节 | 人形优化，四足动物需验证 |
| **AccuRIG (Reallusion)** | 专为四足动物优化的自动绑定 | 有猫/狗模板，优先验证 |
| **手动绑定** | Blender 手动绑定 | 质量最高但无法自动化 |

**验证步骤**：用 Task 1 生成的 GLB 上传到 Mixamo/AccuRIG，检查能否正确识别猫/狗关节并生成可用骨骼动画。

---

## 5. 待完成：Task 4 — 前后端集成对接

**负责人**：前端 + 后端协同
**优先级**：P2 (Sprint 2 主要内容)

| 对接项 | 当前状态 | 需要的改动 |
|--------|---------|-----------|
| Tauri 调用 FastAPI | `tauri-service.ts` 有 `invoke` 抽象 | 新增 `generatePet()` / `pollTaskStatus()` 等命令 |
| 创建流程接入 API | `CreatePet.tsx` Step 3 是静态页面 | 接入 `/api/v1/generate` + 轮询 `/api/v1/status/{id}` |
| 3D 预览 | Step 4 是占位图 | 改为 PetCanvas 加载真实 GLB |
| 宠物列表对接 | `petStore.ts` 用 localStorage | 对接 `/api/v1/pets` + `/api/v1/model/{id}` |

---

## 6. 时间安排 (修正版)

| 天数 | 事项 | 产出 | 参与角色 |
|------|------|------|---------|
| **Day 1** | 搭建 GPU 环境 + TripoSR 模型加载测试 | 环境就绪 + 首次推理结果 | 后端 |
| **Day 1** | 写实度 Shader 方案原型 | 技术 Demo | 前端 |
| **Day 2** | TripoSR + InstantMesh 对比实测 (3-5 张真实宠物照片) | 实测数据表 | 后端 |
| **Day 2** | Three.js 加载 AI 生成模型 + 骨骼绑定验证 | 加载结果 + Mixamo 测试 | 前端 + 后端 |
| **Day 3** | 汇总报告 + 集成方案 + Go/No-Go 评审 | 完整验证报告 | 全体 |

---

## 7. Go/No-Go 判定标准

| 判定 | 条件 |
|------|------|
| **Go** | 至少 1 个方案 (TripoSR/InstantMesh) 能产出可识别品种的宠物 3D 模型，Three.js 可加载，骨骼可通过 Mixamo/AccuRIG 绑定 |
| **Conditional Go** | 有方案可用，但存在可接受的限制 (如：还原度一般但可通过模板辅助 / 面数偏高需后处理 / 仅 GPU 可用需云端部署) |
| **No-Go** | 所有方案对猫/狗还原度均不可接受，模型不可用或无法集成 |

### No-Go 时的 Plan B

| 降级方案 | 说明 | 用户体验影响 |
|---------|------|------------|
| **预置模板 + AI 纹理** | 预置猫/狗品种 3D 模型库，AI 仅从照片提取毛色纹理贴到模板上 | 品种特征保留，但非"独家还原" |
| **手动捏脸 + AI 辅助** | 用户选择品种/体型/毛色/花纹，AI 辅助生成纹理 | 失去"照片自动还原"核心卖点 |
| **纯云端高价方案** | 使用商业 API (Luma AI / Meshy) 保证质量 | 成本高，可能需要向用户收费 |

---

## 8. 风险提示 (修正版)

| 风险 | 缓解措施 | 状态 |
|------|---------|------|
| TripoSR/InstantMesh 以通用物体为主，动物还原度未知 | 优先实测；若不理想，调研 TRELLIS/MVDream 等多视图方案 | 待验证 |
| GPU 环境不可用 (团队无显卡) | 使用云端 GPU (AutoDL/Lambda Labs) 或 Colab 免费 GPU | 需确认 |
| 生成模型不带骨骼绑定 | 已验证 Mixamo/AccuRIG 可行性；预留手动绑定 as Plan C | 待验证 |
| 写实度控制与 AI 输出耦合 | 采用 Shader 后处理方案解耦 | 设计中 |

---

## 附录 A：与 PRD 的对应关系

| PRD 需求 | 对应工作 |
|---------|---------|
| S4.1 形象生成模块 (照片-3D) | Task 1 真实模型实测 |
| S4.1 写实度控制 0-100 | Task 2 Shader 方案 |
| S4.1 本地模型 vs 云端 API | Task 1 GPU 实测 + 性能评估 |
| S8 风险：本地 AI 对低配机器不友好 | Task 1 显存/性能记录 |
| Sprint 2 目标 (形象生成 MVP) | Task 4 前后端集成 |

---

> **下一步**：确认 GPU 测试环境，开始 Task 1 实测。
