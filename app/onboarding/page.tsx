"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";
import { useRecipientStore } from "@/lib/recipient-store";
import { useUserMode } from "@/lib/user-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { mode } = useUserMode();
  const setSelectedRecipient = useRecipientStore((s) => s.setSelectedRecipient);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const recipientName =
        mode === "self"
          ? user.user_metadata?.name || name || "나"
          : name.trim();

      const { data, error } = await supabase
        .from("care_recipients")
        .insert({ name: recipientName, supporter_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setSelectedRecipient(data);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "self") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pb-20">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-bold">환영해요!</h1>
          <p className="text-gray-500">오늘부터 식단을 함께 기록해요</p>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 text-lg"
          >
            {loading ? "설정 중..." : "시작하기"}
          </Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 pb-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">👤</div>
          <h1 className="text-2xl font-bold">케어 수급자 추가</h1>
          <p className="text-sm text-gray-500">
            첫 번째 케어 수급자의 이름을 입력해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="수급자 이름 (예: 김철수)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12 text-base"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full h-12 text-base"
          >
            {loading ? "저장 중..." : "다음"}
          </Button>
        </form>
      </div>
    </div>
  );
}
