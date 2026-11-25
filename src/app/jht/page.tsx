"use client";

import React, { useState } from "react";
import {
  BookOpen,
  RotateCcw,
  Award,
  Users,
  CheckCircle2,
  Flame,
  Share2,
  Check,
  Sparkles,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

type TabKey = "ziyadah" | "murajaah" | "tasmi" | "halaqah";
type HalaqahFilter = "thalibat" | "thullab";

export default function JhtPreviewPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ziyadah");
  const [tikrarCount, setTikrarCount] = useState<number>(14);
  const [selectedTasmiJuz, setSelectedTasmiJuz] = useState<string>("5 Juz");
  const [halaqahFilter, setHalaqahFilter] = useState<HalaqahFilter>("thalibat");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const tikrarTarget = 20;
  const tikrarPct = Math.min(100, Math.round((tikrarCount / tikrarTarget) * 100));

  const handleCopyShareLink = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? window.location.href
        : "https://hiaqli.pro/jht";
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const juzHealthList = [
    { juz: 1, status: "mutqin", label: "2h lalu" },
    { juz: 2, status: "mutqin", label: "3h lalu" },
    { juz: 3, status: "mutqin", label: "4h lalu" },
    { juz: 4, status: "mutqin", label: "1h lalu" },
    { juz: 5, status: "warning", label: "9h lalu" },
    { juz: 6, status: "warning", label: "11h lalu" },
    { juz: 7, status: "urgent", label: "16h lalu" },
    { juz: 8, status: "progress", label: "Ziyadah" },
    { juz: 26, status: "mutqin", label: "5h lalu" },
    { juz: 27, status: "mutqin", label: "6h lalu" },
    { juz: 28, status: "mutqin", label: "4h lalu" },
    { juz: 29, status: "mutqin", label: "2h lalu" },
    { juz: 30, status: "mutqin", label: "1h lalu" },
  ];

  const getJuzInfo = (juzNum: number) => {
    const found = juzHealthList.find((j) => j.juz === juzNum);
    return found || { juz: juzNum, status: "empty", label: "-" };
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#0F1E3C] pb-16 font-sans">
      {/* Top Preview Banner for Stakeholders */}
      <div className="bg-[#0F1E3C] text-white border-b border-white/10 px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#8CC63F] text-[#0F1E3C] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Preview UI Interaktif
            </span>
            <span className="text-xs text-slate-200 font-medium">
              Jami&apos;atul Huffazh Tazkia • Mutaba&apos;ah Digital
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer border border-white/15"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#8CC63F]" />
                <span>Link Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#8CC63F]" />
                <span>Salin Link Preview</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 space-y-4">
        {/* Hero Brand Card: Jami'atul Huffazh Tazkia */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B367C] via-[#13285E] to-[#0E1E47] text-white p-5 sm:p-6 shadow-xl border border-white/10">
          <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#8CC63F]/20 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {/* Custom SVG Logo matching Jami'atul Huffazh Tazkia Dome + Mushaf */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 100 100"
                  className="w-10 h-10 sm:w-11 sm:h-11"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Spire */}
                  <path d="M50 12V20" stroke="#1B367C" strokeWidth="3" strokeLinecap="round" />
                  {/* Left Dome Arch (Navy) */}
                  <path
                    d="M32 54C32 35 42 22 50 20C44 25 39 37 39 54H32Z"
                    fill="#1B367C"
                  />
                  {/* Right Dome Arch (Lime Green) */}
                  <path
                    d="M68 54C68 35 58 22 50 20C56 25 61 37 61 54H68Z"
                    fill="#8CC63F"
                  />
                  {/* Mushaf Pages (Lime Green) */}
                  <path
                    d="M20 62C30 58 42 60 50 67C58 60 70 58 80 62L77 56C67 53 57 55 50 62C43 55 33 53 23 56L20 62Z"
                    fill="#8CC63F"
                  />
                  {/* Mushaf Base Cover (Navy) */}
                  <path
                    d="M15 72C28 66 41 68 47 74C48.5 76 51.5 76 53 74C59 68 72 66 85 72L82 66C70 61 58 63 50 70C42 63 30 61 18 66L15 72Z"
                    fill="#1B367C"
                  />
                </svg>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8CC63F]/20 border border-[#8CC63F]/45 text-[#B8F06D] text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  Jami&apos;atul Huffazh Tazkia
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-snug">
                  Mutaba&apos;ah Tahfizh Al-Qur&apos;an
                </h1>
                <p className="text-xs text-slate-200/90 mt-0.5">
                  Thalibah: <strong className="text-white">Aisyah Humaira</strong> • Halaqah Thalibat Al-Fath •{" "}
                  <strong className="text-[#B8F06D]">13 Juz Hafal</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 19 Hari Istiqamah
              </span>
            </div>
          </div>

          {/* 3 Core Feature Quick Summary */}
          <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("ziyadah")}
              className={`text-left rounded-2xl p-3 transition-all border cursor-pointer ${
                activeTab === "ziyadah"
                  ? "bg-white/20 border-[#8CC63F]"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                1. Sesi Ziyadah
              </div>
              <div className="text-sm sm:text-base font-extrabold text-[#B8F06D] mt-0.5">
                Hal. 142
              </div>
              <div className="text-[11px] text-slate-200/85 truncate">
                QS. Al-An&apos;am: 111–118
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("murajaah")}
              className={`text-left rounded-2xl p-3 transition-all border cursor-pointer ${
                activeTab === "murajaah"
                  ? "bg-white/20 border-[#8CC63F]"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                2. Sesi Muraja&apos;ah
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                2 / 2 Sesi
              </div>
              <div className="text-[11px] text-slate-200/85 truncate">
                Qarib Juz 7 • Ba&apos;id Juz 2
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tasmi")}
              className={`text-left rounded-2xl p-3 transition-all border cursor-pointer ${
                activeTab === "tasmi"
                  ? "bg-white/20 border-[#8CC63F]"
                  : "bg-white/10 border-white/15 hover:bg-white/15"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-200">
                3. Target Tasmi&apos;
              </div>
              <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5">
                5 Juz (85%)
              </div>
              <div className="text-[11px] text-slate-200/85 truncate">
                Juz 1–5 • H-9 Ujian
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Segmented Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white p-1.5 rounded-2xl border border-[#DCE5F2] shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ziyadah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "ziyadah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Sesi Ziyadah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("murajaah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "murajaah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>2. Sesi Muraja&apos;ah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tasmi")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "tasmi"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>3. Target Tasmi&apos;</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("halaqah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "halaqah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Halaqah Thullab/Thalibat</span>
          </button>
        </div>

        {/* TAB 1: SESI ZIYADAH */}
        {activeTab === "ziyadah" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    SETORAN ZIYADAH HARI INI • JUZ 8
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                    QS. Al-An&apos;am (6) : Ayat 111 – 118
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Mushaf Madinah Halaman 142 • Target Harian: 1 Halaman (15 Baris)
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                  Tahap Tikrar Mandiri
                </span>
              </div>

              {/* Mushaf Preview Box */}
              <div className="rounded-2xl bg-[#FAFDF6] border border-[#D9EBB8] p-4 mb-4 text-right">
                <p
                  dir="rtl"
                  className="font-serif text-xl sm:text-2xl leading-loose text-[#12264B]"
                >
                  ۞ وَلَوْ أَنَّنَا نَزَّلْنَآ إِلَيْهِمُ ٱلْمَلَـٰٓئِكَةَ وَكَلَّمَهُمُ ٱلْمَوْتَىٰ وَحَشَرْنَا عَلَيْهِمْ كُلَّ شَىْءٍ قَبُلًا مَّا كَانُوا۟ لِيُؤْمِنُوٓا۟ إِلَّآ أَن يَشَآءَ ٱللَّهُ...
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#5A6B8C] font-semibold mt-2 pt-2 border-t border-[#E4F0CE]">
                  <span>Simak dengan Rekan (Thalib/Thalibah): Sudah 3x</span>
                  <span>Hal. 142 • Blok Penuh</span>
                </div>
              </div>

              {/* Interactive Tikrar Counter */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F4F7FB] rounded-2xl p-3.5 border border-[#DCE5F2]">
                <div>
                  <div className="text-[11px] font-extrabold text-[#5A6B8C] uppercase">
                    COUNTER TIKRAR ZIYADAH (WAJIB MIN. 20x)
                  </div>
                  <div className="text-2xl font-black text-[#1B367C] mt-0.5">
                    {tikrarCount} / {tikrarTarget}{" "}
                    <span className="text-xs font-bold text-[#4E7A14]">
                      ({tikrarPct}%)
                    </span>
                  </div>
                  <div className="w-44 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-[#1B367C] to-[#8CC63F] transition-all"
                      style={{ width: `${tikrarPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTikrarCount(0)}
                    className="px-3 py-2.5 rounded-xl border border-[#DCE5F2] bg-white text-xs font-extrabold text-[#5A6B8C] hover:bg-slate-50 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setTikrarCount((c) => c + 1)}
                    className="px-5 py-2.5 rounded-xl bg-[#1B367C] hover:bg-[#13285E] text-white text-sm font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    +1 Tikrar
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                <button
                  type="button"
                  className="py-3 px-4 rounded-xl border border-[#DCE5F2] bg-white hover:bg-slate-50 text-[#1B367C] text-xs font-extrabold cursor-pointer"
                >
                  Simpan Log Ziyadah Mandiri
                </button>
                <button
                  type="button"
                  className="py-3 px-4 rounded-xl bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200] text-xs font-extrabold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ajukan Setoran ke Musyrif/Musyrifah</span>
                </button>
              </div>
            </div>

            {/* Riwayat Setoran Ziyadah */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F1E3C]">
                    Riwayat Setoran Ziyadah Pekan Ini
                  </h3>
                  <p className="text-xs text-[#5A6B8C]">
                    Target Pekanan: 5 Halaman • Tercapai: 4 Halaman (80%)
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                  Jayyid Jiddan
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      Hal. 141 • QS. Al-An&apos;am: 102–110
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      Disimak Ustadzah Nabila • Kelancaran: 96% • Tajwid: Mumtaz
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                    Mumtaz (Lulus)
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      Hal. 140 • QS. Al-An&apos;am: 95–101
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      Disimak Ustadzah Nabila • Catatan: Perhatikan mad lazim ayat 99
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                    Jayyid Jiddan
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SESI MURAJA'AH */}
        {activeTab === "murajaah" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#4E7A14] uppercase tracking-wider">
                    SISTEM DUA LAPIS MURAJA&apos;AH JHT
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C]">
                    Jadwal Muraja&apos;ah Hari Ini
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                  1 / 2 Selesai
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Murajaah Qarib */}
                <div className="p-3.5 rounded-2xl bg-[#F7FBF1] border border-[#CBE6A3]">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                      MURAJA&apos;AH QARIB (DEKAT)
                    </span>
                    <span className="text-[11px] font-extrabold text-[#3B630A]">
                      ✓ Selesai
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-[#0F1E3C] mt-2">
                    Juz 7 • Hal. 135 – 141
                  </div>
                  <p className="text-xs text-[#5A6B8C] mt-0.5">
                    Pengikat hafalan baru 5–7 halaman terakhir sebelum tambah ziyadah.
                  </p>
                  <div className="mt-2.5 text-[11px] font-bold text-[#3B630A]">
                    Disetor ba&apos;da Shubuh • Lancar tanpa teguran
                  </div>
                </div>

                {/* Murajaah Ba'id */}
                <div className="p-3.5 rounded-2xl bg-[#FFFDF5] border border-[#F5DFA3]">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEF3C7] text-[#92400E]">
                      MURAJA&apos;AH BA&apos;ID (LAMA)
                    </span>
                    <span className="text-[11px] font-extrabold text-[#B45309]">
                      Menunggu Setor
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-[#0F1E3C] mt-2">
                    Juz 5 (An-Nisa&apos;) • 1/2 Juz Kedua
                  </div>
                  <p className="text-xs text-[#5A6B8C] mt-0.5">
                    Rotasi berkala juz yang sudah lulus agar siap diujikan saat Tasmi&apos;.
                  </p>
                  <button
                    type="button"
                    className="mt-2.5 w-full py-2 rounded-xl bg-[#1B367C] hover:bg-[#13285E] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Tandai Selesai Muraja&apos;ah Ba&apos;id
                  </button>
                </div>
              </div>
            </div>

            {/* Peta Kesehatan Hafalan 30 Juz */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F1E3C]">
                    Peta Kesehatan Hafalan 30 Juz
                  </h3>
                  <p className="text-xs text-[#5A6B8C]">
                    Otomatis mengingatkan juz yang belum dimuraja&apos;ah &gt; 7 hari
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#FEE2E2] text-[#991B1B]">
                  Juz 7 Perlu Segera Dimuraja&apos;ah
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px] text-[#5A6B8C] mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#8CC63F]" /> Mutqin (&lt;7 hr)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B]" /> Perlu Muraja&apos;ah (7–14 hr)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#EF4444]" /> Rawan Lupa (&gt;14 hr)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#1B367C]" /> Sedang Ziyadah
                </span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                  const info = getJuzInfo(juzNum);
                  let boxClass =
                    "bg-[#F1F5F9] border-[#E2E8F0] text-[#94A3B8]";
                  if (info.status === "mutqin") {
                    boxClass =
                      "bg-[#EAF7D8] border-[#B6E080] text-[#2F5206]";
                  } else if (info.status === "warning") {
                    boxClass =
                      "bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]";
                  } else if (info.status === "urgent") {
                    boxClass =
                      "bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]";
                  } else if (info.status === "progress") {
                    boxClass = "bg-[#1B367C] border-[#1B367C] text-white";
                  }

                  return (
                    <div
                      key={juzNum}
                      className={`rounded-xl p-2 text-center border ${boxClass}`}
                    >
                      <div className="text-xs font-extrabold">Juz {juzNum}</div>
                      <div className="text-[9px] font-semibold opacity-85 mt-0.5">
                        {info.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TARGET TASMI' */}
        {activeTab === "tasmi" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    TARGET &amp; KESIAPAN UJIAN TASMI&apos; SEKALI DUDUK
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                    Target Aktif: Tasmi&apos; {selectedTasmiJuz} (Juz 1 – 5)
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Jadwal Tasmi&apos;: Sabtu, 4 Desember 2026 • Penguji: Ustadzah Hafizhah, Lc.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#FEF3C7] text-[#92400E]">
                  H-9 Menuju Tasmi&apos;
                </span>
              </div>

              {/* Pilihan Kategori Tasmi */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["1 Juz", "3 Juz", "5 Juz", "10 Juz", "15 Juz", "20 Juz", "30 Juz"].map(
                  (kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setSelectedTasmiJuz(kat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
                        selectedTasmiJuz === kat
                          ? "bg-[#1B367C] text-white border-[#1B367C]"
                          : "bg-[#F1F5F9] text-[#475569] border-[#DCE5F2] hover:bg-slate-200/70"
                      }`}
                    >
                      Tasmi&apos; {kat}
                    </button>
                  )
                )}
              </div>

              {/* Indikator Kesiapan Tasmi */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F0F7E6] to-[#EAF3FF] border border-[#C5E0A5] mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1B367C]">
                    Indikator Kesiapan Tasmi&apos; (Syarat Minimal 3x Putaran Muraja&apos;ah)
                  </span>
                  <span className="text-base font-black text-[#3B630A]">
                    85% Siap
                  </span>
                </div>
                <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden my-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#1B367C] to-[#8CC63F]"
                    style={{ width: "85%" }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#334155] font-medium gap-1">
                  <span>✓ Juz 1–4 sudah 3x putaran muraja&apos;ah lancar</span>
                  <span className="font-bold text-[#92400E]">
                    • Juz 5 kurang 1x putaran simak rekan
                  </span>
                </div>
              </div>

              {/* Checklist Syarat Tasmi */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      1. Lulus Setoran Ziyadah Seluruh Halaman (Juz 1 – 5)
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      100 / 100 Halaman telah disahkan Musyrif/Musyrifah
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                    ✓ Terpenuhi
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      2. Putaran Simak Mandiri &amp; Partner (Min. 3x Putaran)
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      Juz 1 (3/3) • Juz 2 (3/3) • Juz 3 (3/3) • Juz 4 (3/3) • Juz 5 (2/3)
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FEF3C7] text-[#92400E]">
                    14 / 15 Putaran
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C]">
                      3. Pra-Tasmi&apos; (Mock Test 1 Juz Acak bersama Musyrif/Musyrifah)
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      Dijadwalkan Rabu, 1 Desember 2026
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                    Terjadwal
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mt-4 w-full py-3 rounded-xl bg-[#1B367C] hover:bg-[#13285E] text-white text-xs font-extrabold shadow-sm cursor-pointer"
              >
                Ajukan Pendaftaran Jadwal Sidang Tasmi&apos;
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: HALAQAH THULLAB & THALIBAT */}
        {activeTab === "halaqah" && (
          <div className="space-y-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    MONITORING MUSYRIF &amp; MUSYRIFAH JHT
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C]">
                    Rekap Halaqah Thullab &amp; Thalibat
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Gunakan istilah <strong>Thalib / Thalibah</strong> untuk perorangan &amp;{" "}
                    <strong>Thullab / Thalibat</strong> untuk kelompok halaqah.
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHalaqahFilter("thalibat")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      halaqahFilter === "thalibat"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Halaqah Thalibat (Akhwat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalaqahFilter("thullab")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      halaqahFilter === "thullab"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Halaqah Thullab (Ikhwan)
                  </button>
                </div>
              </div>

              {halaqahFilter === "thalibat" ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C]">
                        1. Aisyah Humaira{" "}
                        <span className="text-[#1B367C]">(Thalibah • 13 Juz)</span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Ziyadah: Hal. 142 (Proses) • Muraja&apos;ah: Juz 7 &amp; Juz 5 • Target Tasmi&apos; 5 Juz
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                      Aktif • 19h
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C]">
                        2. Fatimah Az-Zahra{" "}
                        <span className="text-[#1B367C]">(Thalibah • 18 Juz)</span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Ziyadah: Hal. 285 (Lulus Mumtaz) • Muraja&apos;ah: Juz 14 • Target Tasmi&apos; 10 Juz
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                      Siap Tasmi&apos;
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C]">
                        3. Khadijah Qonitah{" "}
                        <span className="text-[#1B367C]">(Thalibah • 7 Juz)</span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Belum setor ziyadah 2 hari • Muraja&apos;ah Juz 3 tertunda
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FEE2E2] text-[#991B1B]">
                      Perlu Follow-up
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C]">
                        1. Muhammad Al-Fatih{" "}
                        <span className="text-[#1B367C]">(Thalib • 16 Juz)</span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Ziyadah: Hal. 252 (Lulus Mumtaz) • Muraja&apos;ah: Juz 11 &amp; Juz 4 • Target Tasmi&apos; 10 Juz
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                      Aktif • 24h
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C]">
                        2. Zaid bin Tsabit{" "}
                        <span className="text-[#1B367C]">(Thalib • 25 Juz)</span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Ziyadah: Hal. 442 (Proses) • Muraja&apos;ah: Juz 20 • Target Tasmi&apos; 20 Juz
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                      Siap Tasmi&apos;
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                    <div>
                      <div className="font-extrabold text-[#0F1E3C]">
                        3. Abdullah Azzam{" "}
                        <span className="text-[#1B367C]">(Thalib • 9 Juz)</span>
                      </div>
                      <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                        Ziyadah: Hal. 164 (Jayyid Jiddan) • Muraja&apos;ah Juz 6 selesai
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A]">
                      Aktif • 12h
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
