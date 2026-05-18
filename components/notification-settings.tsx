"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import {
  useNotificationPrefs,
  useUpsertNotificationPrefs,
  useNotificationPermission,
  useNotificationScheduler,
} from "@/lib/hooks/use-notifications";

const SLOT_FIELDS = [
  { key: "breakfast_time" as const, label: "아침", defaultTime: "08:00" },
  { key: "lunch_time" as const, label: "점심", defaultTime: "12:00" },
  { key: "dinner_time" as const, label: "저녁", defaultTime: "18:00" },
  { key: "snack_time" as const, label: "간식", defaultTime: "15:00" },
];

export function NotificationSettings() {
  const { user } = useAuthStore();
  const { selectedRecipient } = useRecipientStore();
  const recipientId = selectedRecipient?.id ?? null;
  const supporterId = user?.id ?? null;

  const { data: prefs } = useNotificationPrefs(recipientId, supporterId);
  const upsert = useUpsertNotificationPrefs(recipientId, supporterId);
  const { permission, requestPermission } = useNotificationPermission();

  useNotificationScheduler(prefs);

  if (!recipientId || !supporterId) {
    return (
      <p className="text-sm text-muted-foreground">케어 수급자를 선택하면 알림을 설정할 수 있어요</p>
    );
  }

  const enabled = prefs?.enabled ?? false;

  async function handleToggle() {
    if (!enabled && permission !== "granted") {
      const result = await requestPermission();
      if (result !== "granted") return;
    }
    upsert.mutate({ enabled: !enabled });
  }

  function handleTimeChange(field: (typeof SLOT_FIELDS)[number]["key"], value: string) {
    upsert.mutate({ [field]: value });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">식사 알림</p>
          <p className="text-sm text-muted-foreground">지정한 시간에 알림을 보내드려요</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={upsert.isPending}
          aria-pressed={enabled}
          aria-label={enabled ? "알림 끄기" : "알림 켜기"}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {permission === "denied" && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          브라우저에서 알림 권한이 차단되어 있어요. 브라우저 설정에서 허용해주세요.
        </p>
      )}

      {permission === "default" && !enabled && (
        <Button variant="outline" size="sm" className="w-full" onClick={requestPermission}>
          <Bell className="h-4 w-4" />
          알림 권한 허용하기
        </Button>
      )}

      {enabled && (
        <div className="space-y-2">
          {SLOT_FIELDS.map((slot) => {
            const savedTime =
              (prefs as Record<string, string | null | undefined> | null)?.[slot.key] ??
              slot.defaultTime;
            return (
              <div
                key={slot.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-3"
              >
                <span className="text-sm font-semibold">{slot.label}</span>
                <input
                  type="time"
                  defaultValue={savedTime ?? slot.defaultTime}
                  onChange={(e) => handleTimeChange(slot.key, e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
