"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Send,
  Loader2,
  BookOpen,
  Eye,
  EyeOff,
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useUser, useDoc, useCollection, db } from "@/db";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TikrarDailyReportCardProps {
  currentPage?: number;
  currentJuz?: number;
  onReportSubmitted?: () => void;
}

export function TikrarDailyReportCard({
  currentPage = 582,
  currentJuz = 30,
  onReportSubmitted,
}: TikrarDailyReportCardProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);

  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  // Fetch today's log if it exists
  const { data: existingLogs, mutate: refreshLogs } = useCollection("tikrar_daily_logs", {
    filters: [
      { column: "user_id", operator: "==", value: user?.id },
      { column: "log_date", operator: "==", value: todayStr },
    ],
  });

  const todayLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

  // Form State
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(["A", "B"]);
  const [bithNadharChecked, setBithNadharChecked] = useState<boolean>(true);
  const [bilGhaibChecked, setBilGhaibChecked] = useState<boolean>(true);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  useEffect(() => {
    if (todayLog) {
      if (Array.isArray(todayLog.blocks_completed)) {
        // Bisa berisi nomor [1, 2] atau huruf ["A", "B"]
        const blocks = todayLog.blocks_completed.map((b: any) =>
          typeof b === "number" ? ["A", "B", "C", "D"][b - 1] || "A" : String(b)
        );
        setSelectedBlocks(blocks);
      }
      setDurationMinutes(todayLog.duration_minutes || 30);
      setNotes(todayLog.notes || "");
    }
  }, [todayLog]);

  const toggleBlock = (block: string) => {
    if (selectedBlocks.includes(block)) {
      if (selectedBlocks.length > 1) {
        setSelectedBlocks(selectedBlocks.filter((b) => b !== block));
      }
    } else {
      setSelectedBlocks([...selectedBlocks, block].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Perlu Login",
        description: "Silakan login untuk mengirim laporan harian Tikrar.",
        variant: "destructive",
      });
      return;
    }

    if (!bithNadharChecked || !bilGhaibChecked) {
      toast({
        title: "Syarat 40x Repetisi",
        description: "Metode Tikrar mensyaratkan 20x melihat mushaf dan 20x tanpa melihat untuk mencapai itqan.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Map block letters to numeric [1, 2, 3, 4]
      const blockNumbers = selectedBlocks.map((b) => {
        if (b === "A") return 1;
        if (b === "B") return 2;
        if (b === "C") return 3;
        return 4;
      });

      const logPayload = {
        user_id: user.id,
        halaqah_id: userData?.tikrar_halaqah_id || null,
        log_date: todayStr,
        juz: currentJuz,
        page_number: currentPage,
        blocks_completed: blockNumbers,
        repetition_count: 40,
        duration_minutes: Number(durationMinutes) || 30,
        completed: true,
        notes: notes.trim() || null,
        created_at: todayLog?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await db.from("tikrar_daily_logs").upsert(logPayload);
      if (error) throw error;

      // Berikan reward poin harian (+20 poin) ke profil pengguna jika belum pernah
      try {
        const currentPoints = Number(userData?.points || 0);
        await db.from("users").update({
          points: currentPoints + 20,
          tikrar_current_page: Math.max(Number(userData?.tikrar_current_page || 0), currentPage),
        }).eq("id", user.id);
      } catch (ptsErr) {
        console.warn("Points update notice:", ptsErr);
      }

      toast({
        title: "Laporan Harian Berhasil Dikirim! 🎉",
        description: `Tuntas 40x repetisi Halaman ${currentPage} (Blok ${selectedBlocks.join(", ")}). Kotak hijau Anda di Heatmap Grup telah menyala!`,
      });

      setIsEditMode(false);
      refreshLogs();
      if (onReportSubmitted) onReportSubmitted();
    } catch (err: any) {
      console.error("Failed to submit daily log:", err);
      toast({
        title: "Gagal Mengirim Laporan",
        description: err.message || "Terjadi kesalahan saat menyimpan log harian ke database.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Jika sudah lapor hari ini dan tidak dalam mode edit
  if (todayLog && !isEditMode) {
    const blocksDisplay = Array.isArray(todayLog.blocks_completed)
      ? todayLog.blocks_completed
          .map((b: any) => (typeof b === "number" ? ["A", "B", "C", "D"][b - 1] : b))
          .join(", ")
      : "A, B";

    return (
      <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 shadow-sm overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">Laporan Hari Ini Telah Tuntas!</h3>
                  <Badge className="bg-emerald-600 text-white text-[9px] font-black tracking-wider uppercase">
                    40X SELESAI
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{todayFormatted}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="text-xs font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-100/50 h-8 self-start sm:self-auto"
            >
              Ubah Laporan
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Halaman Target</span>
              <p className="text-sm font-black text-[#800000] mt-0.5">Hal. {todayLog.page_number} (Juz {todayLog.juz})</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Blok Repetisi</span>
              <p className="text-sm font-black text-emerald-700 mt-0.5">Blok {blocksDisplay}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Metode Itqan</span>
              <p className="text-sm font-black text-foreground mt-0.5">20x + 20x (40x)</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Durasi Latihan</span>
              <p className="text-sm font-black text-foreground mt-0.5">{todayLog.duration_minutes || 30} Menit</p>
            </div>
          </div>

          {todayLog.notes && (
            <div className="bg-white/80 p-3 rounded-xl border text-xs text-muted-foreground italic">
              &ldquo;{todayLog.notes}&rdquo;
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100/60 px-3 py-2 rounded-lg">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Kotak hijau Anda di Heatmap Grup aktif • Poin keaktifan +20 poin tersimpan.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form Pengisian Laporan Harian
  return (
    <Card className="border-2 border-[#800000]/20 bg-card shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#800000]/5 via-white to-[#800000]/5 border-b p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#800000] bg-[#800000]/10 px-2 py-0.5 rounded-full">
                Laporan Harian
              </span>
              <span className="text-xs font-bold text-muted-foreground">{todayFormatted}</span>
            </div>
            <CardTitle className="text-lg font-bold font-headline text-foreground">
              Formulir Repetisi 40x Hari Ini
            </CardTitle>
          </div>

          <Badge variant="outline" className="text-[10px] font-bold text-[#800000] border-[#800000]/30 self-start sm:self-auto">
            Target Halaman {currentPage}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pilihan Blok yang Diselesaikan */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>1. Blok yang Diulang Hari Ini (Minimal 1 Blok)</span>
              <span className="text-[#800000] font-bold">Halaman {currentPage}</span>
            </label>

            <div className="grid grid-cols-4 gap-3">
              {["A", "B", "C", "D"].map((block) => {
                const isSelected = selectedBlocks.includes(block);
                return (
                  <button
                    key={block}
                    type="button"
                    onClick={() => toggleBlock(block)}
                    className={cn(
                      "h-14 rounded-xl border-2 font-bold text-sm flex flex-col items-center justify-center transition-all",
                      isSelected
                        ? "bg-[#800000] text-white border-[#800000] shadow-sm"
                        : "bg-card hover:bg-muted/50 border-border text-foreground"
                    )}
                  >
                    <span className="text-[9px] uppercase opacity-70">Blok</span>
                    <span className="text-base font-black">{block}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tip: Menuntaskan minimal <strong>2 Blok (1/2 Halaman)</strong> membuka akses ke antrean Kelas Setoran Live Zoom bersama Musyrifah.
            </p>
          </div>

          {/* Konfirmasi Repetisi 40x (20x Bith-Nadhar + 20x Bil-Ghaib) */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              2. Checklist Manhaj Repetisi Itqan 40x
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all",
                  bithNadharChecked ? "bg-emerald-50/60 border-emerald-400" : "bg-card border-border"
                )}
              >
                <input
                  type="checkbox"
                  checked={bithNadharChecked}
                  onChange={(e) => setBithNadharChecked(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">20x Bith-Nadhar</p>
                    <p className="text-[10px] text-muted-foreground">Membaca dengan melihat mushaf</p>
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  "p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all",
                  bilGhaibChecked ? "bg-emerald-50/60 border-emerald-400" : "bg-card border-border"
                )}
              >
                <input
                  type="checkbox"
                  checked={bilGhaibChecked}
                  onChange={(e) => setBilGhaibChecked(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="flex items-center gap-2.5">
                  <EyeOff className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">20x Bil-Ghaib</p>
                    <p className="text-[10px] text-muted-foreground">Membaca hafalan tanpa melihat</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Durasi & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#800000]" /> Durasi Latihan (Menit)
              </label>
              <Input
                type="number"
                min={5}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="h-10 text-xs font-bold"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="text-xs font-bold text-foreground">
                Catatan / Refleksi Ayat (Opsional)
              </label>
              <Input
                placeholder="Contoh: Lancar di baris 1-7, perlu hati-hati di sambungan akhir ayat..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            {isEditMode ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditMode(false)}
                className="text-xs font-bold text-muted-foreground"
              >
                Batal
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                +20 Poin keaktifan tersimpan
              </span>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || selectedBlocks.length === 0}
              className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold text-xs gap-2 px-6 h-10 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Kirim Laporan Hari Ini
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
