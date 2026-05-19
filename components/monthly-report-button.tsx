"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonthlyReport } from "@/lib/hooks/use-monthly-report";
import { DAILY_TARGETS } from "@/lib/hooks/use-nutrition";

const MONTH_LABELS = [
  "", "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

const SLOT_KO: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

function pct(val: number, target: number) {
  return target > 0 ? Math.round((val / target) * 100) : 0;
}

function signal(p: number) {
  if (p >= 70 && p <= 120) return "양호";
  if (p >= 40 && p <= 150) return "주의";
  return "불량";
}

export function MonthlyReportButton({
  recipientId,
  recipientName,
  year,
  month,
}: {
  recipientId: string;
  recipientName: string;
  year: number;
  month: number;
}) {
  const { data, isLoading } = useMonthlyReport(recipientId, recipientName, year, month);
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    if (!data) return;
    setGenerating(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ─── Header ───────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("월간 식단 리포트", 105, 20, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(
        `대상: ${data.recipientName}   기간: ${data.year}년 ${MONTH_LABELS[data.month]}`,
        105,
        28,
        { align: "center" }
      );
      doc.text(
        `기록일수: ${data.daysWithRecord}일   생성일: ${new Date().toLocaleDateString("ko-KR")}`,
        105,
        34,
        { align: "center" }
      );

      // ─── Summary Table ─────────────────────────────────────────
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("영양 요약 (일평균)", 14, 44);

      const cP = pct(data.avgCalories, DAILY_TARGETS.calories);
      const prP = pct(data.avgProtein, DAILY_TARGETS.protein_g);
      const caP = pct(data.avgCarbs, DAILY_TARGETS.carbs_g);
      const faP = pct(data.avgFat, DAILY_TARGETS.fat_g);

      autoTable(doc, {
        startY: 47,
        head: [["영양소", "일평균", "목표", "달성률", "평가"]],
        body: [
          ["칼로리", `${Math.round(data.avgCalories)} kcal`, `${DAILY_TARGETS.calories} kcal`, `${cP}%`, signal(cP)],
          ["단백질", `${Math.round(data.avgProtein)} g`, `${DAILY_TARGETS.protein_g} g`, `${prP}%`, signal(prP)],
          ["탄수화물", `${Math.round(data.avgCarbs)} g`, `${DAILY_TARGETS.carbs_g} g`, `${caP}%`, signal(caP)],
          ["지방", `${Math.round(data.avgFat)} g`, `${DAILY_TARGETS.fat_g} g`, `${faP}%`, signal(faP)],
        ],
        styles: { fontSize: 10, halign: "center" },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { halign: "left" },
          4: { fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });

      // ─── Top Foods ────────────────────────────────────────────
      const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      if (data.topFoods.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("자주 먹은 음식 Top 10", 14, afterSummary);

        autoTable(doc, {
          startY: afterSummary + 3,
          head: [["순위", "음식", "횟수"]],
          body: data.topFoods.map((f, i) => [
            `${i + 1}`,
            `${f.emoji} ${f.food_name}`,
            `${f.count}회`,
          ]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { halign: "center", cellWidth: 15 }, 2: { halign: "center", cellWidth: 20 } },
          margin: { left: 14, right: 14 },
        });
      }

      // ─── Daily Log Table ──────────────────────────────────────
      const afterTop = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("일별 기록", 14, afterTop);

      autoTable(doc, {
        startY: afterTop + 3,
        head: [["날짜", "시간대", "메뉴 수", "칼로리", "주요 음식"]],
        body: data.days.map((d) => [
          new Date(d.date + "T00:00:00").toLocaleDateString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
          }),
          d.slots.map((s) => SLOT_KO[s] ?? s).join(", "),
          `${d.mealCount}개`,
          `${Math.round(d.calories)} kcal`,
          d.topFoods.slice(0, 3).join(", "),
        ]),
        styles: { fontSize: 9, overflow: "ellipsize", cellWidth: "wrap" },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 30 },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: "auto" },
        },
        margin: { left: 14, right: 14 },
      });

      // ─── Footer ───────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text(
          `오늘의 식판 — ${i} / ${pageCount}`,
          105,
          doc.internal.pageSize.height - 8,
          { align: "center" }
        );
        doc.setTextColor(0);
      }

      doc.save(
        `${data.recipientName}_${data.year}년${MONTH_LABELS[data.month]}_식단리포트.pdf`
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      onClick={handleDownload}
      disabled={isLoading || generating || !data || data.daysWithRecord === 0}
    >
      <FileText className="h-4 w-4" />
      {generating
        ? "PDF 생성 중..."
        : data?.daysWithRecord === 0
          ? "기록 없음 (PDF 불가)"
          : `${MONTH_LABELS[month]} PDF 리포트 다운로드`}
    </Button>
  );
}
