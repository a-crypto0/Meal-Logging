// 오프라인 임시저장(draft) — localStorage 기반, 30일 TTL.
// 순수 함수 모음(SSR 안전: window 가드). 입력 폼의 자동저장/복구에 사용.

export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
const PREFIX = "meal-draft:";
const VERSION = 1;

export type DraftEnvelope<T> = {
  /** 스키마 버전(불일치 시 폐기) */
  v: number;
  /** 저장 시각(epoch ms) */
  savedAt: number;
  data: T;
};

function keyOf(key: string): string {
  return `${PREFIX}${key}`;
}

function ls(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T, now: number = Date.now()): void {
  const store = ls();
  if (!store) return;
  const envelope: DraftEnvelope<T> = { v: VERSION, savedAt: now, data };
  try {
    store.setItem(keyOf(key), JSON.stringify(envelope));
  } catch {
    /* 직렬화 실패 / 용량 초과 무시 */
  }
}

/** 유효(미만료·버전 일치)한 draft 반환. 만료/손상 시 제거 후 null */
export function loadDraft<T>(key: string, now: number = Date.now()): DraftEnvelope<T> | null {
  const store = ls();
  if (!store) return null;
  const raw = store.getItem(keyOf(key));
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as DraftEnvelope<T>;
    if (!env || env.v !== VERSION || typeof env.savedAt !== "number") {
      store.removeItem(keyOf(key));
      return null;
    }
    if (now - env.savedAt > DRAFT_TTL_MS) {
      store.removeItem(keyOf(key)); // TTL 만료 → 정리
      return null;
    }
    return env;
  } catch {
    store.removeItem(keyOf(key));
    return null;
  }
}

export function clearDraft(key: string): void {
  const store = ls();
  if (!store) return;
  try {
    store.removeItem(keyOf(key));
  } catch {
    /* noop */
  }
}

export function hasValidDraft(key: string, now: number = Date.now()): boolean {
  return loadDraft(key, now) !== null;
}

/** 만료된 모든 draft 일괄 정리(앱 시작 시 호출) */
export function purgeExpiredDrafts(now: number = Date.now()): void {
  const store = ls();
  if (!store) return;
  try {
    const expired: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const raw = store.getItem(k);
      if (!raw) continue;
      try {
        const env = JSON.parse(raw) as DraftEnvelope<unknown>;
        if (!env || typeof env.savedAt !== "number" || now - env.savedAt > DRAFT_TTL_MS) {
          expired.push(k);
        }
      } catch {
        expired.push(k);
      }
    }
    for (const k of expired) store.removeItem(k);
  } catch {
    /* noop */
  }
}

/** 상대 시간 한글 포맷: "방금 전" · "5분 전" · "3시간 전" · "2일 전" */
export function formatRelativeTime(savedAt: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - savedAt);
  const min = 60_000;
  const hr = 3_600_000;
  const day = 86_400_000;
  if (diff < min) return "방금 전";
  if (diff < hr) return `${Math.floor(diff / min)}분 전`;
  if (diff < day) return `${Math.floor(diff / hr)}시간 전`;
  return `${Math.floor(diff / day)}일 전`;
}
