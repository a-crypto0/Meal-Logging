import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, nutrition, mealSummary } = body as {
    apiKey: string;
    nutrition: { kcal: number; carbs: number; protein: number; fat: number; fiber: number };
    mealSummary: string;
  };

  if (!apiKey?.startsWith("sk-")) {
    return NextResponse.json({ error: "유효한 OpenAI API 키가 필요합니다." }, { status: 401 });
  }

  const prompt = `오늘 식단 기록:
${mealSummary}

영양소 섭취 현황 (일반 성인 권장 기준 대비):
- 열량: ${Math.round(nutrition.kcal)}kcal / 목표 2000kcal (${Math.round((nutrition.kcal / 2000) * 100)}%)
- 탄수화물: ${Math.round(nutrition.carbs)}g / 목표 300g
- 단백질: ${Math.round(nutrition.protein)}g / 목표 55g
- 지방: ${Math.round(nutrition.fat)}g / 목표 55g
- 식이섬유: ${Math.round(nutrition.fiber)}g / 목표 25g

발달장애인의 균형 잡힌 식사를 돕는 지원인력을 위한 친절하고 실용적인 영양 조언을 한국어로 3가지만 제공해주세요.
각 항목은 이모지로 시작하고, 구체적이고 실행 가능한 개선점을 담아주세요.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.error?.message ?? "OpenAI 요청 실패" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const insight = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
