import { useEffect, useState, type ReactNode } from 'react';
import { create } from 'zustand';

type ToastType = 'success' | 'warning' | 'error' | 'info' | 'default';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: ReactNode;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    set((s) => ({
      toasts: [...s.toasts.slice(-2), { ...toast, id }], // 最多 3 条
    }));
    // 自动移除
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 5000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 命令式 API：在组件外部也可调用 */
export const toast = {
  success: (message: string) =>
    useToastStore.getState().addToast({ type: 'success', message }),
  warning: (message: string) =>
    useToastStore.getState().addToast({ type: 'warning', message }),
  error: (message: string) =>
    useToastStore.getState().addToast({ type: 'error', message }),
  info: (message: string) =>
    useToastStore.getState().addToast({ type: 'info', message }),
};

const typeStyles: Record<ToastType, string> = {
  success:
    'border-l-success bg-success/10 text-success-dark dark:text-success-light',
  warning:
    'border-l-warning bg-warning/10 text-yellow-800 dark:text-warning-light',
  error: 'border-l-error bg-error/10 text-error dark:text-error-light',
  info: 'border-l-info bg-info/10 text-info dark:text-info-light',
  default:
    'border-l-neutral-400 bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
};

function ToastItem({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    // 触发入场动画
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      role="alert"
      className={`
        flex max-w-80 items-center gap-3 rounded-lg border-l-4 px-4 py-3
        shadow-lg backdrop-blur transition-all duration-normal
        ${typeStyles[toast.type]}
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <span className="text-body flex-1">{toast.message}</span>
      {toast.action}
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        aria-label="关闭通知"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  );
}

/** Toast 容器 — 放在 App 根节点 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
