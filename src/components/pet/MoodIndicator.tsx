import type { Mood } from '@/types';

interface MoodIndicatorProps {
  mood: Mood;
  size?: number; // 默认 8px（设计规范）
  showGlow?: boolean;
}

const moodColors: Record<Mood, { dot: string; glow: string }> = {
  happy: {
    dot: 'bg-mood-happy',
    glow: 'shadow-[0_0_8px_var(--color-mood-happy-glow)]',
  },
  bored: {
    dot: 'bg-mood-bored',
    glow: 'shadow-[0_0_6px_var(--color-mood-bored-glow)]',
  },
  sad: {
    dot: 'bg-mood-sad',
    glow: 'shadow-[0_0_4px_var(--color-mood-sad-glow)]',
  },
  hungry: {
    dot: 'bg-mood-hungry',
    glow: 'shadow-[0_0_10px_var(--color-mood-hungry-glow)]',
  },
};

const moodAnimations: Record<Mood, string> = {
  happy: 'animate-bounce',
  bored: 'animate-pulse',
  sad: '',
  hungry: 'animate-pulse',
};

export function MoodIndicator({
  mood,
  size = 8,
  showGlow = true,
}: MoodIndicatorProps) {
  const { dot, glow } = moodColors[mood];

  return (
    <span
      role="status"
      aria-label={`宠物心情: ${mood}`}
      className={`inline-block rounded-full ${dot} ${showGlow ? glow : ''} ${moodAnimations[mood]}`}
      style={{ width: size, height: size }}
    />
  );
}
