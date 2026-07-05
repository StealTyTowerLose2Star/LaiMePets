import { useState, useCallback } from 'react';
import { PetCanvas } from '@/components/pet';
import { MoodIndicator } from '@/components/pet';
import { navigate } from '@/hooks/useRouter';
import { usePetStore } from '@/stores/petStore';
import { hideToTray, toggleDisplayMode } from '@/services/tauri-service';
import type { PetBehavior } from '@/types';

/**
 * 桌面宠物主页面
 *
 * 两种显示模式由 Tauri 窗口控制（透明无边框 vs 固定窗口）
 * 此页面覆盖主要的交互 UI 层
 *
 * 对应 ui-screens.md §3-4
 */
export default function Desktop() {
  const [behavior, setBehavior] = useState<PetBehavior>('idle');
  const [showControls, setShowControls] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showPetSubmenu, setShowPetSubmenu] = useState(false);

  const currentProfileId = usePetStore((s) => s.petState.currentProfileId);
  const mood = usePetStore((s) => s.petState.mood);
  const moodValue = usePetStore((s) => s.petState.moodValue);
  const profiles = usePetStore((s) => s.profiles);
  const switchProfile = usePetStore((s) => s.switchProfile);
  const recordInteraction = usePetStore((s) => s.recordInteraction);
  const updateMood = usePetStore((s) => s.updateMood);

  const currentProfile = profiles.find((p) => p.id === currentProfileId);

  // ── 交互处理 ──

  const triggerBehavior = useCallback((b: PetBehavior, duration = 2000) => {
    setBehavior(b);
    setTimeout(() => setBehavior('idle'), duration);
  }, []);

  const handleFeed = useCallback(() => {
    recordInteraction('feeding');
    updateMood(Math.min(100, moodValue + 10));
    triggerBehavior('idle');
  }, [recordInteraction, updateMood, moodValue, triggerBehavior]);

  const handleInteract = useCallback(() => {
    recordInteraction('petting');
    updateMood(Math.min(100, moodValue + 5));
    triggerBehavior('stretching', 2000);
  }, [recordInteraction, updateMood, moodValue, triggerBehavior]);

  const handleSwitchPet = useCallback(
    (id: string) => {
      switchProfile(id);
      setShowMenu(false);
      setShowPetSubmenu(false);
    },
    [switchProfile],
  );

  const handleHide = useCallback(async () => {
    setShowMenu(false);
    try {
      await hideToTray();
    } catch {
      // 浏览器降级：返回首页
      navigate({ page: 'welcome' });
    }
  }, []);

  const handleToggleMode = useCallback(async () => {
    setShowMenu(false);
    try {
      await toggleDisplayMode();
    } catch {
      // 浏览器降级：无操作
    }
  }, []);

  const handleExit = useCallback(() => {
    setShowMenu(false);
    navigate({ page: 'welcome' });
  }, []);

  // ── 右键菜单 ──

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
    setShowPetSubmenu(false);
  }, []);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-transparent select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        setShowControls(false);
        setShowMenu(false);
      }}
      onContextMenu={handleContextMenu}
      onClick={() => setShowMenu(false)}
    >
      {/* ── 3D 宠物画布 ── */}
      <PetCanvas
        behavior={behavior}
        interactive={false}
        modelPath={currentProfile?.modelPath}
      />

      {/* ── 当前宠物名称（左下角）── */}
      {currentProfile && (
        <div className="pointer-events-none absolute bottom-2 left-3">
          <span className="text-caption text-neutral-400/60">
            {currentProfile.name}
          </span>
        </div>
      )}

      {/* ── 迷你心情指示器（右上角）── */}
      <div className="absolute right-2 top-2">
        <MoodIndicator mood={mood} size={8} />
      </div>

      {/* ── 悬停控制条（40px 胶囊）── */}
      {showControls && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          <div className="acrylic flex items-center gap-1 rounded-full px-2 py-1.5 shadow-md">
            {currentProfile && (
              <button
                onClick={() => setShowPetSubmenu(!showPetSubmenu)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title={`当前: ${currentProfile.name}`}
              >
                🐱
              </button>
            )}
            <button
              onClick={handleFeed}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="投喂"
            >
              🍖
            </button>
            <button
              onClick={handleInteract}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="互动"
            >
              🎮
            </button>
            <button
              onClick={() => navigate({ page: 'settings' })}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="设置"
            >
              ⚙️
            </button>
          </div>

          {/* 宠物切换下拉 */}
          {showPetSubmenu && profiles.length > 1 && (
            <div className="acrylic absolute left-0 right-0 top-full mt-1 rounded-lg border border-neutral-200/50 py-1 shadow-lg dark:border-neutral-700/50">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitchPet(p.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    p.id === currentProfileId
                      ? 'font-medium text-brand-600'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span>{p.id === currentProfileId ? '●' : '○'}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 右键菜单 ── */}
      {showMenu && (
        <div
          className="acrylic fixed z-50 min-w-[180px] rounded-lg border border-neutral-200/50 py-1 shadow-lg dark:border-neutral-700/50"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 切换宠物子菜单 */}
          <button
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setShowPetSubmenu(!showPetSubmenu)}
          >
            <span className="w-4 text-center">🐱</span>
            <span className="flex-1">切换宠物</span>
            <span className="text-neutral-400">{showPetSubmenu ? '▾' : '▸'}</span>
          </button>
          {showPetSubmenu && (
            <div className="border-l-2 border-brand-300 ml-6">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitchPet(p.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1 text-left text-body-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    p.id === currentProfileId ? 'text-brand-600 font-medium' : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {p.id === currentProfileId ? '●' : '○'} {p.name}
                </button>
              ))}
            </div>
          )}

          {/* 显示模式 */}
          <button
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={handleToggleMode}
          >
            <span className="w-4 text-center">🖥️</span>
            <span className="flex-1">切换显示模式</span>
            <span className="text-caption text-neutral-400">浮动/窗口</span>
          </button>

          <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

          {/* 互动 */}
          <button
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => {
              handleInteract();
              setShowMenu(false);
            }}
          >
            <span className="w-4 text-center">🎮</span>
            <span>互动</span>
          </button>

          <button
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => {
              navigate({ page: 'settings' });
              setShowMenu(false);
            }}
          >
            <span className="w-4 text-center">⚙️</span>
            <span>设置</span>
          </button>

          <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />

          {/* 隐藏 */}
          <button
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={handleHide}
          >
            <span className="w-4 text-center">👁️</span>
            <span>隐藏到托盘</span>
          </button>

          {/* 退出 */}
          <button
            className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={handleExit}
          >
            <span className="w-4 text-center">🚪</span>
            <span>退出桌面模式</span>
          </button>
        </div>
      )}

      {/* 提示 */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
        <span className="text-caption text-neutral-400/50">
          悬停查看控制 · 右键更多选项
        </span>
      </div>
    </div>
  );
}
