"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Flag, Send, Loader2, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDoc, authFetch } from "@/db";
import { SURAH_MAP_STR } from "@/lib/quran-data";
import { cn } from "@/lib/utils";

export interface ReportModalPayload {
  moduleName?: string;
  category?: string;
  contextTitle?: string;
  contextExcerpt?: string;
}

export interface PageContextInfo {
  moduleName: string;
  contextLabel: string;
  sectionOptions: string[];
  issueOptions: { id: string; label: string }[];
}

export function getSmartPageContext(pathname: string | null): PageContextInfo {
  const path = pathname || "/";

  // 1. Hi Mufradat — Kuis Ayat: /mufradat/[id]/[verseId]/quiz
  const mufradatVerseQuiz = path.match(/^\/mufradat\/(\d+)\/(\d+)\/quiz/);
  if (mufradatVerseQuiz) {
    const surahNo = mufradatVerseQuiz[1];
    const ayatNo = mufradatVerseQuiz[2];
    const surahName = SURAH_MAP_STR[surahNo] || `Surah ${surahNo}`;
    return {
      moduleName: "Hi Mufradat • Kuis Ayat",
      contextLabel: `Kuis QS. ${surahName} (${surahNo}) : Ayat ${ayatNo}`,
      sectionOptions: [
        "Pertanyaan / Soal Kuis",
        "Lafazh Kata Arab / Harakat",
        "Pilihan Jawaban (A / B / C / D)",
        "Kunci Jawaban Benar / Skor",
        "Audio / Efek Suara Kuis",
        "Tampilan / Tombol Kuis",
      ],
      issueOptions: [
        { id: "koreksi_kuis", label: "Kunci jawaban atau arti kata keliru" },
        { id: "koreksi_konten", label: "Harakat / penulisan Arab kurang tepat" },
        { id: "kendala_teknis", label: "Tombol / halaman kuis tidak merespon" },
      ],
    };
  }

  // 2. Hi Mufradat — Detail Ayat: /mufradat/[id]/[verseId]
  const mufradatVerse = path.match(/^\/mufradat\/(\d+)\/(\d+)$/);
  if (mufradatVerse) {
    const surahNo = mufradatVerse[1];
    const ayatNo = mufradatVerse[2];
    const surahName = SURAH_MAP_STR[surahNo] || `Surah ${surahNo}`;
    return {
      moduleName: "Hi Mufradat • Kosakata Ayat",
      contextLabel: `QS. ${surahName} (${surahNo}) : Ayat ${ayatNo}`,
      sectionOptions: [
        "Teks Ayat Arab & Harakat",
        "Terjemah Ayat Lengkap",
        "Kartu Kosakata (Mufradat) Per Kata",
        "Arti Indonesia Per Kata",
        "Audio Tilawah Ayat",
        "Tombol Lanjut ke Kuis",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Arti mufradat / terjemah kurang tepat" },
        { id: "koreksi_konten_arab", label: "Penulisan Arab / harakat keliru" },
        { id: "kendala_teknis", label: "Audio atau tombol tidak berfungsi" },
      ],
    };
  }

  // 3. Hi Mufradat — Kuis Halaman: /mufradat/page/[id]/quiz
  const mufradatPageQuiz = path.match(/^\/mufradat\/page\/(\d+)\/quiz/);
  if (mufradatPageQuiz) {
    const pageNo = mufradatPageQuiz[1];
    return {
      moduleName: "Hi Mufradat • Kuis Halaman",
      contextLabel: `Kuis Mufradat Mushaf Halaman ${pageNo}`,
      sectionOptions: [
        "Soal Kata Arab di Halaman Ini",
        "Pilihan Jawaban Arti Kata",
        "Kunci Jawaban / Penilaian Skor",
        "Timer / Navigasi Soal",
      ],
      issueOptions: [
        { id: "koreksi_kuis", label: "Kunci jawaban / opsi kuis keliru" },
        { id: "koreksi_konten", label: "Harakat / teks Arab terpotong" },
        { id: "kendala_teknis", label: "Skor tidak tersimpan / tombol error" },
      ],
    };
  }

  // 4. Hi Mufradat — Belajar Halaman: /mufradat/page/[id]
  const mufradatPage = path.match(/^\/mufradat\/page\/(\d+)$/);
  if (mufradatPage) {
    const pageNo = mufradatPage[1];
    return {
      moduleName: "Hi Mufradat • Belajar Per Halaman",
      contextLabel: `Mushaf Mufradat Halaman ${pageNo}`,
      sectionOptions: [
        "Daftar Ayat di Halaman Ini",
        "Kosakata Per Kata & Arti",
        "Audio Murottal Halaman",
        "Tombol Mulai Kuis Halaman",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Arti kata / harakat kurang tepat" },
        { id: "kendala_teknis", label: "Audio / tombol tidak berfungsi" },
      ],
    };
  }

  // 5. Hi Mufradat — Ujian / Belajar Juz: /mufradat/juz/[id]
  const mufradatJuz = path.match(/^\/mufradat\/juz\/(\d+)(\/exam)?/);
  if (mufradatJuz) {
    const juzNo = mufradatJuz[1];
    const isExam = Boolean(mufradatJuz[2]);
    return {
      moduleName: isExam ? "Hi Mufradat • Ujian Juz" : "Hi Mufradat • Belajar Juz",
      contextLabel: `${isExam ? "Ujian" : "Materi"} Mufradat Juz ${juzNo}`,
      sectionOptions: isExam
        ? ["Soal Ujian Juz", "Pilihan Jawaban", "Kunci Jawaban & Skor", "Tombol Selesai Ujian"]
        : ["Daftar Halaman / Surah di Juz Ini", "Status Kelulusan Halaman", "Tombol Ujian Juz"],
      issueOptions: [
        { id: "koreksi_kuis", label: "Soal / kunci jawaban ujian keliru" },
        { id: "kendala_teknis", label: "Progres halaman / tombol tidak sesuai" },
      ],
    };
  }

  // 6. Hi Mufradat — Surah / Murajaah / Mabar / Utama
  const mufradatSurah = path.match(/^\/mufradat\/(\d+)(\/murajaah)?/);
  if (mufradatSurah) {
    const surahNo = mufradatSurah[1];
    const isMurajaah = Boolean(mufradatSurah[2]);
    const surahName = SURAH_MAP_STR[surahNo] || `Surah ${surahNo}`;
    return {
      moduleName: isMurajaah ? "Hi Mufradat • Muraja'ah Surah" : "Hi Mufradat • Daftar Ayat",
      contextLabel: `${isMurajaah ? "Muraja'ah" : "Daftar Ayat"} QS. ${surahName} (${surahNo})`,
      sectionOptions: [
        "Daftar Ayat & Status Lulus",
        "Kuis Muraja'ah / Flashcard",
        "Poin & Progres Surah",
        "Tombol Buka Ayat / Kuis",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Data ayat / arti kata tidak sesuai" },
        { id: "kendala_teknis", label: "Status lulus / tombol tidak merespon" },
      ],
    };
  }

  if (path.startsWith("/mufradat")) {
    return {
      moduleName: "Hi Mufradat (Kosakata Al-Qur'an)",
      contextLabel: path.includes("/mabar") ? "Hi Mufradat • Arena Mabar" : "Beranda Hi Mufradat",
      sectionOptions: [
        "Pilihan Mode (Per Halaman / Per Juz / Per Surah)",
        "Progres & Poin Mufradat",
        "Leaderboard / Grup Batch",
        "Mabar Kuis Mufradat",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Data halaman / surah kurang tepat" },
        { id: "kendala_teknis", label: "Halaman terkunci / tombol tidak berfungsi" },
      ],
    };
  }

  // 7. Hi Tikrar — Ujian / Kuis / Mushaf
  if (path.startsWith("/tikrar/ujian") || path.startsWith("/tikrar/quiz")) {
    return {
      moduleName: "Hi Tikrar • Ujian & Kuis Hafalan",
      contextLabel: "Evaluasi Ujian Halaman Hi Tikrar",
      sectionOptions: [
        "Soal Sambung Ayat / Urutan Blok",
        "Teks Arab & Harakat pada Soal",
        "Pilihan Jawaban & Kunci Jawaban",
        "Penilaian Skor Kelulusan",
      ],
      issueOptions: [
        { id: "koreksi_kuis", label: "Kunci jawaban / urutan ayat keliru" },
        { id: "koreksi_konten", label: "Teks Arab / harakat soal kurang tepat" },
        { id: "kendala_teknis", label: "Nilai ujian tidak tersimpan" },
      ],
    };
  }

  if (path.startsWith("/tikrar")) {
    return {
      moduleName: "Hi Tikrar (Hafalan & Mushaf)",
      contextLabel: "Halaman Metode Tikrar",
      sectionOptions: [
        "Tab Mushaf & Audio (Simak 5x / Counter TM 1–4 / Gabung)",
        "Pembagian Blok Ayat & Teks Mushaf",
        "Audio Qari & Pemutar Suara",
        "Tab Rekap & Keaktifan Grup",
        "Tab Target & Jadwal Harian",
        "Tab Peta Itqan 30 Juz & Setoran",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Ayat / blok / nomor halaman tidak sesuai" },
        { id: "kendala_teknis", label: "Counter klik / audio / kunci langkah bermasalah" },
        { id: "saran_fitur", label: "Jadwal / rekap harian tidak sinkron" },
      ],
    };
  }

  // 8. Hi Tilawah
  const tilawahVerse = path.match(/^\/tilawah\/(\d+)\/(\d+)/);
  if (tilawahVerse) {
    const surahNo = tilawahVerse[1];
    const ayatNo = tilawahVerse[2];
    const surahName = SURAH_MAP_STR[surahNo] || `Surah ${surahNo}`;
    return {
      moduleName: "Hi Tilawah • Tadabbur Ayat",
      contextLabel: `Tilawah QS. ${surahName} (${surahNo}) : Ayat ${ayatNo}`,
      sectionOptions: [
        "Teks Mushaf Ayat & Tajwid Warna",
        "Terjemah Bahasa Indonesia",
        "Audio Murottal Qari",
        "Tadabbur / Hikmah Ayat",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Teks Arab / warna tajwid / terjemah keliru" },
        { id: "kendala_teknis", label: "Audio murottal tidak berputar" },
      ],
    };
  }

  const tilawahSurah = path.match(/^\/tilawah\/(\d+)$/);
  if (tilawahSurah) {
    const surahNo = tilawahSurah[1];
    const surahName = SURAH_MAP_STR[surahNo] || `Surah ${surahNo}`;
    return {
      moduleName: "Hi Tilawah • Mushaf Surah",
      contextLabel: `Mushaf QS. ${surahName} (Surah ke-${surahNo})`,
      sectionOptions: [
        "Teks Ayat Arab & Harakat",
        "Kode Tajwid Warna",
        "Terjemah Ayat",
        "Pemutar Audio Qari",
        "Penanda Terakhir Baca (Bookmark)",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Harakat / tajwid warna / terjemah kurang tepat" },
        { id: "kendala_teknis", label: "Audio / bookmark tidak berfungsi" },
      ],
    };
  }

  if (path.startsWith("/tilawah")) {
    return {
      moduleName: "Hi Tilawah (Mushaf & Tadabbur)",
      contextLabel: path.includes("/juz/") ? `Tilawah ${path.replace("/tilawah/juz/", "Juz ")}` : "Daftar Surah & Juz Hi Tilawah",
      sectionOptions: [
        "Daftar Surah / Daftar Juz",
        "Teks Mushaf & Tajwid Warna",
        "Audio Murottal",
        "Penanda Terakhir Baca",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Harakat / terjemah / urutan ayat kurang tepat" },
        { id: "kendala_teknis", label: "Audio / halaman tidak terbuka" },
      ],
    };
  }

  // 9. Hi I'rab: /irab/[surahId]/[ayat]/quiz or /irab/[surahId]/[ayat]
  const irabMatch = path.match(/^\/irab\/(\d+)\/(\d+)(\/quiz)?/);
  if (irabMatch) {
    const surahNo = irabMatch[1];
    const ayatNo = irabMatch[2];
    const isQuiz = Boolean(irabMatch[3]);
    const surahName = SURAH_MAP_STR[surahNo] || `Surah ${surahNo}`;
    return {
      moduleName: isQuiz ? "Hi I'rab • Kuis I'rab Ayat" : "Hi I'rab • Bedah Nahwu Ayat",
      contextLabel: `${isQuiz ? "Kuis I'rab" : "Analisis I'rab"} QS. ${surahName} (${surahNo}) : Ayat ${ayatNo}`,
      sectionOptions: isQuiz
        ? [
            "Pertanyaan Kedudukan I'rab",
            "Pilihan Jawaban Nahwu/Shorof",
            "Kunci Jawaban & Pembahasan",
            "Skor & Papan Juara Kuis",
          ]
        : [
            "Teks Ayat & Pemenggalan Kata",
            "Kedudukan I'rab (Marfu' / Manshub / Majrur)",
            "Penjelasan Nahwu & Tanda I'rab",
            "Akar Kata (Shorof) & Makna Kata",
            "Tombol Lanjut Kuis I'rab",
          ],
      issueOptions: [
        { id: "koreksi_konten", label: "Penjelasan i'rab / kedudukan nahwu kurang tepat" },
        { id: "koreksi_kuis", label: "Kunci jawaban kuis i'rab keliru" },
        { id: "kendala_teknis", label: "Tombol / tampilan halaman bermasalah" },
      ],
    };
  }

  const irabSurahMatch = path.match(/^\/irab\/(\d+)$/);
  if (irabSurahMatch) {
    const surahNo = irabSurahMatch[1];
    const surahName = SURAH_MAP_STR.get(surahNo) || `Surah ${surahNo}`;
    return {
      moduleName: "Hi I'rab • Daftar Ayat Surah",
      contextLabel: `Daftar Ayat QS. ${surahName} (${surahNo})`,
      sectionOptions: [
        "Daftar Ayat dalam Surah",
        "Status Kelulusan Kuis",
        "Tombol Bedah Ayat / Kuis",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Data ayat / terjemah kurang tepat" },
        { id: "kendala_teknis", label: "Halaman ayat tidak terbuka" },
      ],
    };
  }

  if (path.startsWith("/irab")) {
    return {
      moduleName: "Hi I'rab (Bedah Nahwu Al-Qur'an)",
      contextLabel: "Katalog Surah & Ayat Hi I'rab",
      sectionOptions: [
        "Daftar Surah & Ayat Tersedia",
        "Pencarian Surah",
        "Tombol Buka Lab I'rab / Kuis",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Data ayat / penjelasan i'rab kurang tepat" },
        { id: "kendala_teknis", label: "Halaman ayat tidak terbuka" },
      ],
    };
  }

  // 10. Hi Matan: /matan/[slug]/[chapterId] or /matan/[slug] or /matan
  const matanChapter = path.match(/^\/matan\/([^/]+)\/([^/]+)/);
  if (matanChapter) {
    return {
      moduleName: "Hi Matan • Materi Bait, Syarah & Kuis",
      contextLabel: `Kitab ${matanChapter[1].toUpperCase()} • Bab ${matanChapter[2]}`,
      sectionOptions: [
        "Teks Bait Matan Arab & Harakat",
        "Terjemah Bait Matan",
        "Penjelasan Syarah Bait",
        "Contoh Ayat Al-Qur'an",
        "Soal & Kunci Jawaban Kuis Bab",
        "Audio Pembacaan Matan",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Harakat bait / terjemah / syarah kurang tepat" },
        { id: "koreksi_kuis", label: "Soal atau kunci jawaban kuis bab keliru" },
        { id: "kendala_teknis", label: "Audio atau tombol kuis tidak merespon" },
      ],
    };
  }

  if (path.startsWith("/matan")) {
    return {
      moduleName: "Hi Matan (Kitab, Syarah & Kuis)",
      contextLabel: "Kurikulum Kitab & Bab Hi Matan",
      sectionOptions: [
        "Tab Kitab & Syarah",
        "Tab Kurikulum Bab",
        "Tab Rekap & Evaluasi",
        "Status Kelulusan Bab & XP",
      ],
      issueOptions: [
        { id: "koreksi_konten", label: "Judul bab / deskripsi materi kurang tepat" },
        { id: "kendala_teknis", label: "Bab tidak bisa dibuka / progres tidak tersimpan" },
      ],
    };
  }

  // 11. Hi Asisten AQLI
  if (path.startsWith("/asisten")) {
    return {
      moduleName: "Hi Asisten AQLI (Rujukan Salafus Shalih)",
      contextLabel: "Majelis Tanya Jawab Ilmiah Hi Asisten AQLI",
      sectionOptions: [
        "Isi Jawaban / Penjelasan Tafsir",
        "Teks Ayat / Hadits Dalil yang Dikutip",
        "Penjelasan Kedudukan I'rab / Bahasa Arab",
        "Kutipan Kitab Rujukan Ulama Salaf",
        "Format Tampilan Jawaban",
      ],
      issueOptions: [
        { id: "koreksi_rujukan_ai", label: "Penjelasan / rujukan kitab kurang tepat" },
        { id: "koreksi_konten", label: "Harakat ayat / kutipan hadits kurang tepat" },
        { id: "kendala_teknis", label: "Pertanyaan lambat / gagal terkirim" },
      ],
    };
  }

  // 12. Modul Lainnya (Mutabaah, Muhasabah, Ngaji, Berbagi, Sehat, dll.)
  return {
    moduleName: detectModuleNameFromPath(path),
    contextLabel: detectModuleNameFromPath(path),
    sectionOptions: [
      "Teks / Konten Materi di Halaman Ini",
      "Tombol / Formulir Input",
      "Data Progres / Rekap Harian",
      "Tampilan di Layar HP / Tablet",
    ],
    issueOptions: [
      { id: "koreksi_konten", label: "Ada penulisan teks / konten yang keliru" },
      { id: "kendala_teknis", label: "Tombol / fitur tidak berfungsi semestinya" },
      { id: "saran_fitur", label: "Saran perbaikan tampilan / fitur" },
    ],
  };
}

export function detectModuleNameFromPath(pathname: string | null): string {
  if (!pathname || pathname === "/") return "Dashboard Utama";
  if (pathname.startsWith("/tikrar")) return "Hi Tikrar (Hafalan & Mushaf)";
  if (pathname.startsWith("/mufradat")) return "Hi Mufradat (Kosakata Al-Qur'an)";
  if (pathname.startsWith("/tilawah")) return "Hi Tilawah (Mushaf & Tadabbur)";
  if (pathname.startsWith("/ngaji")) return "Hi Ngaji (Tahsin & Kelas)";
  if (pathname.startsWith("/berbagi")) return "Hi Berbagi (Infaq & Kampanye)";
  if (pathname.startsWith("/mutabaah")) return "Hi Mutaba'ah (Amalan Harian)";
  if (pathname.startsWith("/muhasabah")) return "Hi Muhasabah (Evaluasi Diri)";
  if (pathname.startsWith("/sehat")) return "Hi Sehat (Thibbun Nabawi)";
  if (pathname.startsWith("/matan")) return "Hi Matan (Kitab, Syarah & Kuis)";
  if (pathname.startsWith("/irab")) return "Hi I'rab (Bedah Nahwu & Kuis)";
  if (pathname.startsWith("/asisten")) return "Hi Asisten AQLI (Tanya Jawab Ilmiah)";
  if (pathname.startsWith("/umroh")) return "Hi Umroh (Paket & Panduan Ibadah)";
  if (pathname.startsWith("/study-circles")) return "Halaqah & Kelas Ilmu";
  if (pathname.startsWith("/tajweed")) return "Simulasi Tajwid";
  if (pathname.startsWith("/leaderboard")) return "Papan Juara (Leaderboard)";
  if (pathname.startsWith("/profile")) return "Profil Thalibah";
  return "Aplikasi Hi AQLI";
}

export function openGlobalReportModal(payload?: ReportModalPayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-hiaqli-report", { detail: payload || {} }));
  }
}

export function ReportTriggerButton({
  label = "Laporkan",
  moduleName,
  category,
  contextTitle,
  contextExcerpt,
  className,
  variant = "outline",
  size = "sm",
}: {
  label?: string;
  moduleName?: string;
  category?: string;
  contextTitle?: string;
  contextExcerpt?: string;
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() =>
        openGlobalReportModal({
          moduleName,
          category,
          contextTitle,
          contextExcerpt,
        })
      }
      className={cn(
        "rounded-xl text-[11px] font-bold gap-1.5 border-rose-200/80 text-rose-800 hover:bg-rose-50 hover:text-[#800000]",
        className
      )}
    >
      <Flag className="w-3.5 h-3.5 text-[#800000]" />
      <span>{label}</span>
    </Button>
  );
}

export function GlobalReportWidget() {
  const pathname = usePathname();
  const { user } = useUser();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);
  const { toast } = useToast();

  const smartContext = useMemo(() => getSmartPageContext(pathname), [pathname]);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedIssueLabel, setSelectedIssueLabel] = useState<string>("");
  const [category, setCategory] = useState("koreksi_konten");
  const [customTitle, setCustomTitle] = useState("");
  const [contextExcerpt, setContextExcerpt] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ReportModalPayload>;
      const detail = custom.detail || {};
      const ctx = getSmartPageContext(window.location.pathname);

      setSelectedSection(detail.contextTitle || ctx.sectionOptions[0] || "");
      setSelectedIssueLabel(ctx.issueOptions[0]?.label || "");
      setCategory(detail.category || ctx.issueOptions[0]?.id || "koreksi_konten");
      setCustomTitle(detail.contextTitle || "");
      setContextExcerpt(detail.contextExcerpt || "");
      setDescription("");
      setIsSuccess(false);
      setIsOpen(true);
    };

    window.addEventListener("open-hiaqli-report", handler);
    return () => window.removeEventListener("open-hiaqli-report", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenSection = selectedSection || smartContext.sectionOptions[0] || smartContext.contextLabel;
    const chosenIssue = selectedIssueLabel || smartContext.issueOptions[0]?.label || "Koreksi konten";
    const fullContextTitle = `${smartContext.contextLabel} — ${chosenSection}`;
    const finalDescription = description.trim()
      ? `${chosenIssue}: ${description.trim()}`
      : chosenIssue;

    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_name: smartContext.moduleName,
          page_path: typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname,
          category,
          context_title: customTitle ? `${smartContext.contextLabel} • ${customTitle} (${chosenSection})` : fullContextTitle,
          context_excerpt: contextExcerpt || null,
          description: finalDescription,
          user_name: userData?.username || user?.user_metadata?.full_name || null,
          user_email: userData?.email || user?.email || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengirim laporan.");
      }

      setIsSuccess(true);
      toast({
        title: "Jazakillahu Khairan!",
        description: "Laporan telah diterima oleh Tim Admin & Muallim Hi AQLI.",
      });
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 1300);
    } catch (err: any) {
      toast({
        title: "Gagal Mengirim Laporan",
        description: err?.message || "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md max-h-[88vh] flex flex-col rounded-3xl p-0 overflow-hidden border-slate-200 bg-white shadow-2xl">
        {/* Compact Header */}
        <div className="bg-gradient-to-br from-[#800000] to-[#550000] px-5 py-4 text-white shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-black uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5" />
              {smartContext.moduleName}
            </div>
            <DialogTitle className="text-base sm:text-lg font-black font-headline text-white leading-snug">
              Laporkan: {smartContext.contextLabel}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-white/80">
              Tinggal pilih bagian di halaman ini yang keliru, lalu klik <strong>Kirim Laporan</strong>.
            </DialogDescription>
          </DialogHeader>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-slate-900">Laporan Berhasil Terkirim</h4>
            <p className="text-xs text-slate-500">
              Jazakillahu khairan, tim kami akan segera memeriksa bagian <strong>{selectedSection}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {contextExcerpt && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-2.5 text-[11px] text-slate-600 italic line-clamp-2">
                  &ldquo;{contextExcerpt}&rdquo;
                </div>
              )}

              {/* 1. Pilih Bagian di Halaman Ini (Chips — Tanpa perlu mengetik) */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#800000]" />
                  1. Pilih Bagian di Halaman Ini
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {smartContext.sectionOptions.map((sec) => {
                    const active = selectedSection === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSelectedSection(sec)}
                        className={cn(
                          "text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between gap-2",
                          active
                            ? "border-[#800000] bg-[#800000] text-white font-bold shadow-sm"
                            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <span className="leading-snug">{sec}</span>
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pilih Jenis Kendala */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  2. Apa Kendala yang Ditemukan?
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {smartContext.issueOptions.map((iss) => {
                    const active = selectedIssueLabel === iss.label;
                    return (
                      <button
                        key={iss.label}
                        type="button"
                        onClick={() => {
                          setSelectedIssueLabel(iss.label);
                          setCategory(iss.id);
                        }}
                        className={cn(
                          "text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between gap-2",
                          active
                            ? "border-[#800000] bg-[#800000]/10 text-[#800000] font-bold"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span>{iss.label}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-[#800000] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Catatan Detail (Opsional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    3. Keterangan Tambahan (Opsional)
                  </label>
                  <Badge variant="outline" className="text-[9px] font-semibold text-slate-400">
                    Boleh Dikosongkan
                  </Badge>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jika ingin menjelaskan lebih detail (misal: seharusnya harakat dhammah, atau soal nomor 3), tulis di sini..."
                  rows={2}
                  className="text-xs rounded-xl border-slate-200 resize-none"
                />
              </div>
            </div>

            {/* Sticky Submit Footer — Selalu terlihat tanpa terpotong layar */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-xl text-xs font-bold h-10 px-4"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#800000] hover:bg-[#600000] text-white text-xs font-black h-10 px-5 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" /> Kirim Laporan Sekarang
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
