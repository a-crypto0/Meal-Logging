import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `당신은 한국인의 식단과 영양을 전문으로 하는 영양사입니다.
발달장애인과 지원인력(사회복지사·활동지원사)을 위한 식단 다양성과 영양 균형을 돕습니다.

응답 규칙:
- 반드시 한국어로 답변합니다.
- 구체적인 한식 메뉴를 추천합니다 (3~5가지).
- 각 메뉴마다 ① 왜 도움이 되는지 (1문장), ② 간편 조리법 또는 구입 팁 (1~2문장)을 제공합니다.
- 발달장애인도 이해할 수 있는 쉬운 말을 씁니다.
- 마트나 편의점에서 쉽게 구할 수 있는 재료 위주로 추천합니다.
- 응답 형식: 번호 목록(1. 2. 3. ...), 각 항목에 음식 이름 + 이모지로 시작`;

type NutritionGap = {
  nutrient: string;
  actual: number;
  target: number;
  unit: string;
  pct: number;
};

type RecentFood = {
  name: string;
  emoji: string;
  days: number;
};

type RecommendRequest = {
  nutritionGaps: NutritionGap[];
  recentFoods: RecentFood[];
  mealCount: number;
  recipientName?: string;
};

function buildUserPrompt(body: RecommendRequest): string {
  const { nutritionGaps, recentFoods, mealCount, recipientName } = body;

  const shortfalls = nutritionGaps.filter((g) => g.pct < 0.7);
  const excesses = nutritionGaps.filter((g) => g.pct > 1.3);

  const lines: string[] = [];

  if (recipientName) lines.push(`대상: ${recipientName}`);
  lines.push(`오늘 식사 기록: ${mealCount}개 메뉴`);

  if (shortfalls.length > 0) {
    lines.push(
      `\n부족한 영양소:\n` +
        shortfalls
          .map(
            (g) =>
              `- ${g.nutrient}: ${Math.round(g.actual)}${g.unit} (목표 ${g.target}${g.unit}의 ${Math.round(g.pct * 100)}%)`
          )
          .join("\n")
    );
  } else {
    lines.push("\n영양소 균형: 전반적으로 양호");
  }

  if (excesses.length > 0) {
    lines.push(
      `\n과다 섭취 영양소:\n` +
        excesses.map((g) => `- ${g.nutrient}: ${Math.round(g.pct * 100)}%`).join("\n")
    );
  }

  if (recentFoods.length > 0) {
    lines.push(
      `\n최근 7일 자주 먹은 음식 (중복 피해주세요):\n` +
        recentFoods.map((f) => `- ${f.emoji} ${f.name} (${f.days}일)`).join("\n")
    );
  }

  lines.push(
    `\n위 정보를 바탕으로 오늘 추가로 먹으면 좋을 음식 3~5가지를 추천해 주세요.`
  );

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해 주세요.",
      { status: 503 }
    );
  }

  let body: RecommendRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          stream: true,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            } as Parameters<typeof anthropic.messages.create>[0]["system"] extends Array<infer T> ? T : never,
          ],
          messages: [
            { role: "user", content: buildUserPrompt(body) },
          ],
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        controller.enqueue(encoder.encode(`\n\n오류: ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
