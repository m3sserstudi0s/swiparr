import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getRuntimeConfig } from './runtime-config';
import { ProviderType } from './providers/types';

export interface Settings {
  useWatchlist: boolean;
  allowGuestLending: boolean;
  hasDismissedGuestLendingAlert: boolean;
}

interface SettingsState {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

function getDefaultSettings(): Settings {
  const rc = getRuntimeConfig();
  return {
    useWatchlist: rc.provider === ProviderType.JELLYFIN && rc.useWatchlist,
    allowGuestLending: false,
    hasDismissedGuestLendingAlert: false,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: getDefaultSettings(),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: getDefaultSettings() }),
    }),
    {
      name: 'swiparr-settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // If the server no longer advertises watchlist support, clamp the
        // persisted value to false so stale localStorage can't re-enable it.
        const rc = getRuntimeConfig();
        if (!rc.useWatchlist && state.settings.useWatchlist) {
          state.settings.useWatchlist = false;
        }
      },
    }
  )
);

// Backward compatibility or helper hook
export function useSettings() {
  const { settings, updateSettings } = useSettingsStore();
  return { settings, updateSettings, isLoaded: true };
}
