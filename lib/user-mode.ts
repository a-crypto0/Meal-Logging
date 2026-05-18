"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserMode = "self" | "supporter";

type ModeStore = {
  mode: UserMode | null;
  setMode: (m: UserMode | null) => void;
};

export const useUserMode = create<ModeStore>()(
  persist(
    (set) => ({
      mode: null,
      setMode: (m) => set({ mode: m }),
    }),
    { name: "user-mode-v1" }
  )
);
