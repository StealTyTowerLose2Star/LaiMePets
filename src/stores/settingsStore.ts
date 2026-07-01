import { create } from 'zustand';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

interface SettingsState {
  // 状态
  settings: AppSettings;
  isLoaded: boolean;

  // 操作
  loadSettings: () => Promise<void>;
  saveSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    // TODO: Sprint 4 对接 Tauri localStorage / Rust 持久化
    try {
      const stored = localStorage.getItem('lai-me-pet-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        set({
          settings: { ...DEFAULT_SETTINGS, ...parsed },
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  saveSettings: async (partial: Partial<AppSettings>) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });
    // TODO: 迁移到 Tauri API 持久化
    localStorage.setItem('lai-me-pet-settings', JSON.stringify(updated));
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    localStorage.removeItem('lai-me-pet-settings');
  },
}));

// 派生选择器
export const selectTheme = (s: SettingsState) => s.settings.theme;
export const selectDisplayMode = (s: SettingsState) => s.settings.displayMode;
export const selectPerformanceMode = (s: SettingsState) =>
  s.settings.performanceMode;
