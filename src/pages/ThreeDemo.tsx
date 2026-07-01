import { useState, useCallback } from 'react';
import { PetCanvas } from '@/components/pet';
import { Button, Slider, toast } from '@/components/ui';
import type { PetBehavior, PerformanceTier } from '@/types';

const BEHAVIORS: { value: PetBehavior; label: string }[] = [
  { value: 'idle', label: '待机' },
  { value: 'walking', label: '走动' },
  { value: 'lying_down', label: '趴下' },
  { value: 'stretching', label: '伸懒腰' },
  { value: 'yawning', label: '打哈欠' },
  { value: 'licking', label: '舔毛' },
  { value: 'chasing_tail', label: '追尾巴' },
  { value: 'looking_outside', label: '看窗外' },
  { value: 'scratching', label: '挠痒' },
];

/**
 * 3D 渲染验证页面
 *
 * 用途：
 * 1. 验证 Three.js + R3F 渲染管线
 * 2. 测试不同行为的动画切换
 * 3. 性能模式对比（low/medium/high）
 * 4. 为后续 3D 模型替换提供验证基准
 *
 * Sprint 2 后将删除此页面，由正式宠物桌面页取代
 */
export default function ThreeDemo() {
  const [behavior, setBehavior] = useState<PetBehavior>('idle');
  const [realism, setRealism] = useState(50);
  const [perfMode, setPerfMode] = useState<PerformanceTier>('medium');

  const handlePetClick = useCallback(() => {
    toast.success('🐱 喵~ (点击交互正常)');
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100 dark:bg-neutral-900">
      {/* ── 左侧 3D 画布 ── */}
      <div className="flex-1">
        <PetCanvas
          behavior={behavior}
          realism={realism}
          performanceMode={perfMode}
          onPetClick={handlePetClick}
        />
      </div>

      {/* ── 右侧控制面板 ── */}
      <div className="acrylic flex w-72 flex-col gap-4 overflow-y-auto border-l border-neutral-200/50 p-4 dark:border-neutral-700/50">
        <h2 className="text-title-sm font-semibold text-neutral-900 dark:text-neutral-100">
          3D 渲染验证
        </h2>
        <p className="text-caption text-neutral-500">
          基于 Three.js + React Three Fiber
        </p>

        {/* 行为切换 */}
        <fieldset>
          <legend className="mb-2 text-body-sm font-medium text-neutral-500">
            行为动画
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {BEHAVIORS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBehavior(b.value)}
                className={`
                  rounded-md px-2.5 py-1 text-caption transition-colors duration-fast
                  ${
                    behavior === b.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                  }
                `}
              >
                {b.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* 写实度 */}
        <Slider
          label="写实度"
          value={realism}
          onChange={setRealism}
          min={0}
          max={100}
        />

        {/* 性能模式 */}
        <fieldset>
          <legend className="mb-2 text-body-sm font-medium text-neutral-500">
            性能模式
          </legend>
          <div className="flex gap-1.5">
            {(['low', 'medium', 'high'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPerfMode(mode)}
                className={`
                  flex-1 rounded-md py-1.5 text-center text-caption capitalize transition-colors duration-fast
                  ${
                    perfMode === mode
                      ? 'bg-brand-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                  }
                `}
              >
                {mode}
              </button>
            ))}
          </div>
        </fieldset>

        <hr className="border-neutral-200 dark:border-neutral-700" />

        {/* 交互测试 */}
        <Button variant="secondary" onClick={handlePetClick}>
          🐱 模拟抚摸（Toast 验证）
        </Button>

        <div className="text-caption text-neutral-400">
          <p>✓ 模型渲染</p>
          <p>✓ 多行为动画切换</p>
          <p>✓ 光照/阴影/材质</p>
          <p>✓ 性能分级（{perfMode}）</p>
          <p>✓ OrbitControls 交互</p>
          <p>✓ Toast 通知系统</p>
        </div>
      </div>
    </div>
  );
}
