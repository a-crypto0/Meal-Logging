"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { FOOD_CATALOG, unitForId, type Food } from "@/lib/food-data";
import { todayKey, SLOT_DEFAULT_TIMES, type MealSlotId } from "@/lib/utils";

export type MealEntry = {
  id: string;
  foodId: string;
  foodName: string;
  emoji: string;
  quantity: number;
  unit: string;
  loggedAt: number; // epoch ms (when the food was added to the log)
  mealTime: string; // "HH:MM" — user-set meal time for that slot
};

// key: `${YYYY-MM-DD}:${slot}` -> entries
export type MealLog = Record<string, MealEntry[]>;

type MealStore = {
  logs: MealLog;
  addEntry: (date: string, slot: MealSlotId, food: Food, mealTime: string) => void;
  removeEntry: (date: string, slot: MealSlotId, entryId: string) => void;
  setQuantity: (date: string, slot: MealSlotId, entryId: string, qty: number) => void;
  setMealTime: (date: string, slot: MealSlotId, entryId: string, time: string) => void;
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

      addEntry: (date, slot, food, mealTime) => {
        const k = keyFor(date, slot);
        const { unit } = unitForId(food.id);
        const entry: MealEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          foodId: food.id,
          foodName: food.name,
          emoji: food.emoji,
          quantity: 1,
          unit,
          loggedAt: Date.now(),
          mealTime,
        };
        set((state) => ({
          logs: {
            ...state.logs,
            [k]: [...(state.logs[k] ?? []), entry].sort(
              (a, b) => a.loggedAt - b.loggedAt
            ),
          },
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

      setQuantity: (date, slot, entryId, qty) => {
        const k = keyFor(date, slot);
        const clamped = Math.max(0.5, Math.round(qty * 10) / 10);
        set((state) => ({
          logs: {
            ...state.logs,
            [k]: (state.logs[k] ?? []).map((e) =>
              e.id === entryId ? { ...e, quantity: clamped } : e
            ),
          },
        }));
      },

      setMealTime: (date, slot, entryId, time) => {
        const k = keyFor(date, slot);
        set((state) => ({
          logs: {
            ...state.logs,
            [k]: (state.logs[k] ?? []).map((e) =>
              e.id === entryId ? { ...e, mealTime: time } : e
            ),
          },
        }));
      },

      getEntries: (date, slot) => get().logs[keyFor(date, slot)] ?? [],

      getRecentFoods: (limit = 8) => {
        const all: MealEntry[] = [];
        for (const entries of Object.values(get().logs) as MealEntry[][]) {
          for (const e of entries) all.push(e);
        }
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
        for (const entries of Object.values(get().logs) as MealEntry[][]) {
          for (const e of entries) {
            counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1);
          }
        }
        return [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => FOOD_CATALOG.find((f) => f.id === id))
          .filter((f): f is Food => !!f);
      },
    }),
    {
      name: "meal-logging-store-v1",
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        // persisted is untrusted old data; use any to handle all versions safely
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = persisted as any;
        const logs: MealLog = raw?.logs ?? {};

        // v1 → v2: add quantity, unit
        if (version < 2) {
          for (const entries of Object.values(logs)) {
            for (const e of entries) {
              if (e.quantity == null) e.quantity = 1;
              if (!e.unit) e.unit = unitForId(e.foodId).unit;
            }
          }
        }

        // v2 → v3: add mealTime
        if (version < 3) {
          for (const [k, entries] of Object.entries(logs)) {
            const slot = k.split(":")[1] as MealSlotId;
            const defaultTime = SLOT_DEFAULT_TIMES[slot] ?? "12:00";
            for (const e of entries) {
              if (!e.mealTime) e.mealTime = defaultTime;
            }
          }
        }

        return { logs };
      },
    }
  )
);

export { todayKey };
