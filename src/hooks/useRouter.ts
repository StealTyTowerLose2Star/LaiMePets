import { create } from 'zustand';

/** 应用路由定义 */
export type Route =
  | { page: 'welcome' }
  | { page: 'create-pet'; step?: number }
  | { page: 'desktop' }
  | { page: 'settings'; tab?: string };

interface RouterState {
  current: Route;
  history: Route[];
  navigate: (to: Route) => void;
  back: () => void;
  canGoBack: () => boolean;
}

export const useRouter = create<RouterState>((set, get) => ({
  current: { page: 'welcome' },
  history: [],

  navigate: (to) =>
    set((s) => ({
      current: to,
      history: [...s.history, s.current],
    })),

  back: () =>
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return {
        current: prev,
        history: s.history.slice(0, -1),
      };
    }),

  canGoBack: () => get().history.length > 0,
}));

/** 便捷导航函数 */
export const navigate = (to: Route) => useRouter.getState().navigate(to);
export const goBack = () => useRouter.getState().back();
