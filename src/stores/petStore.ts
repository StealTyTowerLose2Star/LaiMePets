import { create } from 'zustand';
import type { InteractionType, PetProfile, PetState } from '@/types';

interface PetStoreState {
  // 宠物列表
  profiles: PetProfile[];
  isProfilesLoaded: boolean;

  // 当前宠物运行时状态
  petState: PetState;

  // 操作
  loadProfiles: () => Promise<void>;
  addProfile: (profile: PetProfile) => void;
  removeProfile: (id: string) => void;
  setDefaultProfile: (id: string) => void;
  switchProfile: (id: string) => void;
  updateMood: (value: number) => void;
  recordInteraction: (type: InteractionType) => void;
}

export const usePetStore = create<PetStoreState>((set) => ({
  profiles: [],
  isProfilesLoaded: false,

  petState: {
    currentProfileId: null,
    mood: 'happy',
    currentBehavior: 'idle',
    lastInteractionTime: 0,
    moodValue: 80,
  },

  loadProfiles: async () => {
    // TODO: Sprint 2 对接后端宠物列表 API / Rust 持久化
    try {
      const stored = localStorage.getItem('lai-me-pet-profiles');
      if (stored) {
        const profiles = JSON.parse(stored) as PetProfile[];
        set((state) => ({
          profiles,
          isProfilesLoaded: true,
          petState: {
            ...state.petState,
            currentProfileId:
              state.petState.currentProfileId ?? profiles[0]?.id ?? null,
          },
        }));
      } else {
        set({ isProfilesLoaded: true });
      }
    } catch {
      set({ isProfilesLoaded: true });
    }
  },

  addProfile: (profile: PetProfile) =>
    set((state) => {
      const profiles = [...state.profiles, profile];
      localStorage.setItem('lai-me-pet-profiles', JSON.stringify(profiles));
      return {
        profiles,
        petState: {
          ...state.petState,
          currentProfileId: state.petState.currentProfileId ?? profile.id,
        },
      };
    }),

  removeProfile: (id: string) =>
    set((state) => {
      const profiles = state.profiles.filter((p) => p.id !== id);
      localStorage.setItem('lai-me-pet-profiles', JSON.stringify(profiles));
      return {
        profiles,
        petState: {
          ...state.petState,
          currentProfileId:
            state.petState.currentProfileId === id
              ? profiles[0]?.id ?? null
              : state.petState.currentProfileId,
        },
      };
    }),

  setDefaultProfile: (id: string) =>
    set((state) => {
      const profiles = state.profiles.map((p) => ({
        ...p,
        isDefault: p.id === id,
      }));
      localStorage.setItem('lai-me-pet-profiles', JSON.stringify(profiles));
      return { profiles };
    }),

  switchProfile: (id: string) =>
    set((state) => ({
      petState: { ...state.petState, currentProfileId: id },
    })),

  updateMood: (value: number) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(100, value));
      const mood =
        clamped >= 60
          ? 'happy'
          : clamped >= 30
            ? 'bored'
            : clamped >= 10
              ? 'sad'
              : 'hungry';
      return { petState: { ...state.petState, mood, moodValue: clamped } };
    }),

  recordInteraction: (_type: InteractionType) =>
    set((state) => ({
      petState: {
        ...state.petState,
        lastInteractionTime: Date.now(),
        moodValue: Math.min(100, state.petState.moodValue + 5),
      },
    })),
}));
