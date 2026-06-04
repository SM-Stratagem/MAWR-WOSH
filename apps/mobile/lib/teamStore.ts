import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TeamSession {
  sessionId: string;
  teamId: string;
  teamName: string;
  expiresAt: number;
}

interface TeamState {
  session: TeamSession | null;
  isAuthenticated: boolean;
  setTeamSession: (session: TeamSession) => void;
  clearTeamSession: () => void;
  isSessionValid: () => boolean;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      session: null,
      isAuthenticated: false,
      setTeamSession: (session) =>
        set({
          session,
          isAuthenticated: true,
        }),
      clearTeamSession: () =>
        set({
          session: null,
          isAuthenticated: false,
        }),
      isSessionValid: () => {
        const { session } = get();
        if (!session) return false;
        return session.expiresAt > Date.now();
      },
    }),
    {
      name: "team-session",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.session && state.session.expiresAt < Date.now()) {
          state.clearTeamSession();
        }
      },
    }
  )
);
