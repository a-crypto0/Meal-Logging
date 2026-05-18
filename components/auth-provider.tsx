"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth-store";

function setAuthCookie(value: "1" | "") {
  if (value) {
    document.cookie = "meal-app-authed=1; path=/; max-age=604800; SameSite=Lax";
  } else {
    document.cookie = "meal-app-authed=; path=/; max-age=0; SameSite=Lax";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthCookie(session ? "1" : "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setAuthCookie("1");
      } else {
        clearSession();
        setAuthCookie("");
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, clearSession]);

  return <>{children}</>;
}
