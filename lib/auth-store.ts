"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";

type AuthStore = {
  user: User | null;
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      setSession: (session) => set({ session, user: session?.user ?? null }),
      clearSession: () => set({ session: null, user: null }),
    }),
    { name: "meal-auth-store" }
  )
);
