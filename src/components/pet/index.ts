export { MoodIndicator } from './MoodIndicator';
export { PetCanvas } from './PetCanvas';
export { PlaceholderPet } from './PlaceholderPet';
export { Environment } from './Environment';

// Hooks
export { useModelFit } from './hooks/useModelFit';
export { usePetAnimation } from './hooks/usePetAnimation';
export { useProceduralAnimation } from './hooks/useProceduralAnimation';
export type { SubPartRefs } from './hooks/useProceduralAnimation';
export { useRealismShader } from './hooks/useRealismShader';

// Utilities
export { extractMetadataFromScene, formatFileSize, formatCount } from './utils/glb-utils';
export { computeRealismConfig, createToonGradient } from './shaders/toon';
export type { RealismConfig } from './shaders/toon';
