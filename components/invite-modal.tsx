"use client";

import { useState } from "react";
import { Check, Copy, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSupporterRecipients,
  useCreateInviteCode,
  useActiveInviteCodes,
  useRemoveSupporterFromRecipient,
} from "@/lib/hooks/use-supporter-recipients";
import { useAuthStore } from "@/lib/auth-store";

export function InviteModal({ recipientId, onClose }: { recipientId: string; onClose: () => void }) {
  const { user } = useAuthStore();
  const { data: supporters = [] } = useSupporterRecipients(recipientId);
  const { data: codes = [] } = useActiveInviteCodes(recipientId);
  const createCode = useCreateInviteCode(recipientId, user?.id ?? null);
  const removeSupporter = useRemoveSupporterFromRecipient(recipientId);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">팀원 관리</h2>
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-full p-2 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-5">
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">현재 지원인력</h3>
          {supporters.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 팀원이 없어요</p>
          ) : (
            <ul className="space-y-2">
              {supporters.map((sr) => {
                const sup = sr.supporters as unknown as { id: string; name: string } | null;
                return (
                  <li
                    key={sr.id}
                    className="flex items-center gap-2 rounded-xl border border-border p-3"
                  >
                    <span className="flex-1 text-sm font-semibold">{sup?.name ?? "알 수 없음"}</span>
                    <span className="text-xs capitalize text-muted-foreground">{sr.role}</span>
                    {sr.supporter_id !== user?.id && (
                      <button
                        onClick={() => removeSupporter.mutate(sr.id)}
                        aria-label="팀원 제거"
                        className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">초대 코드</h3>
          <Button
            size="sm"
            variant="outline"
            className="mb-3 w-full"
            onClick={() => createCode.mutate()}
            disabled={createCode.isPending}
          >
            <UserPlus className="h-4 w-4" />
            새 초대 코드 생성 (7일 유효)
          </Button>
          {codes.length > 0 && (
            <ul className="space-y-2">
              {codes.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-3"
                >
                  <code className="flex-1 font-mono text-base font-bold tracking-widest">
                    {c.code}
                  </code>
                  <button
                    onClick={() => handleCopy(c.code)}
                    aria-label="코드 복사"
                    className="rounded-lg p-2 hover:bg-accent"
                  >
                    {copied === c.code ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
