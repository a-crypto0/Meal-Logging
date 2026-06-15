import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "오늘의 식판 · 식단 기록",
  description: "발달장애인과 지원인력을 위한 쉬운 식단 기록 · 영양 분석 앱",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
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
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
