"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-7xl" aria-hidden>
        😴
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">잠깐 쉬어가요</h1>
        <p className="text-sm text-muted-foreground">
          문제가 생겼어요. 다시 시도해 주세요.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button onClick={reset} className="h-12 w-full text-base">
          다시 시도
        </Button>
        <Button
          variant="outline"
          onClick={() => router.replace("/")}
          className="h-12 w-full text-base"
        >
          홈으로
        </Button>
      </div>
    </div>
  );
}
