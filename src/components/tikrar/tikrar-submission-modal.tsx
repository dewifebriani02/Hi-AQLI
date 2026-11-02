"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Video,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Loader2,
  Users,
  Award,
} from "lucide-react";
import { useUser, useDoc, useCollection, db } from "@/db";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_TIKRAR_HALAQAHS } from "./tikrar-onboarding-modal";
import { cn } from "@/lib/utils";

interface TikrarSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
  currentJuz: number;
  availableRanges?: Array<{ id: string; label: string; description: string; points: number }>;
  defaultRange?: string;
  onSuccess?: () => void;
}

export function TikrarSubmissionModal({
  open,
  onOpenChange,
  currentPage,
  currentJuz,
  availableRanges,
  defaultRange = "blok_1_2",
  onSuccess,
}: TikrarSubmissionModalProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);

  // Ambil data halaqah pengguna
  const { data: dbHalaqahs } = useCollection("halaqahs", {
    filters: [{ column: "program_type", operator: "==", value: "tikrar_daily" }],
  });

  const activeHalaqahId = userData?.tikrar_halaqah_id || DEFAULT_TIKRAR_HALAQAHS[0].id;
  const halaqah = useMemo(() => {
    const found = dbHalaqahs?.find((h: any) => h.id === activeHalaqahId);
    if (found) return found;
    return DEFAULT_TIKRAR_HALAQAHS.find((h) => h.id === activeHalaqahId) || DEFAULT_TIKRAR_HALAQAHS[0];
  }, [activeHalaqahId, dbHalaqahs]);

  // Pilihan rentang blok setoran
  const ranges = useMemo(() => {
    if (availableRanges && availableRanges.length > 0) return availableRanges;
    return [
      {
        id: "blok_1_2",
        label: "1/2 Halaman (Blok A & B)",
        description: "Setoran 2 blok pertama. Minimal syarat kelulusan untuk membuka separuh halaman berikutnya.",
        points: 100,
      },
      {
        id: "blok_3_4",
        label: "1/2 Halaman (Blok C & D)",
        description: "Setoran 2 blok kedua (penyempurna 1 halaman mushaf).",
        points: 100,
      },
      {
        id: "blok_1_4",
        label: "1 Halaman Penuh (Blok A s/d D)",
        description: "Setoran 4 blok sekaligus secara bersambung tanpa putus.",
        points: 250,
      },
    ];
  }, [availableRanges]);

  const [selectedRange, setSelectedRange] = useState<string>(defaultRange);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedRangeObj = useMemo(() => {
    return ranges.find((r) => r.id === selectedRange) || ranges[0];
  }, [ranges, selectedRange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Perlu Login",
        description: "Silakan login terlebih dahulu untuk mengajukan setoran.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const payload = {
        user_id: user.id,
        user_name: userData?.username || user.user_metadata?.full_name || "Thalibah",
        halaqah_id: halaqah?.id || null,
        juz: currentJuz,
        page_number: currentPage,
        blocks_range: selectedRange,
        session_date: todayDate,
        zoom_meeting_url: halaqah?.zoom_link || null,
        status: "pending",
        notes: notes.trim() || null,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await db.from("tikrar_submissions").insert(payload);
      if (error) throw error;

      toast({
        title: "Pendaftaran Setoran Terkirim! 🎉",
        description: `Antrean setoran ${selectedRangeObj.label} Halaman ${currentPage} telah dicatat. Silakan bergabung ke sesi Live Zoom bersama Musyrifah.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Gagal mendaftar setoran:", err);
      toast({
        title: "Gagal Mengajukan Setoran",
        description: err.message || "Terjadi kesalahan teknis saat mengirim data setoran.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 border-[#800000]/20">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#800000] via-[#900000] to-[#5b0000] text-white p-6 relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-black/30 px-2.5 py-0.5 rounded-full">
              Kelas Tasmi' Interaktif
            </span>
            <Badge className="bg-emerald-600 text-white text-[9px] font-bold">Wajib Live Zoom</Badge>
          </div>
          <DialogTitle className="text-xl font-bold font-headline text-white tracking-tight">
            Daftar Antrean Setoran Live Zoom
          </DialogTitle>
          <DialogDescription className="text-white/80 text-xs mt-1 leading-relaxed">
            Halaman {currentPage} (Juz {currentJuz}) • Tasmi' langsung tatap muka virtual bersama Musyrifah.
          </DialogDescription>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info Jadwal Zoom Terpilih */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-700" />
                {halaqah?.schedule || halaqah?.title || "Halaqah Tikrar"}
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                {halaqah?.musyrifah || "Musyrifah Tikrar"}
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Setoran diselenggarakan <strong>secara langsung di ruang Zoom</strong> (tidak menerima voice note) untuk
              memastikan ketepatan tajwid, makhraj, dan kelancaran hafalan secara itqan.
            </p>
          </div>

          {/* Pilihan Rentang Blok Setoran */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Pilih Satuan Materi Setoran</span>
              <span className="text-[#800000] font-bold">Halaman {currentPage}</span>
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {ranges.map((r) => {
                const isSelected = selectedRange === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRange(r.id)}
                    className={cn(
                      "p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1.5",
                      isSelected
                        ? "bg-[#800000]/5 border-[#800000] shadow-2xs"
                        : "bg-card hover:bg-muted/40 border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center text-[10px]",
                            isSelected ? "bg-[#800000] text-white border-[#800000]" : "border-muted-foreground"
                          )}
                        >
                          {isSelected && "✓"}
                        </div>
                        <span className="font-bold text-xs text-foreground">{r.label}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-amber-700 border-amber-300">
                        +{r.points} Poin
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6 leading-relaxed">{r.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Catatan / Kesiapan untuk Musyrifah */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              Catatan Kesiapan untuk Musyrifah (Opsional)
            </label>
            <Textarea
              placeholder="Contoh: Sudah mengulang 40x di Blok A dan B, siap disimak di sesi malam ini..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[70px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold"
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold text-xs gap-2 px-6 h-10 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengirim Antrean...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" /> Masuk Antrean Setoran
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
