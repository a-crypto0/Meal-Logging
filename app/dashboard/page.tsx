"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { HomeSelf } from "@/components/home-self";
import { HomeSupporter } from "@/components/home-supporter";
import { useUserMode } from "@/lib/user-mode";
import { useHydrated } from "@/lib/use-hydrated";

export default function DashboardPage() {
  const router = useRouter();
  const mode = useUserMode((s) => s.mode);
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !mode) router.replace("/welcome");
  }, [hydrated, mode, router]);

  if (!hydrated || !mode) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  return mode === "self" ? <HomeSelf /> : <HomeSupporter />;
}
