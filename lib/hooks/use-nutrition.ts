"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { todayKey } from "@/lib/utils";

export const DAILY_TARGETS = {
  calories: 2000,
  carbs_g: 300,
  protein_g: 65,
  fat_g: 55,
  fiber_g: 25,
} as const;

export type NutrientKey = keyof typeof DAILY_TARGETS;

export type NutritionTotals = {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  mealCount: number;
  categories: string[];
};

export type SignalLevel = "good" | "warn" | "bad" | "empty";

export function getSignal(actual: number, target: number): SignalLevel {
  if (actual === 0) return "empty";
  const pct = actual / target;
  if (pct >= 0.7 && pct <= 1.2) return "good";
  if (pct >= 0.4 && pct <= 1.5) return "warn";
  return "bad";
}

export function signalEmoji(level: SignalLevel): string {
  return { good: "🟢", warn: "🟡", bad: "🔴", empty: "⚪" }[level];
}

export function overallEmoji(totals: NutritionTotals): string {
  if (totals.mealCount === 0) return "🍽️";
  const signals = (["carbs_g", "protein_g", "fat_g"] as NutrientKey[]).map((k) =>
    getSignal(totals[k], DAILY_TARGETS[k])
  );
  if (signals.every((s) => s === "good")) return "😊";
  if (signals.some((s) => s === "bad")) return "😟";
  return "🙂";
}

export function useNutritionAnalysis(
  recipientId: string | null,
  date: string
) {
  return useQuery({
    queryKey: ["nutrition", recipientId, date],
    enabled: !!recipientId,
    queryFn: async (): Promise<NutritionTotals> => {
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id")
        .eq("recipient_id", recipientId!)
        .eq("date", date);

      const empty: NutritionTotals = {
        calories: 0,
        carbs_g: 0,
        protein_g: 0,
        fat_g: 0,
        fiber_g: 0,
        mealCount: 0,
        categories: [],
      };

      if (!logs || logs.length === 0) return empty;

      const logIds = logs.map((l) => l.id);

      const { data: entries, error } = await supabase
        .from("meal_log_entries")
        .select(
          "quantity, food_id, food_items(calories_per_unit, carbs_g, protein_g, fat_g, fiber_g, category)"
        )
        .in("log_id", logIds);

      if (error || !entries) return empty;

      const totals = { ...empty, mealCount: entries.length };
      const catSet = new Set<string>();

      for (const e of entries) {
        const fi = e.food_items as {
          calories_per_unit: number | null;
          carbs_g: number | null;
          protein_g: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          category: string;
        } | null;
        if (!fi) continue;
        const q = e.quantity;
        totals.calories += (fi.calories_per_unit ?? 0) * q;
        totals.carbs_g += (fi.carbs_g ?? 0) * q;
        totals.protein_g += (fi.protein_g ?? 0) * q;
        totals.fat_g += (fi.fat_g ?? 0) * q;
        totals.fiber_g += (fi.fiber_g ?? 0) * q;
        catSet.add(fi.category);
      }

      totals.categories = [...catSet];
      return totals;
    },
  });
}

export function useRepetitiveFoods(recipientId: string | null) {
  const sevenDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return todayKey(d);
  })();

  return useQuery({
    queryKey: ["repetitive-foods", recipientId, sevenDaysAgo],
    enabled: !!recipientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id, date")
        .eq("recipient_id", recipientId!)
        .gte("date", sevenDaysAgo);

      if (!logs || logs.length === 0) return [];

      const logIds = logs.map((l) => l.id);
      const dateByLogId = Object.fromEntries(logs.map((l) => [l.id, l.date]));

      const { data: entries } = await supabase
        .from("meal_log_entries")
        .select("food_id, food_name, emoji, log_id")
        .in("log_id", logIds)
        .not("food_id", "is", null);

      if (!entries) return [];

      // Count distinct dates per food
      const foodDates = new Map<string, { name: string; emoji: string; dates: Set<string> }>();
      for (const e of entries) {
        if (!e.food_id) continue;
        const date = dateByLogId[e.log_id];
        if (!date) continue;
        if (!foodDates.has(e.food_id)) {
          foodDates.set(e.food_id, { name: e.food_name, emoji: e.emoji, dates: new Set() });
        }
        foodDates.get(e.food_id)!.dates.add(date);
      }

      return [...foodDates.entries()]
        .filter(([, v]) => v.dates.size >= 3)
        .map(([id, v]) => ({ id, name: v.name, emoji: v.emoji, days: v.dates.size }))
        .sort((a, b) => b.days - a.days);
    },
  });
}
