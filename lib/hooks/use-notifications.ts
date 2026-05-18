"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

type NotifPrefs = Tables<"notification_preferences">;
type PrefsUpdate = Partial<Omit<NotifPrefs, "id" | "created_at" | "updated_at" | "recipient_id" | "supporter_id">>;

export function useNotificationPrefs(recipientId: string | null, supporterId: string | null) {
  return useQuery({
    queryKey: ["notification-prefs", recipientId, supporterId],
    enabled: !!recipientId && !!supporterId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("recipient_id", recipientId!)
        .eq("supporter_id", supporterId!)
        .maybeSingle();
      return data as NotifPrefs | null;
    },
  });
}

export function useUpsertNotificationPrefs(recipientId: string | null, supporterId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: PrefsUpdate) => {
      if (!recipientId || !supporterId) throw new Error("Missing IDs");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { recipient_id: recipientId, supporter_id: supporterId, ...prefs, updated_at: new Date().toISOString() },
          { onConflict: "recipient_id,supporter_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs", recipientId, supporterId] });
    },
  });
}

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  async function requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  return { permission, requestPermission };
}

function parseTime(timeStr: string | null | undefined): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { hours: h, minutes: m };
}

export function useNotificationScheduler(prefs: NotifPrefs | null | undefined) {
  useEffect(() => {
    if (!prefs?.enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const now = new Date();
    const timers: number[] = [];

    const slots = [
      { label: "아침 식사 시간 🍚", time: prefs.breakfast_time },
      { label: "점심 식사 시간 🍱", time: prefs.lunch_time },
      { label: "저녁 식사 시간 🍲", time: prefs.dinner_time },
      { label: "간식 시간 🍎", time: prefs.snack_time },
    ];

    for (const slot of slots) {
      const parsed = parseTime(slot.time);
      if (!parsed) continue;
      const target = new Date(now);
      target.setHours(parsed.hours, parsed.minutes, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const delayMs = target.getTime() - now.getTime();
      timers.push(
        window.setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification(slot.label, { body: "식사를 기록해보세요", icon: "/icon.svg" });
          }
        }, delayMs)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [prefs]);
}
