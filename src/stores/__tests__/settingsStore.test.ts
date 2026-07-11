import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/types';

const storageMock = vi.hoisted(() => {
  let storedSettings: unknown = null;
  return {
    saveJSON: vi.fn(async (_filename: string, data: unknown) => {
      storedSettings = data;
    }),
    loadJSON: vi.fn(async <T,>(_filename: string): Promise<T | null> => {
      return storedSettings as T | null;
    }),
    reset: () => {
      storedSettings = null;
    },
  };
});

vi.mock('@/services/tauri-service', () => ({
  saveJSON: storageMock.saveJSON,
  loadJSON: storageMock.loadJSON,
}));

import { useSettingsStore } from '../settingsStore';

describe('settingsStore persistence', () => {
  beforeEach(() => {
    storageMock.reset();
    storageMock.saveJSON.mockClear();
    storageMock.loadJSON.mockClear();
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      isLoaded: false,
    });
  });

  it('persists settings through saveJSON and reloads them through loadJSON', async () => {
    await useSettingsStore.getState().saveSettings({
      theme: 'dark',
      petSize: 1.5,
      volume: 75,
    });

    expect(storageMock.saveJSON).toHaveBeenCalledWith(
      'lai-me-pet-settings',
      expect.objectContaining({
        theme: 'dark',
        petSize: 1.5,
        volume: 75,
      }),
    );

    // Simulate a page refresh by resetting in-memory Zustand state only.
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      isLoaded: false,
    });

    await useSettingsStore.getState().loadSettings();

    expect(storageMock.loadJSON).toHaveBeenCalledWith('lai-me-pet-settings');
    expect(useSettingsStore.getState().settings).toEqual(
      expect.objectContaining({
        theme: 'dark',
        petSize: 1.5,
        volume: 75,
      }),
    );
    expect(useSettingsStore.getState().isLoaded).toBe(true);
  });
});
