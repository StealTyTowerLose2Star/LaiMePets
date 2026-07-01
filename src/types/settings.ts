import type { DisplayMode, PerformanceTier } from './pet';

/** 生成模式 */
export type GenerationMode = 'local' | 'cloud';

/** 应用设置 */
export interface AppSettings {
  /** 暗色/亮色模式 */
  theme: 'light' | 'dark';
  /** 显示模式 */
  displayMode: DisplayMode;
  /** 写实度 0-100 */
  realism: number;
  /** 宠物大小 0.5-2.0 */
  petSize: number;
  /** 音量 0-100 */
  volume: number;
  /** 性能模式 */
  performanceMode: PerformanceTier;
  /** 生成模式 */
  generationMode: GenerationMode;
  /** 开机自启 */
  autoStart: boolean;
  /** 语言 */
  language: 'zh-CN';
}

/** 提醒设置 */
export interface ReminderSettings {
  enabled: boolean;
  /** 喝水提醒 */
  waterReminder: {
    enabled: boolean;
    intervalMinutes: number;
  };
  /** 休息提醒 */
  restReminder: {
    enabled: boolean;
    intervalMinutes: number;
  };
  /** 遛宠提醒（针对真实宠物）*/
  walkReminder: {
    enabled: boolean;
    time: string; // HH:mm
  };
  /** 自定义提醒 */
  customReminders: CustomReminder[];
  /** 通知方式 */
  notifyMethod: 'toast' | 'bubble' | 'both';
}

export interface CustomReminder {
  id: string;
  label: string;
  time: string; // HH:mm
  enabled: boolean;
}

/** 应用默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  displayMode: 'float',
  realism: 50,
  petSize: 1.0,
  volume: 50,
  performanceMode: 'medium',
  generationMode: 'local',
  autoStart: false,
  language: 'zh-CN',
};
