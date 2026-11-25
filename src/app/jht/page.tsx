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
  Handshake,
  ShieldCheck,
  GraduationCap,
  MapPin,
  Clock,
  Mic,
  FileBadge,
  CalendarClock,
  RefreshCw,
  UserPlus,
} from "lucide-react";

type TabKey =
  | "ziyadah"
  | "murajaah"
  | "tasmi"
  | "halaqah"
  | "partner_alumni"
  | "admin_bph";
type HalaqahFilter = "thalibat" | "thullab";
type PartnerGenderFilter = "thalibat" | "thullab" | "alumni";

export default function JhtPreviewPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ziyadah");
  const [tikrarCount, setTikrarCount] = useState<number>(14);
  const [selectedTasmiJuz, setSelectedTasmiJuz] = useState<string>("5 Juz");
  const [halaqahFilter, setHalaqahFilter] = useState<HalaqahFilter>("thalibat");
  const [partnerFilter, setPartnerFilter] =
    useState<PartnerGenderFilter>("thalibat");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [examModeActive, setExamModeActive] = useState<boolean>(false);
  const [invitedPartners, setInvitedPartners] = useState<Record<string, boolean>>({});
  const [graduatedBatch, setGraduatedBatch] = useState<boolean>(false);
  const [assignedOprec, setAssignedOprec] = useState<boolean>(false);
  const [rolledSemester, setRolledSemester] = useState<boolean>(false);

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

  const toggleInvitePartner = (id: string) => {
    setInvitedPartners((prev) => ({ ...prev, [id]: !prev[id] }));
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
              Jami&apos;atul Huffazh Tazkia • Mutaba&apos;ah Mahasiswa &amp; Alumni
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
                  <path
                    d="M50 12V20"
                    stroke="#1B367C"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
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
                  Thalibah: <strong className="text-white">Aisyah Humaira</strong> (Akuntansi Syariah &apos;24) •{" "}
                  Halaqah Thalibat Al-Fath •{" "}
                  <strong className="text-[#B8F06D]">13 Juz Hafal</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExamModeActive((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
                  examModeActive
                    ? "bg-amber-400 text-[#0F1E3C] border-amber-300 shadow-sm"
                    : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>
                  {examModeActive
                    ? "Mode UTS/UAS Aktif (Streak Freeze)"
                    : "Aktifkan Mode UTS/UAS"}
                </span>
              </button>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 19 Hari Istiqamah
              </span>
            </div>
          </div>

          {examModeActive && (
            <div className="relative z-10 mt-3 rounded-2xl bg-amber-400/15 border border-amber-300/40 px-3.5 py-2.5 text-xs text-amber-100 flex items-center justify-between gap-2">
              <span>
                🎓 <strong>Mode Ujian Kampus (UTS/UAS/KKN) Aktif:</strong> Target Ziyadah harian di-pause sementara dan dialihkan ke Muraja&apos;ah ringan agar nilai akademik &amp; hafalan sama-sama terjaga tanpa memutus streak.
              </span>
            </div>
          )}

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

        {/* Navigation Segmented Tabs (6 Tabs: 3 Core + Halaqah + Partner & Alumni + Panel Admin BPH) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-[#DCE5F2] shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ziyadah")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "ziyadah"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
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
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
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
            <Award className="w-3.5 h-3.5 shrink-0" />
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
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>4. Halaqah Thullab/Thalibat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("partner_alumni")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "partner_alumni"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <Handshake className="w-3.5 h-3.5 shrink-0" />
            <span>5. Partner Simak &amp; Alumni</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin_bph")}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "admin_bph"
                ? "bg-[#1B367C] text-white shadow-sm"
                : "text-[#5A6B8C] hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>6. Panel Admin BPH</span>
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5A6B8C] font-semibold mt-2 pt-2 border-t border-[#E4F0CE]">
                  <span>
                    ✓ Validasi Peer-Simak: Sudah disimak oleh Fatimah Az-Zahra (Thalibah)
                  </span>
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
                  className="py-3 px-4 rounded-xl border border-[#DCE5F2] bg-white hover:bg-slate-50 text-[#1B367C] text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-4 h-4" />
                  <span>Kirim Voice Note Setoran (Jika Kuliah Bentrok)</span>
                </button>
                <button
                  type="button"
                  className="py-3 px-4 rounded-xl bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200] text-xs font-extrabold shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ajukan Setoran Tatap Muka ke Musyrif/Musyrifah</span>
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
                    Peta Kesehatan Hafalan 30 Juz (Aktif Seumur Hidup hingga Alumni)
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
                {[
                  "1 Juz",
                  "3 Juz",
                  "5 Juz",
                  "10 Juz",
                  "15 Juz",
                  "20 Juz",
                  "30 Juz",
                ].map((kat) => (
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
                ))}
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
                      3. E-Transkrip &amp; Sertifikat Tasmi&apos; QR-Verified (SKPI Kampus)
                    </div>
                    <div className="text-[11px] text-[#5A6B8C]">
                      Terbit otomatis setelah lulus ujian untuk lampiran SKPI &amp; Beasiswa Tazkia
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C]">
                    Siap Cetak
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                <button
                  type="button"
                  className="py-3 px-4 rounded-xl border border-[#DCE5F2] bg-white hover:bg-slate-50 text-[#1B367C] text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileBadge className="w-4 h-4" />
                  <span>Preview E-Transkrip Tahfizh (SKPI)</span>
                </button>
                <button
                  type="button"
                  className="py-3 px-4 rounded-xl bg-[#1B367C] hover:bg-[#13285E] text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Ajukan Pendaftaran Jadwal Sidang Tasmi&apos;
                </button>
              </div>
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
                        <span className="text-[#1B367C]">
                          (Thalibah • Akuntansi Syariah &apos;24 • 13 Juz)
                        </span>
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
                        <span className="text-[#1B367C]">
                          (Thalibah • Ekonomi Syariah &apos;23 • 18 Juz)
                        </span>
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
                        <span className="text-[#1B367C]">
                          (Thalibah • Bisnis Digital &apos;25 • 7 Juz)
                        </span>
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
                        <span className="text-[#1B367C]">
                          (Thalib • Ekonomi Syariah &apos;23 • 16 Juz)
                        </span>
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
                        <span className="text-[#1B367C]">
                          (Thalib • Muamalah &apos;22 • 25 Juz)
                        </span>
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
                        <span className="text-[#1B367C]">
                          (Thalib • Akuntansi Syariah &apos;25 • 9 Juz)
                        </span>
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

        {/* TAB 5: PARTNER SIMAK & ALUMNI */}
        {activeTab === "partner_alumni" && (
          <div className="space-y-3.5">
            {/* Bursa Partner Simak */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                    INTERAKSI ANTAR ANGGOTA • FILTER GENDER OTOMATIS
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                    Bursa Partner Simak (&ldquo;Cari Pasangan Setoran&rdquo;)
                  </h2>
                  <p className="text-xs text-[#5A6B8C]">
                    Temukan rekan Thalib/Thalibah yang sedang jam kosong kuliah untuk saling menyimak sebelum setor ke Musyrif.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPartnerFilter("thalibat")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      partnerFilter === "thalibat"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Thalibat (Akhwat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerFilter("thullab")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      partnerFilter === "thullab"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Thullab (Ikhwan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerFilter("alumni")}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                      partnerFilter === "alumni"
                        ? "bg-[#1B367C] text-white border-[#1B367C]"
                        : "bg-slate-100 text-[#475569] border-[#DCE5F2]"
                    }`}
                  >
                    Jaringan Alumni
                  </button>
                </div>
              </div>

              {partnerFilter === "thalibat" && (
                <div className="space-y-2.5 text-xs">
                  {[
                    {
                      id: "p1",
                      name: "Fatimah Az-Zahra",
                      meta: "Thalibah • Akuntansi Syariah '24 • 18 Juz",
                      loc: "Musholla Akhwat Kampus Utama",
                      time: "Hari ini, 12.30 – 13.30 WIB (Jeda Kuliah)",
                      target: "Target Simak: Muraja'ah Juz 5 (1/2 Juz Kedua)",
                    },
                    {
                      id: "p2",
                      name: "Nabila Khairunnisa",
                      meta: "Thalibah • Ekonomi Syariah '23 • 15 Juz",
                      loc: "Asrama Thalibat / Online GMeet",
                      time: "Ba'da Ashar, 16.00 – 17.00 WIB",
                      target: "Target Simak: Simulasi Pra-Tasmi' Juz 1–3",
                    },
                    {
                      id: "p3",
                      name: "Maryam Qonitah",
                      meta: "Thalibah • Bisnis Digital '25 • 6 Juz",
                      loc: "Perpustakaan Tazkia Lt. 2 (Area Akhwat)",
                      time: "Besok, 10.00 – 11.00 WIB",
                      target: "Target Simak: Ziyadah QS. Al-An'am Hal. 142",
                    },
                  ].map((item) => {
                    const isInvited = !!invitedPartners[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]"
                      >
                        <div className="space-y-1">
                          <div className="font-extrabold text-[#0F1E3C]">
                            {item.name}{" "}
                            <span className="text-[#1B367C]">({item.meta})</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A6B8C]">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#0F1E3C]">
                              <MapPin className="w-3.5 h-3.5 text-[#1B367C]" />
                              {item.loc}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#4E7A14]" />
                              {item.time}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-[#3B630A]">
                            {item.target}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleInvitePartner(item.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isInvited
                              ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                              : "bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200]"
                          }`}
                        >
                          {isInvited
                            ? "✓ Ajakan Terkirim"
                            : "Ajak Simak Bareng"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {partnerFilter === "thullab" && (
                <div className="space-y-2.5 text-xs">
                  {[
                    {
                      id: "m1",
                      name: "Muhammad Al-Fatih",
                      meta: "Thalib • Ekonomi Syariah '23 • 16 Juz",
                      loc: "Masjid Al-Birr Kampus Tazkia (Selasar Utama)",
                      time: "Ba'da Dzuhur, 12.15 – 13.15 WIB",
                      target: "Target Simak: Muraja'ah Juz 11 (1 Juz Penuh)",
                    },
                    {
                      id: "m2",
                      name: "Zaid bin Tsabit",
                      meta: "Thalib • Hukum Ekonomi Syariah '22 • 25 Juz",
                      loc: "Masjid Kampus / Online Voice Call",
                      time: "Ba'da Maghrib, 18.30 – 19.30 WIB",
                      target: "Target Simak: Persiapan Tasmi' 20 Juz (Juz 15–16)",
                    },
                  ].map((item) => {
                    const isInvited = !!invitedPartners[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]"
                      >
                        <div className="space-y-1">
                          <div className="font-extrabold text-[#0F1E3C]">
                            {item.name}{" "}
                            <span className="text-[#1B367C]">({item.meta})</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A6B8C]">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#0F1E3C]">
                              <MapPin className="w-3.5 h-3.5 text-[#1B367C]" />
                              {item.loc}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#4E7A14]" />
                              {item.time}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-[#3B630A]">
                            {item.target}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleInvitePartner(item.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isInvited
                              ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                              : "bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200]"
                          }`}
                        >
                          {isInvited
                            ? "✓ Ajakan Terkirim"
                            : "Ajak Simak Bareng"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {partnerFilter === "alumni" && (
                <div className="space-y-2.5 text-xs">
                  {[
                    {
                      id: "a1",
                      name: "Ustadzah Shafiyyah, S.E.",
                      meta: "Alumni JHT Angkatan 2020 • 30 Juz Mutqin",
                      loc: "Online via Zoom / WhatsApp Call",
                      time: "Sabtu & Ahad Pagi, 06.00 – 07.30 WIB",
                      target: "Bersedia Menyimak Adik Tingkat (Pra-Tasmi' & Partner Alumni)",
                    },
                    {
                      id: "a2",
                      name: "Akhdan Al-Ghifari, S.Ak.",
                      meta: "Alumni JHT Angkatan 2021 • 20 Juz",
                      loc: "Online GMeet (Sela Jam Kerja / Malam)",
                      time: "Senin & Kamis, 20.00 – 21.00 WIB",
                      target: "Cari Partner Simak Sesama Alumni Thullab (Juz 1–10)",
                    },
                  ].map((item) => {
                    const isInvited = !!invitedPartners[item.id];
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]"
                      >
                        <div className="space-y-1">
                          <div className="font-extrabold text-[#0F1E3C]">
                            {item.name}{" "}
                            <span className="text-[#1B367C]">({item.meta})</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A6B8C]">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#0F1E3C]">
                              <MapPin className="w-3.5 h-3.5 text-[#1B367C]" />
                              {item.loc}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#4E7A14]" />
                              {item.time}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-[#3B630A]">
                            {item.target}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleInvitePartner(item.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isInvited
                              ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                              : "bg-[#1B367C] hover:bg-[#13285E] text-white"
                          }`}
                        >
                          {isInvited
                            ? "✓ Jadwal Terkirim"
                            : "Jadwalkan Simak"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mode Alumni Seumur Hidup */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-[#1B367C]" />
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F1E3C]">
                  Mode Alumni Seumur Hidup (Lifetime Huffazh Tazkia)
                </h3>
              </div>
              <p className="text-xs text-[#5A6B8C] mb-3.5">
                Saat mahasiswa lulus wisuda, akun tidak dihapus melainkan otomatis berpindah ke{" "}
                <strong>Komunitas Alumni JHT</strong> agar hafalan tetap terjaga di dunia kerja.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    1. Peta Kesehatan 30 Juz Abadi
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Seluruh riwayat Ziyadah, Muraja&apos;ah, dan Sertifikat Tasmi&apos; selama kuliah tersimpan permanen.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    2. Keluar dari Kuota Halaqah Kampus
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Tidak membebani kuota Musyrif mahasiswa aktif, namun punya ruang halaqah daring khusus alumni.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    3. Badge &ldquo;Musyrif / Penguji Tamu&rdquo;
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Alumni yang mutqin 15–30 Juz dapat ikut menyimak adik-adik tingkat secara online saat pekan Tasmi&apos;.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div className="font-extrabold text-[#1B367C]">
                    4. Portofolio Syahadah QR-Verified
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Link verifikasi resmi JHT Tazkia untuk dilampirkan di CV, studi lanjut, atau beasiswa pascasarjana.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PANEL ADMIN BPH & KADERISASI */}
        {activeTab === "admin_bph" && (
          <div className="space-y-3.5">
            {/* Alur Siklus 4 Tahap */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <span className="text-[11px] font-extrabold text-[#1B367C] uppercase tracking-wider">
                MANAJEMEN SIKLUS ORGANISASI MAHASISWA
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F1E3C] mt-0.5">
                Bagaimana Admin BPH Mengelola Anggota yang Keluar-Masuk Tiap Tahun?
              </h2>
              <p className="text-xs text-[#5A6B8C] mb-3.5">
                Dirancang khusus untuk dinamika pergantian semester, Open Recruitment Maba, hingga wisuda di kampus Tazkia.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C] mb-1.5">
                    1. OPREC MABA
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Import &amp; Placement
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Maba daftar via link/CSV NIM, input nilai placement test, lalu auto-assign ke Halaqah.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C] mb-1.5">
                    2. TIAP SEMESTER
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Rolling Halaqah
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Pindah kelompok halaqah mengikuti jadwal KRS baru tanpa mereset riwayat juz sebelumnya.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF3FF] text-[#1B367C] mb-1.5">
                    3. KADERISASI
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Promosi Musyrif/BPH
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Angkat Thalib/Thalibah senior menjadi Musyrif atau serah-terima jabatan BPH baru 1 klik.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E2EBF6]">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAF7D8] text-[#3B630A] mb-1.5">
                    4. WISUDA
                  </span>
                  <div className="font-extrabold text-[#0F1E3C]">
                    Graduasi ke Alumni
                  </div>
                  <p className="text-[11px] text-[#5A6B8C] mt-1">
                    Luluskan angkatan akhir secara massal ke Mode Alumni tanpa menghapus akun mereka.
                  </p>
                </div>
              </div>
            </div>

            {/* Simulasi Aksi Massal Admin BPH */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DCE5F2] shadow-xs">
              <h3 className="text-sm font-extrabold text-[#0F1E3C] mb-1">
                Simulasi Aksi Cepat Admin BPH (Coba Klik Tombol di Bawah)
              </h3>
              <p className="text-xs text-[#5A6B8C] mb-3.5">
                Semua aksi tahunan dilakukan dalam hitungan detik tanpa perlu input ulang satu per satu.
              </p>

              <div className="space-y-2.5 text-xs">
                {/* Action 1: Oprec */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C] flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#1B367C]" />
                      <span>Oprec Angkatan Baru 2026 (78 Pendaftar Lulus Seleksi)</span>
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      38 Thullab (Ikhwan) &amp; 40 Thalibat (Akhwat) • Siap dibagi rata ke 8 Halaqah sesuai level juz
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignedOprec((v) => !v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      assignedOprec
                        ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                        : "bg-[#1B367C] hover:bg-[#13285E] text-white"
                    }`}
                  >
                    {assignedOprec
                      ? "✓ 8 Halaqah Terbentuk Otomatis"
                      : "Auto-Assign Halaqah"}
                  </button>
                </div>

                {/* Action 2: Rolling Semester */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C] flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-[#1B367C]" />
                      <span>Rolling Semester Baru (Ganjil → Genap 2026/2027)</span>
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      Sesuaikan ulang jadwal halaqah dengan KRS terbaru tanpa kehilangan progres 30 Juz mahasiswa
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRolledSemester((v) => !v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      rolledSemester
                        ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                        : "bg-[#1B367C] hover:bg-[#13285E] text-white"
                    }`}
                  >
                    {rolledSemester
                      ? "✓ Semester Baru Aktif"
                      : "Rolling Semester Baru"}
                  </button>
                </div>

                {/* Action 3: Graduasi Alumni */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E5ECF6]">
                  <div>
                    <div className="font-extrabold text-[#0F1E3C] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#4E7A14]" />
                      <span>Wisuda Angkatan 2022 (Semester 8 • 42 Mahasiswa)</span>
                    </div>
                    <div className="text-[11px] text-[#5A6B8C] mt-0.5">
                      Pindahkan massal dari Halaqah Mahasiswa Aktif ke Komunitas Alumni JHT (Akun tetap aktif selamanya)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGraduatedBatch((v) => !v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      graduatedBatch
                        ? "bg-[#EAF7D8] text-[#3B630A] border border-[#B6E080]"
                        : "bg-[#8CC63F] hover:bg-[#7cb532] text-[#0E2200]"
                    }`}
                  >
                    {graduatedBatch
                      ? "✓ 42 Mahasiswa Dipindah ke Alumni"
                      : "Luluskan Massal ke Alumni"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
