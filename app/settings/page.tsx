"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Eye, EyeOff, Settings, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSettingsStore } from "@/lib/settings-store";
import { useHydrated } from "@/lib/use-hydrated";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const { openAiKey, setOpenAiKey } = useSettingsStore();
  const [inputKey, setInputKey] = useState("");
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  // Sync input from store once hydrated
  useEffect(() => {
    if (hydrated) setInputKey(openAiKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setOpenAiKey(inputKey);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: inputKey.trim(),
          nutrition: { kcal: 1800, carbs: 260, protein: 50, fat: 50, fiber: 20 },
          mealSummary: "테스트 연결 확인용",
        }),
      });
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-8 pt-6">
      <header className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="text-2xl font-extrabold">설정</h1>
      </header>

      {/* OFD 상태 */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>🥗</span>
            <div className="flex-1">
              <p className="font-bold">영양 데이터</p>
              <p className="text-xs text-muted-foreground">Open Food Facts · 무료 · 자동 사용</p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
              활성
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            오픈 식품 데이터베이스에서 실시간 영양 정보를 가져옵니다. 한국 식품은
            일부 데이터가 없을 수 있으며, 이 경우 자체 추정값을 사용합니다.
          </p>
        </CardContent>
      </Card>

      {/* OpenAI API 키 */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>✨</span>
            <div className="flex-1">
              <p className="font-bold">AI 영양 인사이트</p>
              <p className="text-xs text-muted-foreground">OpenAI gpt-4o-mini · 선택 사항</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                openAiKey
                  ? "bg-green-100 text-green-700"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {openAiKey ? "연결됨" : "미연결"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            API 키를 등록하면 영양 분석 페이지에서 AI 맞춤 조언을 받을 수 있어요.
            키는 이 기기에만 저장되며 외부 서버에 보관되지 않습니다.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="api-key" className="text-sm font-semibold">
              OpenAI API 키
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={show ? "text" : "password"}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setTestResult(null);
                  setSaved(false);
                }}
                placeholder="sk-..."
                className="h-12 w-full rounded-xl border-2 border-border bg-background px-3 pr-12 font-mono text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "키 숨기기" : "키 보기"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-accent"
              >
                {show ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                testResult === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {testResult === "ok" ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden />
                  연결 성공!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" aria-hidden />
                  연결 실패. API 키를 확인해 주세요.
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              variant="outline"
              size="sm"
              disabled={!inputKey.trim() || testing}
              className="flex-1"
            >
              {testing ? "테스트 중…" : "연결 테스트"}
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={inputKey === openAiKey && !saved}
              className="flex-1"
            >
              {saved ? "저장됨 ✓" : "저장"}
            </Button>
          </div>

          {openAiKey && (
            <button
              type="button"
              onClick={() => {
                setInputKey("");
                setOpenAiKey("");
                setTestResult(null);
              }}
              className="text-xs text-destructive hover:underline"
            >
              API 키 삭제
            </button>
          )}
        </CardContent>
      </Card>

      {/* 앱 정보 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-2 font-bold">앱 정보</h2>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>오늘의 식판 · 식단 기록 &amp; 영양 분석</p>
            <p>발달장애인과 지원인력을 위한 앱</p>
            <p className="mt-2 border-t border-border pt-2">
              영양 데이터 출처: Open Food Facts (CC BY-SA 4.0)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
