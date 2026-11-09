"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/db";
import { authFetch } from "@/db/client";

interface JuzItqan {
  juz: number;
  totalPages: number;
  memorizedPages: number;
  testedPages: number;
}

interface ItqanData {
  juz: JuzItqan[];
  memorizedJuzCount: number;
  testedJuzCount: number;
  totalMemorizedPages: number;
  totalTestedPages: number;
}

const MEMORIZED_COLOR = "#D4AF37";
const TESTED_COLOR = "#800000";
const TOTAL_PAGES = 604;

/**
 * Itqan 30 Juz dua lapis:
 *  - lingkar dalam: halaman yang sudah dihafal (semua klik counter sampai Gabung A–D tuntas)
 *  - lingkar luar: halaman yang sudah diuji & dinyatakan lulus oleh muallimah
 */
export function HifzProgressChart({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { user } = useUser();
  const [data, setData] = useState<ItqanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await authFetch("/api/tikrar/itqan");
        const json = await res.json();
        if (!cancelled && res.ok) setData(json.data);
      } catch (e) {
        console.warn("Gagal memuat Itqan 30 Juz:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshSignal]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
      </div>
    );
  }

  const juzList: JuzItqan[] =
    data?.juz ||
    Array.from({ length: 30 }, (_, i) => ({ juz: i + 1, totalPages: 20, memorizedPages: 0, testedPages: 0 }));

  // Satu irisan per juz; bagian terisi sebanding dengan halaman
  const ringData = (key: "memorizedPages" | "testedPages") =>
    juzList.flatMap((j) => {
      const filled = j[key];
      return [
        { name: `Juz ${j.juz}`, value: filled, filled: true },
        { name: `Juz ${j.juz} sisa`, value: j.totalPages - filled, filled: false },
      ];
    });

  const memorizedPct = Math.round(((data?.totalMemorizedPages || 0) / TOTAL_PAGES) * 1000) / 10;
  const testedPct = Math.round(((data?.totalTestedPages || 0) / TOTAL_PAGES) * 1000) / 10;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col lg:flex-row items-center gap-10">
        <div className="relative w-64 h-64 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={ringData("memorizedPages")} cx="50%" cy="50%" innerRadius={68} outerRadius={88} dataKey="value" stroke="none" isAnimationActive={false}>
                {ringData("memorizedPages").map((e, i) => (
                  <Cell key={`m-${i}`} fill={e.filled ? MEMORIZED_COLOR : "#80000012"} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} className="fill-[#800000] text-3xl font-black">
                            {data?.totalMemorizedPages || 0}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="fill-[#800000] text-[9px] font-black uppercase tracking-[0.15em]">
                            Halaman Dihafal
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <Pie data={ringData("testedPages")} cx="50%" cy="50%" innerRadius={96} outerRadius={116} dataKey="value" stroke="none" isAnimationActive={false}>
                {ringData("testedPages").map((e, i) => (
                  <Cell key={`t-${i}`} fill={e.filled ? TESTED_COLOR : "#80000012"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#D4AF37]/15 border-2 border-[#D4AF37] space-y-1">
              <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest text-center">
                Lingkar Dalam • Dihafal
              </p>
              <p className="text-3xl font-black text-[#800000] text-center">
                {data?.memorizedJuzCount || 0} <span className="text-xs opacity-60">Juz</span>
              </p>
              <p className="text-[11px] font-bold text-stone-600 text-center">
                {data?.totalMemorizedPages || 0} hal. ({memorizedPct}%)
              </p>
            </div>
            <div className="p-5 rounded-3xl bg-[#800000] border-b-4 border-[#D4AF37] space-y-1 text-white">
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest text-center">
                Lingkar Luar • Sudah Diuji
              </p>
              <p className="text-3xl font-black text-center">
                {data?.testedJuzCount || 0} <span className="text-xs opacity-60">Juz</span>
              </p>
              <p className="text-[11px] font-bold text-white/80 text-center">
                {data?.totalTestedPages || 0} hal. ({testedPct}%)
              </p>
            </div>
          </div>
          <div className="space-y-2 bg-muted p-5 rounded-3xl border border-[#800000]/5">
            <h4 className="text-xs font-black text-[#800000] uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Cara Penghitungan
            </h4>
            <p className="text-sm text-black/70 leading-relaxed font-medium">
              <strong>Dihafal</strong> = halaman yang semua langkah klik counter sampai Gabung Seluruh Halaman (A–D)
              tuntas. <strong>Sudah diuji</strong> = halaman yang dinyatakan lulus setoran Tasmi&apos; oleh muallimah/admin.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-black font-headline uppercase text-[#800000]">Matriks Itqan</h4>
          <Badge className="bg-[#800000] text-white text-[9px] font-black tracking-widest">30 JUZ</Badge>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
          {juzList.map((j) => {
            const memFull = j.memorizedPages >= j.totalPages;
            const testFull = j.testedPages >= j.totalPages;
            return (
              <div
                key={j.juz}
                title={`Juz ${j.juz}: dihafal ${j.memorizedPages}/${j.totalPages} hal., diuji ${j.testedPages}/${j.totalPages} hal.`}
                className={cn(
                  "h-16 flex flex-col items-center justify-center rounded-2xl border-2 relative select-none overflow-hidden",
                  testFull
                    ? "bg-[#800000] border-[#D4AF37] text-white"
                    : memFull
                    ? "bg-[#D4AF37] border-[#800000] text-black"
                    : "bg-white border-[#800000]/10 text-muted-foreground"
                )}
              >
                <span className="text-[9px] font-black uppercase tracking-tighter">Juz</span>
                <span className="text-lg font-black leading-none">{j.juz}</span>
                {(j.memorizedPages > 0 || j.testedPages > 0) && !testFull && (
                  <span className="text-[8px] font-black mt-0.5">
                    {j.memorizedPages}/{j.testedPages}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                  <div style={{ width: `${(j.memorizedPages / j.totalPages) * 100}%`, backgroundColor: MEMORIZED_COLOR }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground px-1">
          Angka kecil = halaman dihafal / halaman sudah diuji. Emas = 1 juz penuh dihafal, merah marun = 1 juz penuh lulus diuji.
        </p>
      </div>
    </div>
  );
}
