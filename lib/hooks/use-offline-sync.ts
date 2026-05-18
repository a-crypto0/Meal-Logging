"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { flushQueue, type AddEntryOp, type RemoveEntryOp } from "@/lib/offline-queue";

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

async function replayAdd(op: AddEntryOp) {
  const { data: existing } = await supabase
    .from("meal_logs")
    .select("id")
    .eq("recipient_id", op.recipientId)
    .eq("date", op.date)
    .eq("slot", op.slot)
    .maybeSingle();

  let logId = existing?.id;
  if (!logId) {
    const { data: created, error } = await supabase
      .from("meal_logs")
      .insert({ recipient_id: op.recipientId, date: op.date, slot: op.slot })
      .select("id")
      .single();
    if (error) throw error;
    logId = created.id;
  }

  const { error } = await supabase.from("meal_log_entries").insert({
    log_id: logId,
    food_id: op.food.id,
    food_name: op.food.name,
    emoji: op.food.emoji,
    quantity: op.quantity,
    unit: op.unit,
  });
  if (error) throw error;
}

async function replayRemove(op: RemoveEntryOp) {
  await supabase.from("meal_log_entries").delete().eq("id", op.entryId);
}

export function useOfflineSync() {
  const qc = useQueryClient();

  useEffect(() => {
    async function sync() {
      const ops = flushQueue();
      if (ops.length === 0) return;

      for (const op of ops) {
        try {
          if (op.type === "add_entry") await replayAdd(op);
          else await replayRemove(op);
        } catch (err) {
          console.warn("[offline-sync] op failed:", op.type, err);
        }
      }

      // Invalidate all meal-related queries to reflect synced data
      qc.invalidateQueries({ queryKey: ["meal-entries"] });
      qc.invalidateQueries({ queryKey: ["meal-entries-all"] });
      qc.invalidateQueries({ queryKey: ["recent-foods"] });
      qc.invalidateQueries({ queryKey: ["nutrition"] });
      qc.invalidateQueries({ queryKey: ["repetitive-foods"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
    }

    window.addEventListener("online", sync);
    // Flush any leftover queue items on mount
    if (typeof navigator !== "undefined" && navigator.onLine) void sync();

    return () => window.removeEventListener("online", sync);
  }, [qc]);
}

export function OfflineSyncTrigger(): null {
  useOfflineSync();
  return null;
}
