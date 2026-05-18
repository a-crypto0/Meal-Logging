"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { useUserMode, type UserMode } from "@/lib/user-mode";
import { cn } from "@/lib/utils";

type ModeOption = {
  id: UserMode;
  title: string;
  emoji: string;
  description: string;
  features: string[];
  accent: string;
};

const MODES: ModeOption[] = [
  {
    id: "self",
    title: "본인 모드",
    emoji: "🙋",
    description: "내가 직접 식사를 기록해요",
    features: [
      "큰 글자와 그림으로 쉬워요",
      "음식 이모지로 한 번에 선택",
      "잘 드시면 칭찬을 받아요",
    ],
    accent: "border-meal-breakfast bg-meal-breakfast/10",
  },
  {
    id: "supporter",
    title: "지원인력 모드",
    emoji: "👩‍⚕️",
    description: "여러 분의 식단을 빠르게 관리해요",
    features: [
      "검색·자주/최근 메뉴 빠른 입력",
      "오늘의 영양 균형과 통계 확인",
      "복지센터 제출용 CSV 추출",
    ],
    accent: "border-meal-dinner bg-meal-dinner/10",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const currentMode = useUserMode((s) => s.mode);
  const setMode = useUserMode((s) => s.setMode);

  function pick(m: UserMode) {
    setMode(m);
    router.replace("/");
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-10">
      <header className="space-y-2 text-center">
        <div className="text-5xl" aria-hidden>
          🍱
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">오늘의 식판</h1>
        <p className="text-base text-muted-foreground">
          어떻게 사용하시나요?
        </p>
      </header>

      <ul className="space-y-4" role="list">
        {MODES.map((m) => {
          const active = currentMode === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => pick(m.id)}
                aria-pressed={active}
                className={cn(
                  "relative w-full rounded-3xl border-2 p-6 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-primary bg-primary/5" : m.accent
                )}
              >
                {active && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    현재
                  </span>
                )}
                <div className="mb-3 text-5xl" aria-hidden>
                  {m.emoji}
                </div>
                <h2 className="text-2xl font-extrabold">{m.title}</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  {m.description}
                </p>
                <ul className="space-y-1 text-sm">
                  {m.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span aria-hidden className="mt-0.5 text-primary">
                        •
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-muted-foreground">
        모드는 홈에서 언제든지 다시 바꿀 수 있어요
      </p>
    </div>
  );
}
