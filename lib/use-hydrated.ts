"use client";

import { useEffect, useState } from "react";

// Zustand persist stores read from localStorage on the client, while the server
// always uses the initial state. This hook returns false until after the first
// client-side mount so that components can defer persisted-store-dependent
// rendering and avoid SSR/CSR hydration mismatches.
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
