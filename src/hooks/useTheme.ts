import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * 响应系统主题切换：监听 prefers-color-scheme 变化，
 * 同步更新应用主题（当用户未手动覆盖时）
 */
export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      saveSettings({ theme: e.matches ? 'dark' : 'light' });
    };

    // 初始同步
    saveSettings({ theme: mq.matches ? 'dark' : 'light' });

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [saveSettings]);

  return theme;
}
