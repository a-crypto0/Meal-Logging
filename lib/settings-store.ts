"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SettingsStore = {
  openAiKey: string;
  setOpenAiKey: (key: string) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      openAiKey: "",
      setOpenAiKey: (key) => set({ openAiKey: key.trim() }),
    }),
    { name: "meal-logging-settings-v1" }
  )
);
