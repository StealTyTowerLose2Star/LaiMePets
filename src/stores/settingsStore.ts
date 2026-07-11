import { create } from 'zustand';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadJSON, saveJSON } from '@/services/tauri-service';

const SETTINGS_KEY = 'lai-me-pet-settings';

async function persistSettings(settings: AppSettings): Promise<void> {
  try {
    await saveJSON(SETTINGS_KEY, settings);
  } catch {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }
}

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
    try {
      const stored = await loadJSON<Partial<AppSettings>>(SETTINGS_KEY);
      if (stored) {
        set({
          settings: { ...DEFAULT_SETTINGS, ...stored },
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
    await persistSettings(updated);
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    await persistSettings(DEFAULT_SETTINGS);
  },
}));

// 派生选择器
export const selectTheme = (s: SettingsState) => s.settings.theme;
export const selectDisplayMode = (s: SettingsState) => s.settings.displayMode;
export const selectPerformanceMode = (s: SettingsState) =>
  s.settings.performanceMode;
