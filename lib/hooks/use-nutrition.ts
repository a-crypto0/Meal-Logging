"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export type TargetValues = {
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
};

export function overallEmoji(totals: NutritionTotals, targets: TargetValues = DAILY_TARGETS): string {
  if (totals.mealCount === 0) return "🍽️";
  const signals = (["carbs_g", "protein_g", "fat_g"] as NutrientKey[]).map((k) =>
    getSignal(totals[k], targets[k])
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

      // Fire-and-forget: cache daily totals to nutrition_snapshots for history optimisation
      void supabase.from("nutrition_snapshots").upsert({
        recipient_id: recipientId!,
        date,
        total_calories: Math.round(totals.calories),
        total_carbs_g: Math.round(totals.carbs_g * 10) / 10,
        total_protein_g: Math.round(totals.protein_g * 10) / 10,
        total_fat_g: Math.round(totals.fat_g * 10) / 10,
        total_fiber_g: Math.round(totals.fiber_g * 10) / 10,
        meal_count: entries.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: "recipient_id,date" });

      return totals;
    },
  });
}

export function useRecipientTargets(recipientId: string | null) {
  return useQuery({
    queryKey: ["recipient-targets", recipientId],
    enabled: !!recipientId,
    staleTime: 60_000,
    queryFn: async (): Promise<TargetValues> => {
      const { data, error } = await supabase
        .from("care_recipients")
        .select("target_calories, target_carbs_g, target_protein_g, target_fat_g, target_fiber_g")
        .eq("id", recipientId!)
        .single();
      if (error) throw error;
      return {
        calories: data.target_calories ?? DAILY_TARGETS.calories,
        carbs_g: data.target_carbs_g ?? DAILY_TARGETS.carbs_g,
        protein_g: data.target_protein_g ?? DAILY_TARGETS.protein_g,
        fat_g: data.target_fat_g ?? DAILY_TARGETS.fat_g,
        fiber_g: data.target_fiber_g ?? DAILY_TARGETS.fiber_g,
      };
    },
  });
}

export function useUpdateRecipientTargets(recipientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targets: TargetValues) => {
      if (!recipientId) throw new Error("No recipient");
      const { error } = await supabase
        .from("care_recipients")
        .update({
          target_calories: targets.calories,
          target_carbs_g: targets.carbs_g,
          target_protein_g: targets.protein_g,
          target_fat_g: targets.fat_g,
          target_fiber_g: targets.fiber_g,
        })
        .eq("id", recipientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipient-targets", recipientId] });
    },
  });
}

export function useRepetitiveFoods(
  recipientId: string | null,
  days = 7,
  count = 3
) {
  const since = (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return todayKey(d);
  })();

  return useQuery({
    queryKey: ["repetitive-foods", recipientId, days, count],
    enabled: !!recipientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id, date")
        .eq("recipient_id", recipientId!)
        .gte("date", since);

      if (!logs || logs.length === 0) return [];

      const logIds = logs.map((l) => l.id);
      const dateByLogId = Object.fromEntries(logs.map((l) => [l.id, l.date]));

      const { data: entries } = await supabase
        .from("meal_log_entries")
        .select("food_id, food_name, emoji, log_id")
        .in("log_id", logIds)
        .not("food_id", "is", null);

      if (!entries) return [];

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
        .filter(([, v]) => v.dates.size >= count)
        .map(([id, v]) => ({ id, name: v.name, emoji: v.emoji, days: v.dates.size }))
        .sort((a, b) => b.days - a.days);
    },
  });
}

export function useRepeatThreshold(recipientId: string | null) {
  return useQuery({
    queryKey: ["repeat-threshold", recipientId],
    enabled: !!recipientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_recipients")
        .select("repeat_warning_days, repeat_warning_count")
        .eq("id", recipientId!)
        .single();
      if (error) throw error;
      return {
        days: data.repeat_warning_days ?? 7,
        count: data.repeat_warning_count ?? 3,
      };
    },
  });
}

export function useUpdateRepeatThreshold(recipientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ days, count }: { days: number; count: number }) => {
      if (!recipientId) throw new Error("No recipient");
      const { error } = await supabase
        .from("care_recipients")
        .update({ repeat_warning_days: days, repeat_warning_count: count })
        .eq("id", recipientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repeat-threshold", recipientId] });
      qc.invalidateQueries({ queryKey: ["repetitive-foods", recipientId] });
    },
  });
}
