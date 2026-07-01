import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  /** 子菜单 */
  children?: MenuItem[];
}

interface ContextMenuProps {
  items: MenuItem[];
  /** 触发右键的容器 ref */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 菜单打开/关闭控制 */
  isOpen: boolean;
  onClose: () => void;
}

export function ContextMenu({
  items,
  isOpen,
  onClose,
}: ContextMenuProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [submenuOpen, setSubmenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleClick = () => onClose();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 调整菜单位置，防止溢出
  const adjustedX = Math.min(position.x, window.innerWidth - 200);
  const adjustedY = Math.min(position.y, window.innerHeight - items.length * 36);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="acrylic fixed z-[60] min-w-[180px] rounded-lg border border-neutral-200/50 py-1 shadow-lg dark:border-neutral-700/50"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, idx) => (
        <div key={idx}>
          {item.divider ? (
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
          ) : (
            <button
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.();
                if (!item.children) onClose();
              }}
              onMouseEnter={() =>
                item.children && setSubmenuOpen(idx)
              }
              onMouseLeave={() => setSubmenuOpen(null)}
              className={`
                flex w-full items-center gap-3 px-3 py-1.5 text-left text-body
                transition-colors duration-fast
                hover:bg-neutral-100 dark:hover:bg-neutral-800
                disabled:cursor-not-allowed disabled:opacity-40
              `}
            >
              {item.icon && (
                <span className="h-4 w-4 shrink-0 text-neutral-500">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.children && (
                <svg
                  className="h-3 w-3 text-neutral-400"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M6.776 3.692a.5.5 0 0 1 .706-.036l4.24 4a.5.5 0 0 1 0 .688l-4.24 4a.5.5 0 0 1-.67-.742L10.068 8 6.74 4.434a.5.5 0 0 1 .036-.742z" />
                </svg>
              )}
            </button>
          )}
          {/* 子菜单 */}
          {item.children && submenuOpen === idx && (
            <div className="acrylic absolute left-full top-0 ml-1 min-w-[150px] rounded-lg border border-neutral-200/50 py-1 shadow-lg dark:border-neutral-700/50">
              {item.children.map((child, childIdx) => (
                <button
                  key={childIdx}
                  role="menuitem"
                  disabled={child.disabled}
                  onClick={() => {
                    child.onClick?.();
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-body transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
                >
                  {child.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
