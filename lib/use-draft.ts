"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clearDraft, loadDraft, saveDraft, type DraftEnvelope } from "@/lib/draft";

export type AutosaveStatus = "idle" | "saving" | "saved";

export type UseDraftAutosaveOptions<T> = {
  /** 디바운스(ms). 기본 250 */
  debounceMs?: number;
  /** false면 저장 일시중지(복구 다이얼로그 응답 전 등) */
  enabled?: boolean;
  /** 빈 값이면 저장 스킵(불필요한 빈 draft 방지) */
  isEmpty?: (value: T) => boolean;
};

/**
 * value 변경 시 debounceMs(기본 250ms) 디바운스로 localStorage 자동 저장.
 * 최초 마운트 값은 저장하지 않아 복구 흐름과 충돌하지 않는다.
 */
export function useDraftAutosave<T>(
  key: string,
  value: T,
  options: UseDraftAutosaveOptions<T> = {},
): { status: AutosaveStatus; savedAt: number | null; clear: () => void } {
  const debounceMs = options.debounceMs ?? 250;
  const enabled = options.enabled ?? true;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);
  const isEmptyRef = useRef(options.isEmpty);
  isEmptyRef.current = options.isEmpty;

  useEffect(() => {
    if (!enabled) return;
    // 최초 마운트 값은 스킵(복구 다이얼로그가 먼저 뜨도록)
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (isEmptyRef.current?.(value)) return;

    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const now = Date.now();
      saveDraft(key, value, now);
      setSavedAt(now);
      setStatus("saved");
    }, debounceMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, debounceMs, enabled]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    clearDraft(key);
    setSavedAt(null);
    setStatus("idle");
  }, [key]);

  return { status, savedAt, clear };
}

/**
 * 재방문(마운트) 및 네트워크 복구(online 이벤트) 시 유효한 draft가 있으면
 * 복구 후보로 노출한다. UI(다이얼로그)는 candidate 유무로 제어.
 */
export function useDraftRecovery<T>(key: string): {
  candidate: DraftEnvelope<T> | null;
  recover: () => DraftEnvelope<T> | null;
  discard: () => void;
  dismiss: () => void;
} {
  const [candidate, setCandidate] = useState<DraftEnvelope<T> | null>(null);

  const check = useCallback(() => {
    const env = loadDraft<T>(key);
    if (env) setCandidate(env);
  }, [key]);

  useEffect(() => {
    check(); // 재방문 시 1회
    const onOnline = () => check(); // 네트워크 복구 시
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [check]);

  const recover = useCallback(() => {
    const env = loadDraft<T>(key);
    setCandidate(null);
    return env;
  }, [key]);

  const discard = useCallback(() => {
    clearDraft(key);
    setCandidate(null);
  }, [key]);

  const dismiss = useCallback(() => setCandidate(null), []);

  return { candidate, recover, discard, dismiss };
}
