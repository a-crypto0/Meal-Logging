"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/draft";

export function DraftRecoveryDialog({
  open,
  savedAt,
  onRecover,
  onDiscard,
  onOpenChange,
}: {
  open: boolean;
  savedAt: number | null;
  onRecover: () => void;
  onDiscard: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>작성 중이던 기록이 있습니다</DialogTitle>
          <DialogDescription>
            {savedAt
              ? `${formatRelativeTime(savedAt)}에 임시저장된 내용이 있습니다. 복구하시겠습니까?`
              : "임시저장된 내용이 있습니다. 복구하시겠습니까?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            새로 작성
          </Button>
          <Button onClick={onRecover}>복구하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
