import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { persist } from 'zustand/middleware';

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'user-store',
    }
  )
);