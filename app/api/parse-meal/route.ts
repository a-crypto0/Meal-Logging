import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

type ParsedFood = {
  name: string;
  emoji: string;
  quantity: number;
  unit: string;
};

const PARSE_SYSTEM = `당신은 식판 사진을 분석하는 영양사입니다.
사진에서 음식을 식별하고 JSON 배열로 반환합니다.

규칙:
- 반드시 JSON만 반환합니다. 설명 텍스트 없이.
- 각 음식은 { "name": "한국어 이름", "emoji": "단일 이모지", "quantity": 숫자, "unit": "단위" } 형태
- 단위는 "g", "ml", "개", "공기", "인분", "조각" 중 하나
- 분량은 눈대중 추정 (밥 한 공기 = 1, 국 한 그릇 = 1)
- 식별 불가 시 빈 배열 []
- 최대 10개`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  }

  let imageBase64: string;
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return Response.json({ error: "image field required" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Image must be < 5 MB" }, { status: 413 });
    }
    const buf = await file.arrayBuffer();
    imageBase64 = Buffer.from(buf).toString("base64");
    const t = file.type;
    mediaType =
      t === "image/png"
        ? "image/png"
        : t === "image/gif"
          ? "image/gif"
          : t === "image/webp"
            ? "image/webp"
            : "image/jpeg";
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: PARSE_SYSTEM,
          cache_control: { type: "ephemeral" },
        } as Parameters<typeof anthropic.messages.create>[0]["system"] extends Array<infer T>
          ? T
          : never,
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: "이 식판/식사 사진에서 음식을 파악해서 JSON으로 반환해주세요." },
          ],
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "[]";

    // Extract JSON array from response (may have markdown fences)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const foods: ParsedFood[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return Response.json({ foods });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
