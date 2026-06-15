// 브라우저용 Supabase 싱글톤 클라이언트.
// 익명 세션(signInAnonymously) 기반. 환경변수 미설정 시 null 을 반환하여
// 상위(AuthProvider)에서 로컬 게스트로 폴백한다(오프라인/무자격 환경 동작 보장).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_client) return _client;
  _client = createClient(url as string, anonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "meal-logging-auth",
    },
  });
  return _client;
}
