"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    emoji: "🍚",
    title: "식사를 기록해요",
    desc: "아침·점심·저녁·간식\n먹은 음식을 눌러서 기록해요",
  },
  {
    emoji: "📊",
    title: "영양을 확인해요",
    desc: "탄수화물·단백질·지방을\n얼마나 먹었는지 바로 봐요",
  },
  {
    emoji: "🌟",
    title: "칭찬을 받아요",
    desc: "균형 잡힌 식사를 하면\n특별한 배지를 받아요!",
  },
];

const STORAGE_KEY = "self-onboarding-v1";

export function OnboardingGuide() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/97 px-8"
      role="dialog"
      aria-modal="true"
      aria-label="시작 안내"
    >
      <div className="w-full max-w-sm space-y-10 text-center">
        <div className="text-[96px] leading-none select-none" aria-hidden>
          {current.emoji}
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold">{current.title}</h2>
          <p className="whitespace-pre-line text-lg text-muted-foreground leading-relaxed">
            {current.desc}
          </p>
        </div>

        {/* dot progress */}
        <div className="flex justify-center gap-2" role="tablist" aria-label="진행 단계">
          {STEPS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`${i + 1}단계`}
              onClick={() => setStep(i)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : "w-2.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 h-14 text-base"
            >
              이전
            </Button>
          )}
          {isLast ? (
            <Button onClick={finish} className="flex-1 h-14 text-lg font-extrabold">
              시작하기! 🎉
            </Button>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              className="flex-1 h-14 text-lg font-extrabold"
            >
              다음
            </Button>
          )}
        </div>

        <button
          onClick={finish}
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
