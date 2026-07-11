/**
 * LaiMePet FastAPI 后端 API 客户端
 *
 * 在 Tauri 环境中直接连接 localhost:8000，
 * 在浏览器开发模式中使用 Vite proxy (/api → localhost:8000)。
 * 所有函数均为异步，返回解析后的 JSON 数据。
 */

// ── 环境检测 ──

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const API_BASE = isTauriEnv()
  ? 'http://localhost:8000/api/v1'
  : '/api/v1';

// ── 类型定义 ──

export interface HealthInfo {
  status: string;
  version: string;
  ai_model: string;
  ai_device: string;
  gpu_available: boolean;
  cloud_model: string;
  generation_mode: string;
  supported_formats: string[];
}

export interface TaskResponse {
  task_id: string;
  status: string;
  message: string;
  estimated_seconds: number;
}

export type TaskStatusCode =
  | 'pending'
  | 'preprocessing'
  | 'view_synthesis'
  | 'generating'
  | 'postprocessing'
  | 'completed'
  | 'failed';

export interface TaskStatus {
  task_id: string;
  status: TaskStatusCode;
  progress: number;
  current_step: string;
  message: string;
  estimated_seconds: number;
  created_at: string;
  updated_at: string;
  result: {
    pet_id: string;
    model_size_bytes: number;
    model_format: string;
  } | null;
}

export interface ViewImage {
  angle: string;
  filename: string;
  size_bytes: number;
}

export interface TaskViews {
  task_id: string;
  count: number;
  images: string[];
  angles: string[];
  urls: string[];
}

export interface PetInfo {
  pet_id: string;
  pet_name: string;
  model_format: string;
  model_size_bytes: number;
  thumbnail_url: string;
  model_url: string;
  created_at: string;
}

// ── API 函数 ──

/** 健康检查 */
export async function checkHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/** 上传照片，启动 3D 生成 */
export async function generatePet(
  photos: File[],
  realism: number = 50,
  petName: string = '',
): Promise<TaskResponse> {
  const formData = new FormData();
  for (const photo of photos) {
    formData.append('photos', photo);
  }
  formData.append('realism', String(realism));
  formData.append('pet_name', petName);

  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `生成请求失败 (HTTP ${res.status})`);
  }

  return res.json();
}

/** 查询生成任务进度 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await fetch(`${API_BASE}/status/${taskId}`);
  if (!res.ok) throw new Error(`查询任务状态失败: ${res.status}`);
  return res.json();
}

/** 获取模型 GLB 下载 URL */
export function getModelUrl(petId: string): string {
  return `${API_BASE}/model/${petId}`;
}

/** 获取模型缩略图 URL */
export function getThumbnailUrl(petId: string): string {
  return `${API_BASE}/model/${petId}/thumbnail`;
}

/** 列出所有已生成宠物 */
export async function listPets(): Promise<PetInfo[]> {
  const res = await fetch(`${API_BASE}/pets`);
  if (!res.ok) throw new Error(`获取宠物列表失败: ${res.status}`);
  return res.json();
}

/**
 * 轮询任务状态直到完成或失败。
 *
 * @param taskId        任务 ID
 * @param onProgress    进度回调 (status, progress, step)
 * @param intervalMs    轮询间隔（毫秒）
 * @param timeoutMs     超时（毫秒）
 * @returns 完成后的 TaskStatus
 */
export async function pollTaskStatus(
  taskId: string,
  onProgress?: (status: TaskStatus) => void,
  intervalMs: number = 1000,
  timeoutMs: number = 180_000, // 3 分钟
): Promise<TaskStatus> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await getTaskStatus(taskId);
    onProgress?.(status);

    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`任务 ${taskId} 超时（${timeoutMs / 1000}s）`);
}

/** 获取视角合成四视图列表 */
export async function getTaskViews(taskId: string): Promise<TaskViews> {
  const res = await fetch(`${API_BASE}/task/${taskId}/views`);
  if (!res.ok) throw new Error(`获取视角列表失败: ${res.status}`);
  return res.json();
}

/** 获取单张视角合成图片的 URL */
export function getViewImageUrl(taskId: string, filename: string): string {
  return `${API_BASE}/task/${taskId}/views/${filename}`;
}
