"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { purgeExpiredDrafts } from "@/lib/draft";

export type AuthStatus = "loading" | "authenticated" | "guest" | "error";

export type AuthState = {
  status: AuthStatus;
  /** auth.uid() = worker_id. Supabase 미설정/오프라인 시 로컬 게스트 id */
  workerId: string | null;
  isAnonymous: boolean;
  configured: boolean;
  error: string | null;
};

const initialState: AuthState = {
  status: "loading",
  workerId: null,
  isAnonymous: true,
  configured: isSupabaseConfigured,
  error: null,
};

const AuthContext = createContext<AuthState>(initialState);

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

const GUEST_KEY = "meal-logging-guest-id";

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "guest";
  try {
    let id = window.localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = `guest_${crypto.randomUUID()}`;
      window.localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return "guest";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    // 앱 시작 시 만료된 임시저장 정리
    purgeExpiredDrafts();

    const supabase = getSupabaseBrowserClient();

    async function bootstrap() {
      // 환경변수 미설정 → 로컬 게스트 폴백
      if (!supabase) {
        const id = getOrCreateGuestId();
        if (!cancelled) {
          setState({ status: "guest", workerId: id, isAnonymous: true, configured: false, error: null });
        }
        return;
      }
      try {
        // 기존 세션이 있으면 재사용, 없으면 익명 로그인
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (!cancelled) {
            setState({
              status: "authenticated",
              workerId: session.user.id,
              isAnonymous: session.user.is_anonymous ?? true,
              configured: true,
              error: null,
            });
          }
          return;
        }
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        if (!cancelled) {
          setState({
            status: "authenticated",
            workerId: data.user?.id ?? null,
            isAnonymous: data.user?.is_anonymous ?? true,
            configured: true,
            error: null,
          });
        }
      } catch (e) {
        // 네트워크/설정 오류 → 게스트로 폴백(앱은 계속 동작)
        const id = getOrCreateGuestId();
        if (!cancelled) {
          setState({
            status: "guest",
            workerId: id,
            isAnonymous: true,
            configured: true,
            error: e instanceof Error ? e.message : "anonymous sign-in failed",
          });
        }
      }
    }

    void bootstrap();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session?.user) return;
      setState((prev) => ({
        ...prev,
        status: "authenticated",
        workerId: session.user.id,
        isAnonymous: session.user.is_anonymous ?? true,
      }));
    });

    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
