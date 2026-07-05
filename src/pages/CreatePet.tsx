import { useState, useEffect, useRef } from 'react';
import { Button, Slider } from '@/components/ui';
import { navigate } from '@/hooks/useRouter';
import { toast } from '@/components/ui';
import { usePetStore } from '@/stores/petStore';
import {
  generatePet,
  pollTaskStatus,
  getModelUrl,
  getThumbnailUrl,
} from '@/services/api';
import type { TaskStatus } from '@/services/api';

// ── 常量 ──

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 50;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';
const TASK_STORAGE_KEY = 'lai-me-pet-pending-task';

// ── 工具函数 ──

function isValidFormat(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return ACCEPTED_FORMATS.includes(ext);
}

interface FileValidation {
  file: File;
  valid: boolean;
  issue?: string;
}

function validateFile(file: File): FileValidation {
  if (!isValidFormat(file.name)) {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '?');
    return { file, valid: false, issue: `不支持的格式 ${ext}` };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return { file, valid: false, issue: `文件过大 (${sizeMB}MB > ${MAX_FILE_SIZE_MB}MB)` };
  }
  return { file, valid: true };
}

/**
 * 宠物创建流程（5 步向导）
 *
 * 对应 ui-screens.md §2：
 * 2.1 上传 → 2.2 写实度配置 → 2.3 生成等待 → 2.4 预览 → 2.5 命名
 *
 * v1.3: 多照片验证 + 进度恢复 + 重试增强
 */
export default function CreatePet() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [realism, setRealism] = useState(50);
  const [useCloud, setUseCloud] = useState(true);
  const [petName, setPetName] = useState('');

  // 生成状态
  const [taskId, setTaskId] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<TaskStatus | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 文件验证
  const fileValidations = files.map(validateFile);
  const validFiles = fileValidations.filter((v) => v.valid);

  const canNext =
    (step === 1 && validFiles.length >= MIN_PHOTOS) ||
    (step === 2) ||
    (step === 3 && genStatus?.status === 'completed') ||
    (step === 4) ||
    (step === 5 && petName.trim().length > 0);

  const totalSteps = 5;

  // ── 生成失败时清除已保存的 taskId ──
  useEffect(() => {
    if (genError) {
      try {
        localStorage.removeItem(TASK_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [genError]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      <div className="acrylic w-[520px] rounded-lg p-8 shadow-lg">
        {/* 步骤进度条 */}
        <div className="mb-6 flex items-center gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div
                className={`h-1 flex-1 rounded-full transition-colors duration-fast ${
                  i + 1 <= step
                    ? 'bg-brand-500'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              />
              {i < totalSteps - 1 && <div className="w-1" />}
            </div>
          ))}
          <span className="ml-3 text-caption tabular-nums text-neutral-400">
            {step}/{totalSteps}
          </span>
        </div>

        {/* ── Step 1: 上传照片 ── */}
        {step === 1 && (
          <UploadStep
            files={files}
            validations={fileValidations}
            onFilesChange={setFiles}
            minPhotos={MIN_PHOTOS}
            maxPhotos={MAX_PHOTOS}
          />
        )}

        {/* ── Step 2: 写实度配置 ── */}
        {step === 2 && (
          <ConfigStep
            realism={realism}
            onRealismChange={setRealism}
            useCloud={useCloud}
            onUseCloudChange={setUseCloud}
          />
        )}

        {/* ── Step 3: 生成等待 ── */}
        {step === 3 && (
          <GenerationStep
            files={files}
            realism={realism}
            petName={petName}
            taskId={taskId}
            genStatus={genStatus}
            genError={genError}
            isGenerating={isGenerating}
            onStart={(tid) => {
              setTaskId(tid);
              setIsGenerating(true);
              setGenError(null);
              // 持久化 taskId 用于进度恢复
              try {
                localStorage.setItem(
                  TASK_STORAGE_KEY,
                  JSON.stringify({ taskId: tid, startedAt: Date.now() }),
                );
              } catch {
                // ignore
              }
            }}
            onComplete={(status, pid) => {
              setGenStatus(status);
              setPetId(pid);
              setIsGenerating(false);
              // 清理持久化
              try {
                localStorage.removeItem(TASK_STORAGE_KEY);
              } catch {
                // ignore
              }
            }}
            onError={(err) => {
              setGenError(err);
              setIsGenerating(false);
            }}
            onRetry={() => {
              setGenError(null);
              setGenStatus(null);
              setTaskId(null);
              setPetId(null);
              setIsGenerating(false);
            }}
          />
        )}

        {/* ── Step 4: 预览 ── */}
        {step === 4 && (
          <PreviewStep petId={petId} genStatus={genStatus} />
        )}

        {/* ── Step 5: 命名 ── */}
        {step === 5 && (
          <NamingStep name={petName} onNameChange={setPetName} />
        )}

        {/* 底部操作栏 */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 1) {
                navigate({ page: 'welcome' });
              } else {
                setStep((s) => s - 1);
              }
            }}
          >
            {step === 1 ? '返回首页' : '上一步'}
          </Button>
          <Button
            disabled={!canNext}
            onClick={() => {
              if (step < totalSteps) {
                setStep((s) => s + 1);
              } else {
                // 保存到 petStore
                if (petId) {
                  const addProfile = usePetStore.getState().addProfile;
                  addProfile({
                    id: petId,
                    name: petName || '未命名',
                    createdAt: new Date().toISOString(),
                    modelPath: getModelUrl(petId),
                    thumbnailPath: getThumbnailUrl(petId),
                    realism,
                    isDefault: false,
                    species: 'cat',
                  });
                }
                toast.success(`宠物 "${petName || '未命名'}" 创建成功！`);
                navigate({ page: 'desktop' });
              }
            }}
          >
            {step === totalSteps ? '完成创建' : '下一步'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** ── Step 1: 上传 ── */
function UploadStep({
  files,
  validations,
  onFilesChange,
  minPhotos,
  maxPhotos,
}: {
  files: File[];
  validations: FileValidation[];
  onFilesChange: (f: File[]) => void;
  minPhotos: number;
  maxPhotos: number;
}) {
  const validCount = validations.filter((v) => v.valid).length;
  const invalidCount = validations.filter((v) => !v.valid).length;
  const [showGuide, setShowGuide] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f.name),
    );
    onFilesChange([...files, ...dropped].slice(0, maxPhotos));
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPTED_MIME;
    input.onchange = () => {
      if (input.files) {
        onFilesChange([...files, ...Array.from(input.files)].slice(0, maxPhotos));
      }
    };
    input.click();
  };

  return (
    <div>
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        上传宠物照片
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        至少 {minPhotos} 张清晰照片（多角度更真实），支持 JPG/PNG/WEBP，单张 ≤{MAX_FILE_SIZE_MB}MB，最多 {maxPhotos} 张
      </p>

      {/* 拍照指导 */}
      <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-900/20">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <span className="text-body-sm font-medium text-brand-700 dark:text-brand-300">
            📷 如何拍出最像的 3D 宠物？
          </span>
          <span className="text-brand-500 text-caption">
            {showGuide ? '收起 ▲' : '展开 ▼'}
          </span>
        </button>
        {showGuide && (
          <div className="border-t border-brand-200 px-3 py-3 dark:border-brand-800">
            <p className="text-caption text-neutral-600 dark:text-neutral-400">
              上传 <strong>3-5 张不同角度</strong>的照片可启用多视图 3D 重建，
              比单张照片还原度提升 <strong>60%+</strong>。
            </p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[
                { emoji: '🐱', label: '正面', desc: '眼睛看向镜头', color: 'bg-green-100 dark:bg-green-900' },
                { emoji: '🐱', label: '左侧面', desc: '90° 侧面全身', color: 'bg-blue-100 dark:bg-blue-900' },
                { emoji: '🐱', label: '右侧面', desc: '另一侧 90°', color: 'bg-purple-100 dark:bg-purple-900' },
                { emoji: '🐱', label: '背面', desc: '从背后拍摄', color: 'bg-orange-100 dark:bg-orange-900' },
                { emoji: '📐', label: '45°俯视', desc: '从上往下斜拍', color: 'bg-pink-100 dark:bg-pink-900' },
              ].map((angle) => (
                <div
                  key={angle.label}
                  className={`flex flex-col items-center rounded-lg ${angle.color} p-2 text-center`}
                >
                  <span className="text-xl">{angle.emoji}</span>
                  <span className="mt-0.5 text-caption font-medium text-neutral-700 dark:text-neutral-300">
                    {angle.label}
                  </span>
                  <span className="text-[10px] leading-tight text-neutral-500">
                    {angle.desc}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1 text-caption text-neutral-500">
              <p>💡 <strong>光线充足</strong>：白天自然光拍摄，避免阴影遮挡</p>
              <p>💡 <strong>纯色背景</strong>：背景越简单，AI 抠图越精准</p>
              <p>💡 <strong>全身入镜</strong>：拍全头部+身体+尾巴，不要裁切</p>
              <p>💡 <strong>保持距离</strong>：宠物占画面 50-70%，不要贴太近</p>
            </div>
          </div>
        )}
      </div>

      {/* 拖拽上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="mt-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-brand-400 dark:border-neutral-600 dark:hover:border-brand-400"
        onClick={handleFileSelect}
      >
        <span className="text-3xl">📁</span>
        <p className="mt-2 text-body text-neutral-400">
          拖拽文件到此处，或点击选择
        </p>
        <p className="text-caption text-neutral-400">
          已选择 {files.length} 个文件（{validCount} 张合格）
        </p>
      </div>

      {/* 文件列表 + 验证状态 */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {validations.map((v, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded px-2 py-1 text-caption ${
                v.valid
                  ? 'bg-success/5 text-neutral-700 dark:text-neutral-300'
                  : 'bg-error/5 text-error'
              }`}
            >
              <span className="truncate flex-1">
                {v.valid ? '✓' : '✗'} {v.file.name.length > 30
                  ? v.file.name.slice(0, 27) + '...'
                  : v.file.name}
                <span className="ml-2 text-neutral-400">
                  ({(v.file.size / 1024).toFixed(0)} KB)
                </span>
              </span>
              {v.issue && (
                <span className="ml-2 shrink-0 text-error">{v.issue}</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFilesChange(files.filter((_, j) => j !== i));
                }}
                className="ml-2 text-neutral-400 hover:text-error shrink-0"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 不足提示 */}
      {validCount < minPhotos && files.length > 0 && (
        <p className="mt-3 text-caption text-warning">
          {invalidCount > 0 && `${invalidCount} 张不合格 · `}
          还需要 {minPhotos - validCount} 张合格照片
        </p>
      )}
      {files.length === 0 && (
        <p className="mt-3 text-caption text-warning">
          至少需要 {minPhotos} 张照片才能继续
        </p>
      )}
    </div>
  );
}

/** ── Step 2: 配置 ── */
function ConfigStep({
  realism,
  onRealismChange,
  useCloud,
  onUseCloudChange,
}: {
  realism: number;
  onRealismChange: (v: number) => void;
  useCloud: boolean;
  onUseCloudChange: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        配置生成参数
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        调整写实度和生成方式
      </p>

      <div className="mt-6 space-y-6">
        <Slider
          label="写实度"
          value={realism}
          onChange={onRealismChange}
          min={0}
          max={100}
          formatValue={(v) =>
            v < 30 ? 'Q版' : v < 70 ? '半写实' : '高度写实'
          }
        />

        {/* 生成方式 */}
        <fieldset>
          <legend className="mb-3 text-body-sm font-medium text-neutral-500">
            生成方式
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onUseCloudChange(false)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                !useCloud
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <p className="text-body font-medium text-neutral-900 dark:text-neutral-100">
                🖥️ 本地模型
              </p>
              <p className="mt-1 text-caption text-neutral-500">
                隐私优先，免费，需要较强显卡
              </p>
            </button>
            <button
              onClick={() => onUseCloudChange(true)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                useCloud
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <p className="text-body font-medium text-neutral-900 dark:text-neutral-100">
                ☁️ 云端生成
              </p>
              <p className="mt-1 text-caption text-neutral-500">
                高质量，需要联网（DashScope 阿里云）
              </p>
            </button>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

/** ── Step 3: 生成等待 ── */
function GenerationStep({
  files,
  realism,
  petName,
  genStatus,
  genError,
  isGenerating,
  onStart,
  onComplete,
  onError,
  onRetry,
}: {
  files: File[];
  realism: number;
  petName: string;
  taskId: string | null;
  genStatus: TaskStatus | null;
  genError: string | null;
  isGenerating: boolean;
  onStart: (taskId: string) => void;
  onComplete: (status: TaskStatus, petId: string) => void;
  onError: (error: string) => void;
  onRetry: () => void;
}) {
  const startedRef = useRef(false);
  const taskIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        // ── 进度恢复：检查是否有未完成的任务 ──
        let resumeTaskId: string | null = null;
        try {
          const saved = localStorage.getItem(TASK_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as { taskId: string; startedAt: number };
            const elapsed = Date.now() - parsed.startedAt;
            // 10 分钟内视为有效
            if (elapsed < 10 * 60 * 1000) {
              resumeTaskId = parsed.taskId;
            }
          }
        } catch {
          // ignore
        }

        if (resumeTaskId) {
          // 恢复已有任务
          taskIdRef.current = resumeTaskId;
          onStart(resumeTaskId);
        } else {
          // 提交新任务
          const task = await generatePet(files, realism, petName);
          taskIdRef.current = task.task_id;
          onStart(task.task_id);
        }

        // 轮询直到完成
        const result = await pollTaskStatus(
          taskIdRef.current,
          undefined,
          1500,
          300_000,
        );

        if (result.status === 'failed') {
          onError(result.message || 'AI 生成失败，请重试');
          return;
        }

        const pid = result.result?.pet_id;
        if (!pid) {
          onError('生成完成但未返回模型 ID');
          return;
        }

        onComplete(result, pid);
      } catch (err) {
        onError(err instanceof Error ? err.message : '未知错误');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const phases = ['特征提取', '模型生成', '骨骼绑定'];
  const progress = genStatus?.progress ?? 0;
  const currentStep = genStatus?.current_step ?? '';
  const phaseIndex =
    progress < 30 ? 0 : progress < 70 ? 1 : progress < 100 ? 2 : 3;

  return (
    <div className="text-center">
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {isGenerating
          ? '正在生成宠物形象'
          : genError
            ? '生成遇到问题'
            : '生成完成！'}
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        {isGenerating
          ? '正在通过 AI 生成 3D 模型，预计 1-2 分钟'
          : genError
            ? '请检查网络连接后重试'
            : '模型已生成，请前往预览'}
      </p>

      {/* 阶段指示器 */}
      <div className="mt-6 space-y-3">
        {phases.map((label, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              i < phaseIndex
                ? 'border-success/30 bg-success/5'
                : i === phaseIndex && isGenerating
                  ? 'border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                  : i === phaseIndex && genError
                    ? 'border-error/30 bg-error/5'
                    : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {i < phaseIndex ? (
              <span className="text-success">✓</span>
            ) : i === phaseIndex && isGenerating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-500" />
            ) : i === phaseIndex && genError ? (
              <span className="text-error">✗</span>
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
            )}
            <span
              className={`text-body-sm ${
                i < phaseIndex
                  ? 'text-neutral-700 dark:text-neutral-200'
                  : i === phaseIndex
                    ? 'text-neutral-700 dark:text-neutral-200 font-medium'
                    : 'text-neutral-400'
              }`}
            >
              {label}
              {i === phaseIndex && currentStep && (
                <span className="ml-2 text-caption text-neutral-400">
                  — {currentStep}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* 进度条 */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className={`h-full rounded-full transition-all duration-slow ${
            genError ? 'bg-error' : 'bg-brand-500'
          }`}
          style={{ width: `${Math.max(progress, phaseIndex * 25)}%` }}
        />
      </div>

      {/* 进度百分比 */}
      {isGenerating && (
        <p className="mt-2 text-caption text-neutral-400">
          {Math.round(progress)}% — {currentStep || '处理中...'}
        </p>
      )}

      {/* 错误信息 + 操作 */}
      {genError && (
        <div className="mt-4 rounded-lg border border-error/30 bg-error/5 p-4 text-left">
          <p className="text-body-sm font-medium text-error">生成失败</p>
          <p className="mt-1 text-caption text-neutral-500">{genError}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // 重新开始生成
                startedRef.current = false;
                onRetry();
              }}
            >
              🔄 重新生成
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // 返回上一步更换照片
                onRetry();
                navigate({ page: 'create-pet', step: 1 });
              }}
            >
              📷 更换照片
            </Button>
          </div>
        </div>
      )}

      {!genError && (
        <p className="mt-4 text-caption text-neutral-400">
          💡 提示：照片越清晰、角度越多，生成效果越好
        </p>
      )}
    </div>
  );
}

/** ── Step 4: 预览 ── */
function PreviewStep({
  petId,
  genStatus,
}: {
  petId: string | null;
  genStatus: TaskStatus | null;
}) {
  const modelSize = genStatus?.result?.model_size_bytes;
  const modelSizeStr = modelSize
    ? modelSize > 1_000_000
      ? `${(modelSize / 1_000_000).toFixed(1)} MB`
      : `${(modelSize / 1000).toFixed(0)} KB`
    : '?';

  return (
    <div>
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        预览宠物形象
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        3D 模型已生成，可在桌面宠物中加载使用
      </p>

      {/* 3D 预览区域 */}
      <div className="mt-4 flex flex-col items-center rounded-lg bg-neutral-100 p-6 dark:bg-neutral-800">
        {/* 缩略图 */}
        {petId ? (
          <img
            src={getThumbnailUrl(petId)}
            alt="宠物缩略图"
            className="h-48 w-48 rounded-xl object-cover shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-700">
            <span className="text-6xl">🐱</span>
          </div>
        )}

        {/* 模型信息 */}
        <div className="mt-4 w-full space-y-2 text-body-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">模型 ID</span>
            <span className="font-mono text-neutral-700 dark:text-neutral-300">
              {petId ?? '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">文件大小</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              {modelSizeStr}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">格式</span>
            <span className="text-neutral-700 dark:text-neutral-300">GLB 2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">AI 引擎</span>
            <span className="text-neutral-700 dark:text-neutral-300">
              DashScope (Tripo-P1.0)
            </span>
          </div>
        </div>

        {/* 下载按钮 */}
        {petId && (
          <div className="mt-4 flex gap-3">
            <a
              href={getModelUrl(petId)}
              download={`${petId}.glb`}
              className="text-body-sm text-brand-500 hover:text-brand-600 transition-colors"
            >
              📥 下载 GLB 模型
            </a>
          </div>
        )}
      </div>

      <p className="mt-3 text-caption text-neutral-400">
        不满意？可以返回上一步重新调整写实度或更换照片重新生成
      </p>
    </div>
  );
}

/** ── Step 5: 命名 ── */
function NamingStep({
  name,
  onNameChange,
}: {
  name: string;
  onNameChange: (n: string) => void;
}) {
  return (
    <div className="text-center">
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        给宠物取个名字
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        取一个好听的名字，让宠物更加独一无二
      </p>

      {/* 宠物头像占位 */}
      <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
        <span className="text-3xl">🐱</span>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value.slice(0, 20))}
        placeholder="输入宠物名字..."
        maxLength={20}
        autoFocus
        className="mt-4 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-body-lg text-center text-neutral-900 placeholder:text-neutral-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600"
      />
      <p className="mt-1 text-caption text-neutral-400">
        {name.length}/20 个字符
      </p>
    </div>
  );
}
