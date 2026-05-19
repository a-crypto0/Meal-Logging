import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/components/bottom-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "오늘의 식판 · 식단 기록",
  description: "발달장애인과 지원인력을 위한 쉬운 식단 기록 · 영양 분석 앱",
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
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
