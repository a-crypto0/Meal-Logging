import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const MEAL_SLOTS = [
  { id: "breakfast", label: "아침", emoji: "🌅", color: "meal-breakfast" },
  { id: "lunch", label: "점심", emoji: "🍱", color: "meal-lunch" },
  { id: "dinner", label: "저녁", emoji: "🌙", color: "meal-dinner" },
  { id: "snack", label: "간식", emoji: "🍎", color: "meal-snack" },
] as const;

export type MealSlotId = (typeof MEAL_SLOTS)[number]["id"];
