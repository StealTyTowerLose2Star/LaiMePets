import { useState } from 'react';
import { Button, Slider } from '@/components/ui';
import { navigate } from '@/hooks/useRouter';
import { toast } from '@/components/ui';

/**
 * 宠物创建流程（5 步向导）
 *
 * 对应 ui-screens.md §2：
 * 2.1 上传 → 2.2 写实度配置 → 2.3 生成等待 → 2.4 预览 → 2.5 命名
 *
 * Sprint 2-3 实现完整功能，当前为 UI 骨架
 */
export default function CreatePet() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [realism, setRealism] = useState(50);
  const [useCloud, setUseCloud] = useState(false);
  const [petName, setPetName] = useState('');

  const canNext =
    (step === 1 && files.length >= 5) ||
    (step === 2) ||
    (step === 3) ||
    (step === 4) ||
    (step === 5 && petName.trim().length > 0);

  const totalSteps = 5;

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
          <UploadStep files={files} onFilesChange={setFiles} />
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
        {step === 3 && <GenerationStep />}

        {/* ── Step 4: 预览 ── */}
        {step === 4 && <PreviewStep />}

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
                toast.success(`宠物 "${petName}" 创建成功！`);
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
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (f: File[]) => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(jpg|jpeg|png|mp4|mov)$/i.test(f.name),
    );
    onFilesChange([...files, ...dropped].slice(0, 50));
  };

  return (
    <div>
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        上传宠物照片
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        至少 5 张清晰照片，支持 JPG/PNG/MP4/MOV，最多 50 张
      </p>

      {/* 拖拽上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="mt-4 flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-brand-400 dark:border-neutral-600 dark:hover:border-brand-400"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = '.jpg,.jpeg,.png,.mp4,.mov';
          input.onchange = () => {
            if (input.files) {
              onFilesChange([...files, ...Array.from(input.files)].slice(0, 50));
            }
          };
          input.click();
        }}
      >
        <span className="text-3xl">📁</span>
        <p className="mt-2 text-body text-neutral-400">
          拖拽文件到此处，或点击选择
        </p>
        <p className="text-caption text-neutral-400">
          已选择 {files.length} 个文件
        </p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded bg-neutral-100 px-2 py-1 text-caption text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {f.name.length > 15
                ? f.name.slice(0, 12) + '...'
                : f.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFilesChange(files.filter((_, j) => j !== i));
                }}
                className="ml-1 text-neutral-400 hover:text-error"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {files.length < 5 && (
        <p className="mt-3 text-caption text-warning">
          还需要 {5 - files.length} 张照片
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
                高质量，需要联网，可能产生费用
              </p>
            </button>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

/** ── Step 3: 生成等待 ── */
function GenerationStep() {
  const phases = ['特征提取', '模型生成', '骨骼绑定'];
  const [phase] = useState(0);

  return (
    <div className="text-center">
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        正在生成宠物形象
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        这大约需要 1-3 分钟，请耐心等待
      </p>

      {/* 骨架屏 */}
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              i <= phase
                ? 'border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {i < phase ? (
              <span className="text-success">✓</span>
            ) : i === phase ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
            )}
            <span
              className={`text-body-sm ${
                i <= phase
                  ? 'text-neutral-700 dark:text-neutral-200'
                  : 'text-neutral-400'
              }`}
            >
              {phases[i]}
            </span>
          </div>
        ))}
      </div>

      {/* 进度条 */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-slow"
          style={{ width: `${(phase + 1) * 33}%` }}
        />
      </div>

      <p className="mt-4 text-caption text-neutral-400">
        💡 提示：照片越清晰、角度越多，生成效果越好
      </p>
    </div>
  );
}

/** ── Step 4: 预览 ── */
function PreviewStep() {
  return (
    <div>
      <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        预览宠物形象
      </h2>
      <p className="mt-1 text-body-sm text-neutral-500">
        拖拽旋转查看 3D 形象，不满意可返回调整
      </p>

      {/* 3D 预览区域（占位） */}
      <div className="mt-4 flex h-[320px] items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <div className="text-center">
          <span className="text-6xl">🐱</span>
          <p className="mt-2 text-body-sm text-neutral-400">
            3D 交互预览区域（Sprint 2 接入真实模型）
          </p>
        </div>
      </div>
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
