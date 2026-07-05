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

/** 写实度着色器等级 */
export type RealismTier = 'toon' | 'hybrid' | 'pbr';

/** 写实度配置（由 0-100 滑块值计算得出） */
export interface RealismConfig {
  tier: RealismTier;
  /** 混合系数：0 = 完全 toon, 1 = 完全 PBR */
  blendFactor: number;
  /** 轮廓线粗细 (世界单位)，0 = 禁用 */
  outlineThickness: number;
}

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

/** GLB 模型元数据（客户端提取或后端返回） */
export interface GlbMetadata {
  fileSizeBytes: number;
  vertexCount: number;
  triangleCount: number;
  meshCount: number;
  materialCount: number;
  animationClipCount: number;
  animationClipNames: string[];
  hasSkeleton: boolean;
  boundingBox: { min: [number, number, number]; max: [number, number, number] };
}

/** 模型加载阶段 */
export type ModelLoadPhase = 'idle' | 'fetching' | 'parsing' | 'ready' | 'error';
