"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Food } from "@/lib/food-data";
import type { FoodCategory } from "@/lib/food-data";
import { cn } from "@/lib/utils";

type ParsedFood = {
  name: string;
  emoji: string;
  quantity: number;
  unit: string;
};

export function MealCamera({
  onAdd,
  isSelf,
}: {
  onAdd: (food: Food) => void;
  isSelf: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [foods, setFoods] = useState<ParsedFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  async function handleFile(file: File) {
    setError(null);
    setFoods([]);
    setAdded(new Set());
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/parse-meal", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "파싱 실패");
      setFoods(json.foods ?? []);
      if ((json.foods ?? []).length === 0) setError("음식을 인식하지 못했어요. 다시 시도해 주세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(f: ParsedFood, idx: number) {
    onAdd({
      id: `vision-${Date.now()}-${idx}`,
      name: f.name,
      emoji: f.emoji,
      category: "side" as FoodCategory,
    });
    setAdded((prev) => new Set(prev).add(idx));
  }

  function reset() {
    setPreview(null);
    setFoods([]);
    setError(null);
    setAdded(new Set());
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card font-bold transition-colors hover:bg-accent",
            isSelf ? "gap-3 py-6 text-base" : "py-4 text-sm"
          )}
        >
          <Camera className={cn(isSelf ? "h-7 w-7" : "h-5 w-5")} aria-hidden />
          사진으로 식판 인식
        </button>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-3">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="식판 사진"
                className="h-40 w-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={reset}
                aria-label="사진 지우기"
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI가 음식을 인식하는 중...
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {foods.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold">인식된 음식 ({foods.length}개)</p>
                <ul className="space-y-1.5">
                  {foods.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5"
                    >
                      <span className="text-xl" aria-hidden>{f.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.quantity} {f.unit}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={added.has(i) ? "secondary" : "default"}
                        onClick={() => handleAdd(f, i)}
                        disabled={added.has(i)}
                        className="h-8 shrink-0 px-3 text-xs"
                      >
                        {added.has(i) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {added.has(i) ? "추가됨" : "추가"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => inputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                다시 촬영
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
