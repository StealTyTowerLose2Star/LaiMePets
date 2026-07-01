import { type ReactNode, useEffect, useRef } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 400,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-normal"
        onClick={onClose}
      />
      {/* 弹窗 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="acrylic relative rounded-lg p-6 shadow-lg"
        style={{ width }}
      >
        <h2
          id="dialog-title"
          className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
        {footer && (
          <div className="mt-6 flex justify-end gap-3">{footer}</div>
        )}
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-sm p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          aria-label="关闭对话框"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
