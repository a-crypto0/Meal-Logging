import { NextRequest, NextResponse } from "next/server";
import type { FoodCategory } from "@/lib/food-data";

// Approximate serving weight in grams per 1 unit (공기, 그릇, etc.)
const SERVING_G: Record<FoodCategory, number> = {
  rice:    200,
  soup:    300,
  side:    70,
  protein: 100,
  fruit:   150,
  snack:   50,
  drink:   240,
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const cat = req.nextUrl.searchParams.get("cat") as FoodCategory | null;
  if (!q) return NextResponse.json({ found: false }, { status: 400 });

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    fields: "product_name,nutriments",
    page_size: "3",
    lc: "ko",
  });

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params}`,
      {
        headers: { "User-Agent": "OdaeulSikpan-MealLog/1.0 (open source meal logging app)" },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) return NextResponse.json({ found: false });

    const data = await res.json();
    const product = (data.products ?? [])[0];
    if (!product?.nutriments) return NextResponse.json({ found: false });

    const n = product.nutriments;
    const kcal100g = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0;
    const carbs100g = n["carbohydrates_100g"] ?? n["carbohydrates"] ?? 0;
    const protein100g = n["proteins_100g"] ?? n["proteins"] ?? 0;
    const fat100g = n["fat_100g"] ?? n["fat"] ?? 0;
    const fiber100g = n["fiber_100g"] ?? n["fiber"] ?? 0;

    // Convert per-100g to per-serving
    const servingG = cat ? (SERVING_G[cat] ?? 100) : 100;
    const f = servingG / 100;

    return NextResponse.json({
      found: true,
      productName: product.product_name ?? q,
      perServing: {
        kcal:    Math.round(kcal100g * f),
        carbs:   Math.round(carbs100g * f * 10) / 10,
        protein: Math.round(protein100g * f * 10) / 10,
        fat:     Math.round(fat100g * f * 10) / 10,
        fiber:   Math.round(fiber100g * f * 10) / 10,
      },
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
