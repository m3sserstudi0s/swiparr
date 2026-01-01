import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Settings {
  useWatchlist: boolean;
}

interface SettingsState {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  useWatchlist: process.env.NEXT_PUBLIC_JELLYFIN_USE_WATCHLIST === "true",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'swiparr-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Backward compatibility or helper hook
export function useSettings() {
  const { settings, updateSettings } = useSettingsStore();
  return { settings, updateSettings, isLoaded: true };
}
