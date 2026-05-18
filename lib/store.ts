"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { FOOD_CATALOG, type Food } from "@/lib/food-data";
import { todayKey, type MealSlotId } from "@/lib/utils";

export type MealEntry = {
  id: string;
  foodId: string;
  foodName: string;
  emoji: string;
  loggedAt: number; // epoch ms
};

// key: `${YYYY-MM-DD}:${slot}` -> entries
export type MealLog = Record<string, MealEntry[]>;

type MealStore = {
  logs: MealLog;
  addEntry: (date: string, slot: MealSlotId, food: Food) => void;
  removeEntry: (date: string, slot: MealSlotId, entryId: string) => void;
  getEntries: (date: string, slot: MealSlotId) => MealEntry[];
  getRecentFoods: (limit?: number) => Food[];
  getFrequentFoods: (limit?: number) => Food[];
};

function keyFor(date: string, slot: MealSlotId): string {
  return `${date}:${slot}`;
}

export const useMealStore = create<MealStore>()(
  persist(
    (set, get) => ({
      logs: {},

      addEntry: (date, slot, food) => {
        const k = keyFor(date, slot);
        const entry: MealEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          foodId: food.id,
          foodName: food.name,
          emoji: food.emoji,
          loggedAt: Date.now(),
        };
        set((state) => ({
          logs: { ...state.logs, [k]: [...(state.logs[k] ?? []), entry] },
        }));
      },

      removeEntry: (date, slot, entryId) => {
        const k = keyFor(date, slot);
        set((state) => ({
          logs: {
            ...state.logs,
            [k]: (state.logs[k] ?? []).filter((e) => e.id !== entryId),
          },
        }));
      },

      getEntries: (date, slot) => get().logs[keyFor(date, slot)] ?? [],

      getRecentFoods: (limit = 8) => {
        const all = Object.values(get().logs).flat();
        all.sort((a, b) => b.loggedAt - a.loggedAt);
        const seen = new Set<string>();
        const out: Food[] = [];
        for (const e of all) {
          if (seen.has(e.foodId)) continue;
          seen.add(e.foodId);
          const f = FOOD_CATALOG.find((x) => x.id === e.foodId);
          if (f) out.push(f);
          if (out.length >= limit) break;
        }
        return out;
      },

      getFrequentFoods: (limit = 8) => {
        const counts = new Map<string, number>();
        for (const e of Object.values(get().logs).flat()) {
          counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1);
        }
        return [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => FOOD_CATALOG.find((f) => f.id === id))
          .filter((f): f is Food => !!f);
      },
    }),
    { name: "meal-logging-store-v1" }
  )
);

export { todayKey };
