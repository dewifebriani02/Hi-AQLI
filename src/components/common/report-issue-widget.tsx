"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Flag, Send, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

export interface ReportModalPayload {
  moduleName?: string;
  category?: string;
  contextTitle?: string;
  contextExcerpt?: string;
}

const REPORT_CATEGORIES = [
  { id: "koreksi_konten", label: "Koreksi Ayat / Harakat / Terjemah / Materi" },
  { id: "koreksi_rujukan_ai", label: "Koreksi Jawaban / Rujukan Hi Asisten AQLI" },
  { id: "koreksi_kuis", label: "Koreksi Soal / Kunci Jawaban Kuis" },
  { id: "kendala_teknis", label: "Tombol / Audio / Halaman Error (Bug Teknis)" },
  { id: "saran_fitur", label: "Masukan & Saran Perbaikan" },
];

export function detectModuleNameFromPath(pathname: string | null): string {
  if (!pathname || pathname === "/") return "Dashboard Utama";
  if (pathname.startsWith("/tikrar/ujian")) return "Hi Tikrar • Ujian Halaman";
  if (pathname.startsWith("/tikrar/quiz")) return "Hi Tikrar • Kuis";
  if (pathname.startsWith("/tikrar")) return "Hi Tikrar (Hafalan & Mushaf)";
  if (pathname.startsWith("/mufradat/mabar")) return "Hi Mufradat • Mabar Kuis";
  if (pathname.startsWith("/mufradat/page")) return "Hi Mufradat • Belajar Per Halaman";
  if (pathname.startsWith("/mufradat/juz")) return "Hi Mufradat • Belajar & Ujian Juz";
  if (pathname.startsWith("/mufradat/billing")) return "Hi Mufradat • Infaq & Langganan";
  if (pathname.startsWith("/mufradat")) return "Hi Mufradat (Kosakata Al-Qur'an)";
  if (pathname.startsWith("/tilawah")) return "Hi Tilawah (Mushaf & Tadabbur)";
  if (pathname.startsWith("/ngaji")) return "Hi Ngaji (Tahsin & Kelas)";
  if (pathname.startsWith("/berbagi")) return "Hi Berbagi (Infaq & Kampanye)";
  if (pathname.startsWith("/mutabaah")) return "Hi Mutaba'ah (Amalan Harian)";
  if (pathname.startsWith("/muhasabah")) return "Hi Muhasabah (Evaluasi Diri)";
  if (pathname.startsWith("/sehat")) return "Hi Sehat (Thibbun Nabawi & Kesehatan)";
  if (pathname.startsWith("/matan")) return "Hi Matan (Kitab, Syarah & Kuis)";
  if (pathname.startsWith("/irab")) return "Hi I'rab (Bedah Nahwu Al-Qur'an & Kuis)";
  if (pathname.startsWith("/asisten")) return "Hi Asisten AQLI (Tanya Jawab Ilmiah)";
  if (pathname.startsWith("/umroh")) return "Hi Umroh (Paket & Panduan Ibadah)";
  if (pathname.startsWith("/study-circles")) return "Halaqah & Kelas Ilmu";
  if (pathname.startsWith("/tajweed")) return "Simulasi Tajwid";
  if (pathname.startsWith("/leaderboard")) return "Papan Juara (Leaderboard)";
  if (pathname.startsWith("/profile")) return "Profil Thalibah";
  if (pathname.startsWith("/programs")) return "Katalog Program";
  if (pathname.startsWith("/syarat-ketentuan")) return "Syarat & Ketentuan";
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

  const [isOpen, setIsOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [category, setCategory] = useState("koreksi_konten");
  const [contextTitle, setContextTitle] = useState("");
  const [contextExcerpt, setContextExcerpt] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const detectedModule = detectModuleNameFromPath(pathname);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ReportModalPayload>;
      const detail = custom.detail || {};
      setModuleName(detail.moduleName || detectModuleNameFromPath(window.location.pathname));
      setCategory(
        detail.category ||
          (window.location.pathname.startsWith("/asisten")
            ? "koreksi_rujukan_ai"
            : window.location.pathname.includes("/quiz") ||
                window.location.pathname.includes("/ujian") ||
                window.location.pathname.includes("/exam")
              ? "koreksi_kuis"
              : "koreksi_konten")
      );
      setContextTitle(detail.contextTitle || "");
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
    if (!description.trim() || description.trim().length < 4) {
      toast({
        title: "Deskripsi terlalu singkat",
        description: "Mohon jelaskan letak kesalahan atau kendala yang ditemukan.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_name: moduleName || detectedModule,
          page_path: typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname,
          category,
          context_title: contextTitle || null,
          context_excerpt: contextExcerpt || null,
          description: description.trim(),
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
        description: "Laporan kesalahan telah diterima oleh Tim Admin & Muallim Hi AQLI.",
      });
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 1400);
    } catch (err: any) {
      toast({
        title: "Gagal Mengirim Laporan",
        description: err?.message || "Silakan coba lagi beberapa saat lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-slate-200 bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-[#800000] to-[#550000] p-5 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Koreksi Konten &amp; Lapor Kendala
            </div>
            <DialogTitle className="text-lg font-black font-headline text-white">
              Laporkan Kesalahan di Modul Ini
            </DialogTitle>
            <DialogDescription className="text-xs text-white/80 leading-relaxed">
              Temukan salah ketik harakat/terjemah, kunci kuis, rujukan jawaban, atau tombol yang tidak berfungsi? Laporkan agar segera kami perbaiki.
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
              Jazakillahu khairan atas kontribusi menjaga ketepatan ilmu &amp; kenyamanan belajar di Hi AQLI.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Modul & Halaman Otomatis */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Modul yang Dilaporkan
                </span>
                <Badge variant="outline" className="text-[10px] font-bold border-[#800000]/20 text-[#800000] bg-white">
                  {pathname}
                </Badge>
              </div>
              <p className="text-xs font-black text-slate-800">{moduleName || detectedModule}</p>
              {contextTitle && (
                <p className="text-[11px] font-semibold text-[#800000] mt-0.5">
                  Bagian: {contextTitle}
                </p>
              )}
              {contextExcerpt && (
                <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-white p-2 rounded-xl border border-slate-100 mt-1">
                  &ldquo;{contextExcerpt}&rdquo;
                </p>
              )}
            </div>

            {/* Kategori Laporan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Jenis Laporan
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {REPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between",
                      category === cat.id
                        ? "border-[#800000] bg-[#800000]/5 text-[#800000] font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>{cat.label}</span>
                    {category === cat.id && <CheckCircle2 className="w-4 h-4 text-[#800000] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Lokasi Spesifik Opsional */}
            {!contextTitle && (
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Bagian / Ayat / Nomor Soal (Opsional)
                </label>
                <Input
                  value={contextTitle}
                  onChange={(e) => setContextTitle(e.target.value)}
                  placeholder="Contoh: Hal. 512 Blok B / Kuis Bab Al-Kalam Soal 2..."
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            )}

            {/* Detail Kesalahan */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Detail Kesalahan / Koreksi <span className="text-rose-600">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan letak kesalahan yang ditemukan beserta usulan perbaikan jika ada..."
                rows={3}
                required
                className="text-xs rounded-xl border-slate-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="rounded-xl bg-[#800000] hover:bg-[#600000] text-white text-xs font-black px-5 h-9"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Kirim Laporan
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
