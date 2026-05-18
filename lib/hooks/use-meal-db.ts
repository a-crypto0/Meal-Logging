"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { unitFor, unitForId, type FoodCategory, type Food } from "@/lib/food-data";
import type { Tables } from "@/lib/database.types";
import type { MealSlotId } from "@/lib/utils";
import { enqueueOp, cancelLastAddOp } from "@/lib/offline-queue";

type MealEntry = Tables<"meal_log_entries">;

const isOfflineError = (err: unknown): boolean =>
  typeof err === "object" && err !== null && "isOffline" in err;

function offlineErr(): Error {
  return Object.assign(new Error("offline"), { isOffline: true });
}

function tempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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
    onMutate: async ({ date, slot, food }: { date: string; slot: MealSlotId; food: Food }) => {
      if (!recipientId) return undefined;

      const slotKey = ["meal-entries", recipientId, date, slot];
      const allKey = ["meal-entries-all", recipientId, date];

      await qc.cancelQueries({ queryKey: slotKey });
      await qc.cancelQueries({ queryKey: allKey });

      const prevSlot = qc.getQueryData<MealEntry[]>(slotKey) ?? [];
      const prevAll = qc.getQueryData<Record<string, MealEntry[]>>(allKey) ?? {};

      const { unit } = unitForId(food.id);
      const optimistic: MealEntry = {
        id: tempId(),
        log_id: "temp",
        food_id: food.id,
        food_name: food.name,
        emoji: food.emoji,
        quantity: 1,
        unit,
        logged_at: new Date().toISOString(),
      };

      qc.setQueryData<MealEntry[]>(slotKey, [...prevSlot, optimistic]);
      qc.setQueryData<Record<string, MealEntry[]>>(allKey, {
        ...prevAll,
        [slot]: [...(prevAll[slot] ?? []), optimistic],
      });

      return { prevSlot, prevAll, slotKey, allKey };
    },

    mutationFn: async ({ date, slot, food }: { date: string; slot: MealSlotId; food: Food }) => {
      if (!recipientId) throw new Error("No recipient selected");

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const { unit } = unitForId(food.id);
        enqueueOp({
          id: tempId(),
          type: "add_entry",
          recipientId,
          date,
          slot,
          food: { id: food.id, name: food.name, emoji: food.emoji },
          quantity: 1,
          unit,
        });
        throw offlineErr();
      }

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

    onError: (err, _vars, ctx) => {
      if (isOfflineError(err)) return; // keep optimistic entry visible while offline
      if (!ctx) return;
      qc.setQueryData(ctx.slotKey, ctx.prevSlot);
      qc.setQueryData(ctx.allKey, ctx.prevAll);
    },

    onSuccess: (_, { date, slot }) => {
      qc.invalidateQueries({ queryKey: ["meal-entries", recipientId, date, slot] });
      qc.invalidateQueries({ queryKey: ["meal-entries-all", recipientId, date] });
      qc.invalidateQueries({ queryKey: ["recent-foods", recipientId] });
    },
  });
}

export function useRemoveMealEntry(recipientId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    onMutate: async ({ entryId, date, slot }: { entryId: string; date: string; slot: MealSlotId }) => {
      if (!recipientId) return undefined;

      const slotKey = ["meal-entries", recipientId, date, slot];
      const allKey = ["meal-entries-all", recipientId, date];

      await qc.cancelQueries({ queryKey: slotKey });

      const prevSlot = qc.getQueryData<MealEntry[]>(slotKey) ?? [];
      const prevAll = qc.getQueryData<Record<string, MealEntry[]>>(allKey) ?? {};

      qc.setQueryData<MealEntry[]>(slotKey, prevSlot.filter((e) => e.id !== entryId));
      qc.setQueryData<Record<string, MealEntry[]>>(allKey, {
        ...prevAll,
        [slot]: (prevAll[slot] ?? []).filter((e) => e.id !== entryId),
      });

      return { prevSlot, prevAll, slotKey, allKey };
    },

    mutationFn: async ({ entryId, date, slot }: { entryId: string; date: string; slot: MealSlotId }) => {
      // Optimistically-added temp entry: cancel the corresponding queue op instead
      if (entryId.startsWith("temp-")) {
        cancelLastAddOp(date, slot);
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!recipientId) return;
        enqueueOp({
          id: tempId(),
          type: "remove_entry",
          entryId,
          recipientId,
        });
        throw offlineErr();
      }

      const { error } = await supabase
        .from("meal_log_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },

    onError: (err, _vars, ctx) => {
      if (isOfflineError(err)) return;
      if (!ctx) return;
      qc.setQueryData(ctx.slotKey, ctx.prevSlot);
      qc.setQueryData(ctx.allKey, ctx.prevAll);
    },

    onSuccess: (_, { date, slot }) => {
      qc.invalidateQueries({ queryKey: ["meal-entries", recipientId, date, slot] });
      qc.invalidateQueries({ queryKey: ["meal-entries-all", recipientId, date] });
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

export function useMealLog(recipientId: string | null, date: string, slot: MealSlotId) {
  return useQuery({
    queryKey: ["meal-log", recipientId, date, slot],
    enabled: !!recipientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_logs")
        .select("id, note")
        .eq("recipient_id", recipientId!)
        .eq("date", date)
        .eq("slot", slot)
        .maybeSingle();
      return data as { id: string; note: string | null } | null;
    },
  });
}

export function useUpdateMealNote(recipientId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      logId,
      note,
    }: {
      logId: string;
      note: string;
      date: string;
      slot: MealSlotId;
    }) => {
      const { error } = await supabase
        .from("meal_logs")
        .update({ note: note || null })
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: (_, { date, slot }) => {
      qc.invalidateQueries({ queryKey: ["meal-log", recipientId, date, slot] });
    },
  });
}

export function useCareRecipients(supporterId: string | null) {
  return useQuery({
    queryKey: ["care-recipients", supporterId],
    enabled: !!supporterId,
    queryFn: async () => {
      // RLS handles access: returns rows where user is supporter_id OR in supporter_recipients
      const { data, error } = await supabase
        .from("care_recipients")
        .select("*")
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
