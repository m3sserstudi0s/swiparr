import { create } from 'zustand';

interface BackgroundItem {
  id: string;
  blurDataURL?: string;
}

interface BackgroundState {
  backgroundItem: BackgroundItem | null;
  setBackgroundItem: (item: BackgroundItem | null) => void;
}

export const useBackgroundStore = create<BackgroundState>((set) => ({
  backgroundItem: null,
  setBackgroundItem: (backgroundItem) => set({ backgroundItem }),
}));
