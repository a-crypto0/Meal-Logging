import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { BottomNav } from "@/components/bottom-nav";
import { QueryProvider } from "@/components/query-provider";
import { AuthProvider } from "@/components/auth-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineSyncTrigger } from "@/lib/hooks/use-offline-sync";

import "./globals.css";

export const metadata: Metadata = {
  title: "오늘의 식판 · 식단 기록",
  description: "발달장애인과 지원인력을 위한 쉬운 식단 기록 · 영양 분석 앱",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <AuthProvider>
            <OfflineSyncTrigger />
            <OfflineBanner />
            <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
              <main className="flex-1 pb-24">{children}</main>
              <BottomNav />
            </div>
          </AuthProvider>
        </QueryProvider>
        <Script
          id="sw-register"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' });`,
          }}
        />
      </body>
    </html>
  );
}
