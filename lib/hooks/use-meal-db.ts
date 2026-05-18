"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { unitForId, type Food } from "@/lib/food-data";
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
      const { data: logs } = await supabase
        .from("meal_logs")
        .select("id, slot")
        .eq("recipient_id", recipientId!)
        .eq("date", date);

      if (!logs || logs.length === 0) return {};

      const result: Record<string, MealEntry[]> = {};
      await Promise.all(
        logs.map(async (log) => {
          const { data } = await supabase
            .from("meal_log_entries")
            .select("*")
            .eq("log_id", log.id)
            .order("logged_at", { ascending: true });
          result[log.slot] = (data as MealEntry[]) ?? [];
        })
      );
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
