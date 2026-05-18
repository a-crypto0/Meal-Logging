"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Tables } from "./database.types";

type RecipientStore = {
  selectedRecipient: Tables<"care_recipients"> | null;
  setSelectedRecipient: (r: Tables<"care_recipients"> | null) => void;
};

export const useRecipientStore = create<RecipientStore>()(
  persist(
    (set) => ({
      selectedRecipient: null,
      setSelectedRecipient: (r) => set({ selectedRecipient: r }),
    }),
    { name: "meal-recipient-store" }
  )
);
