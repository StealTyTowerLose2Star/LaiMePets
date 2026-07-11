import { useState, useEffect } from 'react';
import { Button, Toggle, Slider } from '@/components/ui';
import { navigate } from '@/hooks/useRouter';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePetStore } from '@/stores/petStore';
import { saveEnvConfig, loadEnvConfig } from '@/services/tauri-service';
import type { ApiKeyConfig } from '@/services/tauri-service';
import type { DisplayMode, PerformanceTier } from '@/types';

type SettingsTab = 'pets' | 'display' | 'reminders' | 'api' | 'about';

/**
 * 主控制面板
 *
 * 左侧 Tab 导航 + 右侧内容区
 * 对应 ui-screens.md §5
 *
 * 尺寸：520×460px
 */
export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('pets');

  const tabs: { key: SettingsTab; label: string; icon: string }[] = [
    { key: 'pets', label: '宠物管理', icon: '🐱' },
    { key: 'display', label: '显示设置', icon: '🖥️' },
    { key: 'api', label: 'AI 配置', icon: '🔑' },
    { key: 'reminders', label: '提醒设置', icon: '🔔' },
    { key: 'about', label: '关于', icon: 'ℹ️' },
  ];

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      <div className="acrylic flex h-[460px] w-[520px] overflow-hidden rounded-lg shadow-lg">
        {/* 左侧 Tab 导航 */}
        <nav className="flex w-40 shrink-0 flex-col border-r border-neutral-200/50 py-4 dark:border-neutral-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-left text-body transition-colors duration-fast
                ${
                  activeTab === tab.key
                    ? 'border-r-2 border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* 右侧内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'pets' && <PetManagementTab />}
          {activeTab === 'display' && <DisplaySettingsTab />}
          {activeTab === 'api' && <ApiSettingsTab />}
          {activeTab === 'reminders' && <RemindersTab />}
          {activeTab === 'about' && <AboutTab />}
        </div>
      </div>

      {/* 返回桌面 */}
      <button
        onClick={() => navigate({ page: 'desktop' })}
        className="absolute right-3 top-3 rounded-sm p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        ✕
      </button>
    </div>
  );
}

/** ── Tab 1: 宠物管理 ── */
function PetManagementTab() {
  const profiles = usePetStore((s) => s.profiles);
  const removeProfile = usePetStore((s) => s.removeProfile);
  const setDefaultProfile = usePetStore((s) => s.setDefaultProfile);

  return (
    <div>
      <h3 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        宠物管理
      </h3>
      <p className="mt-1 text-body-sm text-neutral-500">
        管理你创建的所有宠物形象
      </p>

      {profiles.length === 0 ? (
        /* 空状态 */
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="text-4xl">🐾</span>
          <p className="mt-3 text-body text-neutral-500">还没有宠物</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => navigate({ page: 'create-pet', step: 1 })}
          >
            创建第一个宠物
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {profiles.map((pet) => (
            <div
              key={pet.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
                🐱
              </div>
              <div className="flex-1">
                <p className="text-body font-medium text-neutral-900 dark:text-neutral-100">
                  {pet.name}
                  {pet.isDefault && (
                    <span className="ml-1 text-caption text-brand-500">
                      [默认]
                    </span>
                  )}
                </p>
                <p className="text-caption text-neutral-400">
                  {pet.createdAt}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!pet.isDefault) setDefaultProfile(pet.id);
                }}
              >
                {pet.isDefault ? '当前默认' : '设为默认'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeProfile(pet.id)}
              >
                🗑️
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** ── Tab 2: 显示设置 ── */
function DisplaySettingsTab() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  return (
    <div>
      <h3 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        显示设置
      </h3>
      <div className="mt-6 space-y-6">
        {/* 显示模式 */}
        <fieldset>
          <legend className="mb-2 text-body-sm font-medium text-neutral-500">
            显示模式
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(['float', 'window'] as DisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => saveSettings({ displayMode: mode })}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  settings.displayMode === mode
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <p className="text-body font-medium">
                  {mode === 'float' ? '🪟 悬浮窗' : '📦 窗口模式'}
                </p>
                <p className="text-caption text-neutral-500">
                  {mode === 'float' ? '透明无边框' : '固定窗口'}
                </p>
              </button>
            ))}
          </div>
        </fieldset>

        <Slider
          label="宠物大小"
          value={Math.round(settings.petSize * 100)}
          onChange={(v) => saveSettings({ petSize: v / 100 })}
          min={50}
          max={200}
          formatValue={(v) => `${v}%`}
        />

        <Slider label="音量" value={settings.volume} onChange={(v) => saveSettings({ volume: v })} />

        {/* 性能模式 */}
        <fieldset>
          <legend className="mb-2 text-body-sm font-medium text-neutral-500">
            性能模式
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as PerformanceTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => saveSettings({ performanceMode: tier })}
                className={`rounded-lg border p-2 text-center transition-colors ${
                  settings.performanceMode === tier
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <p className="text-body font-medium capitalize">{tier}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <Toggle
          label="开机自启"
          checked={settings.autoStart}
          onChange={(v) => saveSettings({ autoStart: v })}
        />
      </div>
    </div>
  );
}

/** ── Tab 3: API 配置 ── */
function ApiSettingsTab() {
  const [keys, setKeys] = useState<Partial<ApiKeyConfig>>({});
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEnvConfig().then((cfg) => {
      if (cfg) setKeys(cfg);
    });
  }, []);

  const handleSave = async () => {
    await saveEnvConfig(keys);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateKey = (name: keyof ApiKeyConfig, value: string) => {
    setKeys((prev) => ({ ...prev, [name]: value }));
  };

  const fields: { name: keyof ApiKeyConfig; label: string; hint: string }[] = [
    {
      name: 'REPLICATE_API_TOKEN',
      label: 'Replicate API Token',
      hint: '从 replicate.com/account/api-tokens 获取 — Nano Banana 2 视角合成需要',
    },
    {
      name: 'TRIPO_API_KEY',
      label: 'Tripo API Key',
      hint: '从 platform.tripo3d.ai 获取 — 3D 模型生成（免费 300 credits/月）',
    },
    {
      name: 'DASHSCOPE_API_KEY',
      label: 'DashScope API Key',
      hint: '从 bailian.console.aliyun.com 获取 — 阿里云百炼（备选 3D 引擎）',
    },
  ];

  return (
    <div>
      <h3 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        AI 配置
      </h3>
      <p className="mt-1 text-body-sm text-neutral-500">
        配置 AI 服务的 API Key，模型生成功能需要至少一个有效的 Key
      </p>

      <div className="mt-4 space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="text-body-sm font-medium text-neutral-700 dark:text-neutral-300">
              {f.label}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type={showKey[f.name] ? 'text' : 'password'}
                value={keys[f.name] ?? ''}
                onChange={(e) => updateKey(f.name, e.target.value)}
                placeholder="未设置"
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-sm text-neutral-900 placeholder:text-neutral-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <button
                onClick={() =>
                  setShowKey((prev) => ({ ...prev, [f.name]: !prev[f.name] }))
                }
                className="rounded-lg border border-neutral-300 px-3 py-2 text-body-sm text-neutral-500 hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800"
              >
                {showKey[f.name] ? '🙈' : '👁'}
              </button>
            </div>
            <p className="mt-1 text-caption text-neutral-400">{f.hint}</p>
          </div>
        ))}

        {/* 视角合成开关 */}
        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <Toggle
            label="启用 AI 视角合成（Nano Banana 2）"
            checked={keys.ENABLE_VIEW_SYNTHESIS === 'true'}
            onChange={(v) =>
              updateKey('ENABLE_VIEW_SYNTHESIS', v ? 'true' : 'false')
            }
          />
          <p className="mt-1 text-caption text-neutral-400">
            开启后，生成 3D 模型前会先用 AI 将照片转为标准四视图，提升模型还原度。
            需要 Replicate API Token 且账户有余额。
          </p>
        </div>
      </div>

      <Button className="mt-6 w-full" onClick={handleSave}>
        {saved ? '已保存' : '保存配置'}
      </Button>
    </div>
  );
}

/** ── Tab 4: 提醒设置 ── */
function RemindersTab() {
  return (
    <div>
      <h3 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        提醒设置
      </h3>
      <p className="mt-1 text-body-sm text-neutral-500">
        宠物会在设定时间提醒你
      </p>
      <div className="mt-6 space-y-4">
        {[
          { icon: '💧', label: '喝水提醒', desc: '每 60 分钟提醒一次' },
          { icon: '☕', label: '休息提醒', desc: '每 90 分钟提醒一次' },
          { icon: '🐕', label: '遛宠提醒', desc: '每天 18:00 提醒' },
        ].map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{r.icon}</span>
              <div>
                <p className="text-body font-medium text-neutral-900 dark:text-neutral-100">
                  {r.label}
                </p>
                <p className="text-caption text-neutral-400">{r.desc}</p>
              </div>
            </div>
            <Toggle checked={i < 2} onChange={() => {}} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** ── Tab 4: 关于 ── */
function AboutTab() {
  return (
    <div className="text-center">
      <h3 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
        关于 LaiMePet
      </h3>
      <div className="mt-6 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          <span className="text-2xl">🐱</span>
        </div>
        <p className="mt-3 text-body-lg font-semibold text-brand-500">
          LaiMePet
        </p>
        <p className="text-caption text-neutral-500">版本 0.1.0 (Sprint 1)</p>
      </div>

      <div className="mt-6 space-y-2 text-left">
        {[
          '官方网站',
          '用户协议',
          '隐私政策',
          '开源许可',
          '问题反馈',
        ].map((link, i) => (
          <button
            key={i}
            className="block w-full rounded px-3 py-1.5 text-left text-body text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {link} ›
          </button>
        ))}
      </div>
    </div>
  );
}
