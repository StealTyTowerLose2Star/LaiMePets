import { useState } from 'react';
import { PetCanvas } from '@/components/pet';
import { MoodIndicator } from '@/components/pet';
import { navigate } from '@/hooks/useRouter';
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
  const [behavior] = useState<PetBehavior>('idle');
  const [showControls, setShowControls] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-transparent"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onContextMenu={handleContextMenu}
      onClick={() => setShowMenu(false)}
    >
      {/* ── 3D 宠物画布 ── */}
      <PetCanvas behavior={behavior} interactive={false} />

      {/* ── 迷你心情指示器（右上角 8px 圆点）── */}
      <div className="absolute right-2 top-2">
        <MoodIndicator mood="happy" size={8} />
      </div>

      {/* ── 悬停控制条（40px 胶囊）── */}
      {showControls && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          <div className="acrylic flex items-center gap-1 rounded-full px-2 py-1.5 shadow-md">
            {[
              { icon: '🐱', label: '切换宠物', action: () => navigate({ page: 'settings', tab: 'pets' }) },
              { icon: '🍖', label: '投喂', action: () => {} },
              { icon: '🎮', label: '互动', action: () => {} },
              { icon: '⚙️', label: '设置', action: () => navigate({ page: 'settings' }) },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.action}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title={btn.label}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 右键菜单 ── */}
      {showMenu && (
        <div
          className="acrylic fixed z-50 min-w-[180px] rounded-lg border border-neutral-200/50 py-1 shadow-lg dark:border-neutral-700/50"
          style={{ left: menuPosition.x, top: menuPosition.y }}
        >
          {[
            { label: '切换宠物', icon: '🐱', submenu: true },
            { label: '显示模式', icon: '🖥️', submenu: true },
            { label: '---' },
            { label: '互动面板', icon: '🎮' },
            { label: '设置', icon: '⚙️', action: () => navigate({ page: 'settings' }) },
            { label: '---' },
            { label: '隐藏宠物', icon: '👁️' },
            { label: '退出', icon: '🚪' },
          ].map((item, i) =>
            item.label === '---' ? (
              <div key={i} className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
            ) : (
              <button
                key={i}
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => {
                  item.action?.();
                  setShowMenu(false);
                }}
              >
                <span className="w-4 text-center">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.submenu && <span className="text-neutral-400">›</span>}
              </button>
            ),
          )}
        </div>
      )}

      {/* 提示：双击打开完整面板 */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
        <span className="text-caption text-neutral-400/60">
          双击打开控制面板 · 右键更多选项
        </span>
      </div>
    </div>
  );
}
