import { type ChangeEvent, useCallback } from 'react';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled = false,
  label,
  showValue = true,
  formatValue,
}: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  return (
    <div className={`flex flex-col gap-1 ${disabled ? 'opacity-40' : ''}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-body text-neutral-700 dark:text-neutral-200">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-body-sm tabular-nums text-neutral-500">
              {formatValue ? formatValue(value) : `${Math.round(value)}%`}
            </span>
          )}
        </div>
      )}
      <div className="relative h-5 w-full">
        {/* 轨道背景 */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        {/* 轨道进度 */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={handleChange}
          className={`
            absolute inset-0 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:mt-[-6px]
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-brand-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:ring-2
            [&::-webkit-slider-thumb]:ring-white
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-fast
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-95
            [&::-webkit-slider-thumb]:dark:ring-neutral-800
            focus-visible:outline-none
            disabled:cursor-not-allowed
          `}
        />
      </div>
    </div>
  );
}
