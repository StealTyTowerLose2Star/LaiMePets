/** 宠物心情状态 */
export type Mood = 'happy' | 'bored' | 'sad' | 'hungry';

/** 宠物自主行为 */
export type PetBehavior =
  | 'idle'
  | 'walking'
  | 'lying_down'
  | 'stretching'
  | 'yawning'
  | 'licking'
  | 'chasing_tail'
  | 'looking_outside'
  | 'scratching';

/** 显示模式 */
export type DisplayMode = 'float' | 'window';

/** 性能等级 */
export type PerformanceTier = 'low' | 'medium' | 'high';

/** 宠物形象数据 */
export interface PetProfile {
  id: string;
  name: string;
  createdAt: string;
  /** 3D 模型文件路径 */
  modelPath: string;
  /** 缩略图路径 */
  thumbnailPath: string;
  /** 写实度 0-100 */
  realism: number;
  /** 是否为默认宠物 */
  isDefault: boolean;
  /** 宠物种类 */
  species: 'cat' | 'dog' | 'other';
}

/** 宠物运行时状态 */
export interface PetState {
  currentProfileId: string | null;
  mood: Mood;
  currentBehavior: PetBehavior;
  lastInteractionTime: number;
  /** 心情值 0-100（0=极差，100=极好）*/
  moodValue: number;
}

/** 交互类型 */
export type InteractionType =
  | 'petting'
  | 'feeding'
  | 'shake_hand'
  | 'roll_over'
  | 'lie_down'
  | 'bark';

/** 交互记录 */
export interface InteractionRecord {
  type: InteractionType;
  timestamp: number;
  petId: string;
}
