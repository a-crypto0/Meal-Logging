"use client";

import { useState } from "react";
import { Copy, Link, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShareTokens, useCreateShareToken, useDeleteShareToken } from "@/lib/hooks/use-share";
import { useAuthStore } from "@/lib/auth-store";

export function ShareModal({ recipientId, onClose }: { recipientId: string; onClose: () => void }) {
  const { user } = useAuthStore();
  const { data: tokens = [], isLoading } = useShareTokens(recipientId);
  const createToken = useCreateShareToken(recipientId, user?.id ?? null);
  const deleteToken = useDeleteShareToken(recipientId);
  const [copied, setCopied] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  function getShareUrl(token: string) {
    return `${window.location.origin}/share/${token}`;
  }

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(getShareUrl(token));
    setCopied(token);
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
            <Link className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">공유 링크 관리</h2>
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-full p-2 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          의료진·보호자에게 읽기 전용 링크를 공유할 수 있어요.
        </p>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="링크 이름 (선택)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button
            size="sm"
            onClick={() =>
              createToken.mutate(label.trim() || undefined, {
                onSuccess: () => setLabel(""),
              })
            }
            disabled={createToken.isPending}
          >
            <Plus className="h-4 w-4" />
            생성
          </Button>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : tokens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">공유 링크가 없어요</p>
        ) : (
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.label ?? "링크"}</p>
                  <p className="truncate text-xs text-muted-foreground">{getShareUrl(t.token)}</p>
                </div>
                <button
                  onClick={() => handleCopy(t.token)}
                  aria-label="링크 복사"
                  className="rounded-lg p-2 hover:bg-accent"
                >
                  {copied === t.token ? (
                    <span className="text-xs font-bold text-primary">복사됨</span>
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => deleteToken.mutate(t.id)}
                  aria-label="링크 삭제"
                  className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
