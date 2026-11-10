"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/db";
import { authFetch } from "@/db/client";
import { TikrarPriorHafalanForm } from "@/components/tikrar/tikrar-prior-hafalan-form";

interface JuzItqan {
  juz: number;
  totalPages: number;
  memorizedPages: number;
  priorPages: number;
  testedPages: number;
  externalTestedPages: number;
  mutqinPages: number;
}

interface ItqanData {
  juz: JuzItqan[];
  memorizedJuzCount: number;
  testedJuzCount: number;
  totalMemorizedPages: number;
  totalAppMemorizedPages: number;
  totalPriorPages: number;
  totalTestedPages: number;
  totalAqliTestedPages: number;
  totalExternalTestedPages: number;
  mutqinJuzCount: number;
  totalMutqinPages: number;
}

const MEMORIZED_COLOR = "#D4AF37";
const PRIOR_COLOR = "#f1dd9a";
const TESTED_COLOR = "#800000";
const EXTERNAL_COLOR = "#c08a5b";
const MUTQIN_COLOR = "#047857";
const EMPTY_COLOR = "#80000012";
const TOTAL_PAGES = 604;

/**
 * Itqan 30 Juz tiga lapis:
 *  - lingkar luar: halaman dihafal (klik counter sampai Gabung A–D tuntas + hafalan sebelum bergabung)
 *  - lingkar tengah: halaman sudah diuji (Tasmi' muallimah AQLI + diuji di luar AQLI)
 *  - lingkar dalam: halaman mutqin (lulus ujian 30 soal dan lulus Tasmi')
 */
export function HifzProgressChart({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { user } = useUser();
  const [data, setData] = useState<ItqanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [user?.id, refreshSignal, reloadKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
      </div>
    );
  }

  const juzList: JuzItqan[] =
    data?.juz ||
    Array.from({ length: 30 }, (_, i) => ({
      juz: i + 1,
      totalPages: 20,
      memorizedPages: 0,
      priorPages: 0,
      testedPages: 0,
      externalTestedPages: 0,
      mutqinPages: 0,
    }));

  // Satu irisan per juz: bagian via AQLI, bagian hafalan lama/luar AQLI, lalu sisa
  const ringData = (primary: "memorizedPages" | "testedPages", secondary: "priorPages" | "externalTestedPages", colors: [string, string]) =>
    juzList.flatMap((j) => [
      { name: `Juz ${j.juz}`, value: j[primary], fill: colors[0] },
      { name: `Juz ${j.juz} lama`, value: j[secondary], fill: colors[1] },
      { name: `Juz ${j.juz} sisa`, value: Math.max(0, j.totalPages - j[primary] - j[secondary]), fill: EMPTY_COLOR },
    ]);
  const memorizedRing = ringData("memorizedPages", "priorPages", [MEMORIZED_COLOR, PRIOR_COLOR]);
  const testedRing = ringData("testedPages", "externalTestedPages", [TESTED_COLOR, EXTERNAL_COLOR]);
  const mutqinRing = juzList.flatMap((j) => [
    { name: `Juz ${j.juz}`, value: j.mutqinPages, fill: MUTQIN_COLOR },
    { name: `Juz ${j.juz} sisa`, value: Math.max(0, j.totalPages - j.mutqinPages), fill: EMPTY_COLOR },
  ]);

  const memorizedPct = Math.round(((data?.totalMemorizedPages || 0) / TOTAL_PAGES) * 1000) / 10;
  const testedPct = Math.round(((data?.totalTestedPages || 0) / TOTAL_PAGES) * 1000) / 10;
  const mutqinPct = Math.round(((data?.totalMutqinPages || 0) / TOTAL_PAGES) * 1000) / 10;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col lg:flex-row items-center gap-10">
        <div className="relative w-64 h-64 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={mutqinRing} cx="50%" cy="50%" innerRadius={56} outerRadius={72} dataKey="value" stroke="none" isAnimationActive={false}>
                {mutqinRing.map((e, i) => (
                  <Cell key={`q-${i}`} fill={e.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} className="fill-[#800000] text-3xl font-black">
                            {data?.totalMemorizedPages || 0}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} className="fill-[#800000] text-[8px] font-black uppercase tracking-[0.12em]">
                            Hal. Dihafal
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <Pie data={testedRing} cx="50%" cy="50%" innerRadius={78} outerRadius={94} dataKey="value" stroke="none" isAnimationActive={false}>
                {testedRing.map((e, i) => (
                  <Cell key={`t-${i}`} fill={e.fill} />
                ))}
              </Pie>
              <Pie data={memorizedRing} cx="50%" cy="50%" innerRadius={100} outerRadius={118} dataKey="value" stroke="none" isAnimationActive={false}>
                {memorizedRing.map((e, i) => (
                  <Cell key={`m-${i}`} fill={e.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl bg-[#D4AF37]/15 border-2 border-[#D4AF37] space-y-1">
              <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest text-center">
                Lingkar Luar • Dihafal
              </p>
              <p className="text-3xl font-black text-[#800000] text-center">
                {data?.memorizedJuzCount || 0} <span className="text-xs opacity-60">Juz</span>
              </p>
              <p className="text-[11px] font-bold text-stone-600 text-center">
                {data?.totalMemorizedPages || 0} hal. ({memorizedPct}%)
              </p>
              <p className="text-[10px] text-stone-500 text-center">
                AQLI {data?.totalAppMemorizedPages || 0} • lama {data?.totalPriorPages || 0}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-[#800000] border-b-4 border-[#D4AF37] space-y-1 text-white">
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest text-center">
                Lingkar Tengah • Diuji
              </p>
              <p className="text-3xl font-black text-center">
                {data?.testedJuzCount || 0} <span className="text-xs opacity-60">Juz</span>
              </p>
              <p className="text-[11px] font-bold text-white/80 text-center">
                {data?.totalTestedPages || 0} hal. ({testedPct}%)
              </p>
              <p className="text-[10px] text-white/70 text-center">
                AQLI {data?.totalAqliTestedPages || 0} • luar AQLI {data?.totalExternalTestedPages || 0}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-emerald-50 border-2 border-emerald-600 space-y-1">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest text-center">
                Lingkar Dalam • Mutqin
              </p>
              <p className="text-3xl font-black text-emerald-800 text-center">
                {data?.mutqinJuzCount || 0} <span className="text-xs opacity-60">Juz</span>
              </p>
              <p className="text-[11px] font-bold text-stone-600 text-center">
                {data?.totalMutqinPages || 0} hal. ({mutqinPct}%)
              </p>
              <p className="text-[10px] text-stone-500 text-center">Lulus ujian 30 soal + Tasmi&apos;</p>
            </div>
          </div>
          <div className="space-y-2 bg-muted p-5 rounded-3xl border border-[#800000]/5">
            <h4 className="text-xs font-black text-[#800000] uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Cara Penghitungan
            </h4>
            <p className="text-sm text-black/70 leading-relaxed font-medium">
              <strong>Dihafal</strong> (lingkar luar) = semua langkah klik counter sampai Gabung Seluruh Halaman (A–D)
              tuntas (emas), ditambah hafalan sebelum bergabung (emas muda). <strong>Diuji</strong> (lingkar tengah) =
              lulus setoran Tasmi&apos; oleh muallimah AQLI (marun), ditambah yang diuji di luar AQLI (cokelat muda).{' '}
              <strong>Mutqin</strong> (lingkar dalam, hijau) = lulus ujian 30 soal <em>dan</em> lulus Tasmi&apos;.
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
            const memAll = j.memorizedPages + j.priorPages;
            const testAll = j.testedPages + j.externalTestedPages;
            const memFull = memAll >= j.totalPages;
            const testFull = testAll >= j.totalPages;
            return (
              <div
                key={j.juz}
                title={`Juz ${j.juz}: dihafal ${memAll}/${j.totalPages} hal. (lama ${j.priorPages}), diuji ${testAll}/${j.totalPages} hal. (luar AQLI ${j.externalTestedPages})`}
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
                {(memAll > 0 || testAll > 0) && !testFull && (
                  <span className="text-[8px] font-black mt-0.5">
                    {memAll}/{testAll}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                  <div style={{ width: `${(j.memorizedPages / j.totalPages) * 100}%`, backgroundColor: MEMORIZED_COLOR }} />
                  <div style={{ width: `${(j.priorPages / j.totalPages) * 100}%`, backgroundColor: PRIOR_COLOR }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground px-1">
          Angka kecil = halaman dihafal / halaman sudah diuji. Emas = 1 juz penuh dihafal, merah marun = 1 juz penuh lulus diuji.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-stone-600 px-1">
          {[
            [MEMORIZED_COLOR, "Dihafal via AQLI"],
            [PRIOR_COLOR, "Hafalan lama"],
            [TESTED_COLOR, "Diuji muallimah AQLI"],
            [EXTERNAL_COLOR, "Diuji di luar AQLI"],
            [MUTQIN_COLOR, "Mutqin"],
          ].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <TikrarPriorHafalanForm onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
