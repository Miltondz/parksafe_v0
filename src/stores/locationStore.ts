import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

interface LocationState {
  currentLocation: Location | null;
  error: string | null;
  updateLocation: (location: Location) => void;
  setError: (error: string | null) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      currentLocation: null,
      error: null,
      updateLocation: (location) =>
        set({
          currentLocation: {
            ...location,
            timestamp: Date.now(),
          },
          error: null,
        }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'location-store',
      partialize: (state) => ({
        currentLocation: state.currentLocation,
      }),
    }
  )
);