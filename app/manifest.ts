import type { MetadataRoute } from "next";

// PWA 웹 앱 매니페스트(Next App Router가 /manifest.webmanifest 로 자동 노출 + <link> 주입)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "오늘의 식판 · 식단 기록",
    short_name: "오늘의 식판",
    description: "발달장애인과 지원인력을 위한 쉬운 식단 기록 · 영양 분석 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
