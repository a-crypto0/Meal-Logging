"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { unitFor, unitForId, type FoodCategory, type Food } from "@/lib/food-data";
import type { Tables } from "@/lib/database.types";
import type { MealSlotId } from "@/lib/utils";

type MealEntry = Tables<"meal_log_entries">;

async function getOrCreateLog(
  recipientId: string,
  date: string,
  slot: MealSlotId
) {
  const { data: existing } = await supabase
    .from("meal_logs")
    .select("id")
    .eq("recipient_id", recipientId)
    .eq("date", date)
    .eq("slot", slot)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("meal_logs")
    .insert({ recipient_id: recipientId, date, slot })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}

export function useMealEntries(
  recipientId: string | null,
  date: string,
  slot: MealSlotId
) {
  return useQuery({
    queryKey: ["meal-entries", recipientId, date, slot],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data: log } = await supabase
        .from("meal_logs")
        .select("id")
        .eq("recipient_id", recipientId!)
        .eq("date", date)
        .eq("slot", slot)
        .maybeSingle();

      if (!log) return [];

      const { data, error } = await supabase
        .from("meal_log_entries")
        .select("*")
        .eq("log_id", log.id)
        .order("logged_at", { ascending: true });

      if (error) throw error;
      return data as MealEntry[];
    },
  });
}

export function useAllMealEntries(recipientId: string | null, date: string) {
  return useQuery({
    queryKey: ["meal-entries-all", recipientId, date],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("meal_logs")
        .select("slot, meal_log_entries(*)")
        .eq("recipient_id", recipientId!)
        .eq("date", date);

      if (error) throw error;
      if (!logs || logs.length === 0) return {};

      const result: Record<string, MealEntry[]> = {};
      for (const log of logs) {
        const entries = ((log.meal_log_entries as MealEntry[]) ?? []).sort(
          (a, b) =>
            new Date(a.logged_at ?? 0).getTime() -
            new Date(b.logged_at ?? 0).getTime()
        );
        result[log.slot] = entries;
      }
      return result;
    },
  });
}

export function useRecentFoods(recipientId: string | null) {
  return useQuery({
    queryKey: ["recent-foods", recipientId],
    enabled: !!recipientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_log_entries")
        .select("food_id, food_name, emoji, logged_at, meal_logs!inner(recipient_id)")
        .eq("meal_logs.recipient_id", recipientId!)
        .order("logged_at", { ascending: false })
        .limit(50);

      if (!data) return [];
      const seen = new Set<string>();
      const out: { id: string; name: string; emoji: string }[] = [];
      for (const e of data) {
        if (!e.food_id || seen.has(e.food_id)) continue;
        seen.add(e.food_id);
        out.push({ id: e.food_id, name: e.food_name, emoji: e.emoji });
        if (out.length >= 8) break;
      }
      return out;
    },
  });
}

export function useAddMealEntry(recipientId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      slot,
      food,
    }: {
      date: string;
      slot: MealSlotId;
      food: Food;
    }) => {
      if (!recipientId) throw new Error("No recipient selected");
      const logId = await getOrCreateLog(recipientId, date, slot);
      const { unit } = unitForId(food.id);
      const { error } = await supabase.from("meal_log_entries").insert({
        log_id: logId,
        food_id: food.id,
        food_name: food.name,
        emoji: food.emoji,
        quantity: 1,
        unit,
      });
      if (error) throw error;
    },
    onSuccess: (_, { date, slot }) => {
      qc.invalidateQueries({
        queryKey: ["meal-entries", recipientId, date, slot],
      });
      qc.invalidateQueries({
        queryKey: ["meal-entries-all", recipientId, date],
      });
      qc.invalidateQueries({ queryKey: ["recent-foods", recipientId] });
    },
  });
}

export function useRemoveMealEntry(recipientId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
    }: {
      entryId: string;
      date: string;
      slot: MealSlotId;
    }) => {
      const { error } = await supabase
        .from("meal_log_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: (_, { date, slot }) => {
      qc.invalidateQueries({
        queryKey: ["meal-entries", recipientId, date, slot],
      });
      qc.invalidateQueries({
        queryKey: ["meal-entries-all", recipientId, date],
      });
    },
  });
}

export function useUpdateMealQuantity(recipientId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      quantity,
    }: {
      entryId: string;
      quantity: number;
      date: string;
      slot: MealSlotId;
    }) => {
      const clamped = Math.max(0.5, Math.round(quantity * 10) / 10);
      const { error } = await supabase
        .from("meal_log_entries")
        .update({ quantity: clamped })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: (_, { date, slot }) => {
      qc.invalidateQueries({
        queryKey: ["meal-entries", recipientId, date, slot],
      });
    },
  });
}

export function useCareRecipients(supporterId: string | null) {
  return useQuery({
    queryKey: ["care-recipients", supporterId],
    enabled: !!supporterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_recipients")
        .select("*")
        .eq("supporter_id", supporterId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRecipient(supporterId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!supporterId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("care_recipients")
        .insert({ name, supporter_id: supporterId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-recipients", supporterId] });
    },
  });
}

export function useFoodSearch(query: string) {
  return useQuery({
    queryKey: ["food-search", query],
    enabled: query.trim().length >= 1,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Food[]> => {
      const { data, error } = await supabase
        .from("food_items")
        .select("id, name, emoji, category")
        .ilike("name", `%${query.trim()}%`)
        .limit(8);
      if (error) throw error;
      return (data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        emoji: f.emoji,
        category: f.category as FoodCategory,
      }));
    },
  });
}

export function useAddCustomFood(supporterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (food: Pick<Food, "name" | "emoji" | "category">): Promise<Food> => {
      if (!supporterId) throw new Error("Not authenticated");
      const id = `custom-${crypto.randomUUID()}`;
      const { unit } = unitFor(food.category);
      const { data, error } = await supabase
        .from("food_items")
        .insert({
          id,
          name: food.name,
          emoji: food.emoji,
          category: food.category,
          default_unit: unit,
          is_custom: true,
          supporter_id: supporterId,
        })
        .select("id, name, emoji, category")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        emoji: data.emoji,
        category: data.category as FoodCategory,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["food-search"] });
    },
  });
}
