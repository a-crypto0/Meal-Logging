"use client";

import { useState } from "react";
import { Bell, Share2, Users } from "lucide-react";
import { NotificationSettings } from "@/components/notification-settings";
import { ShareModal } from "@/components/share-modal";
import { InviteModal } from "@/components/invite-modal";
import { useRecipientStore } from "@/lib/recipient-store";
import { useAcceptInvite } from "@/lib/hooks/use-supporter-recipients";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { selectedRecipient } = useRecipientStore();
  const [showShare, setShowShare] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const acceptInvite = useAcceptInvite();

  return (
    <div className="space-y-4 px-4 pb-8 pt-6">
      <header>
        <h1 className="text-2xl font-extrabold">설정</h1>
      </header>

      {selectedRecipient && (
        <>
          <div className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="font-bold">공유 링크</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">의료진·보호자에게 식단을 공유해요</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowShare(true)}>
              공유 링크 관리
            </Button>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-bold">팀 관리</h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">다른 지원인력을 초대하거나 관리해요</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setShowInvite(true)}>
              팀원 관리
            </Button>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-bold">알림 설정</h2>
        </div>
        <NotificationSettings />
      </div>

      <div className="rounded-2xl border border-border p-4">
        <h2 className="mb-1 font-bold">초대 코드 입력</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          다른 지원인력에게 받은 초대 코드를 입력해요
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="초대 코드"
            maxLength={8}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-base uppercase"
          />
          <Button
            size="sm"
            onClick={() =>
              acceptInvite.mutate(inviteCode, { onSuccess: () => setInviteCode("") })
            }
            disabled={!inviteCode.trim() || acceptInvite.isPending}
          >
            참여
          </Button>
        </div>
        {acceptInvite.isError && (
          <p className="mt-2 text-sm text-destructive">
            코드가 올바르지 않거나 이미 사용되었어요.
          </p>
        )}
        {acceptInvite.isSuccess && (
          <p className="mt-2 text-sm text-primary">성공적으로 참여했어요!</p>
        )}
      </div>

      {showShare && selectedRecipient && (
        <ShareModal recipientId={selectedRecipient.id} onClose={() => setShowShare(false)} />
      )}
      {showInvite && selectedRecipient && (
        <InviteModal recipientId={selectedRecipient.id} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}
