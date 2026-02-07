import { create } from 'zustand';

interface UserStore {
    profileUpdateTicket: number;
    notifyProfileUpdate: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
    profileUpdateTicket: Date.now(),
    notifyProfileUpdate: () => set({ profileUpdateTicket: Date.now() }),
}));
