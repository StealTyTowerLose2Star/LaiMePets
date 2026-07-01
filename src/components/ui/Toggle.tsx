interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}: ToggleProps) {
  const dimensions = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const thumbSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <label
      className={`inline-flex items-center gap-2 ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      }`}
    >
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex shrink-0 items-center rounded-full
          transition-colors duration-fast
          ${dimensions}
          ${checked ? 'bg-brand-500' : 'bg-neutral-300 dark:bg-neutral-600'}
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-sm
            transition-transform duration-fast
            ${thumbSize}
            ${checked ? (size === 'sm' ? 'translate-x-3' : 'translate-x-4') : 'translate-x-0.5'}
          `}
        />
      </button>
      {label && (
        <span className="text-body text-neutral-700 dark:text-neutral-200">
          {label}
        </span>
      )}
    </label>
  );
}
