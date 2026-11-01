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
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Video,
  Users,
  Compass,
  ArrowRight,
  Flame,
  Check,
  CalendarDays,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useUser, useDoc, useCollection, db } from "@/db";
import { useToast } from "@/hooks/use-toast";
import { JUZ_PAGE_MAPPING } from "@/lib/quran-mapping";
import { QURAN_CHAPTERS } from "@/lib/quran-data";
import { cn } from "@/lib/utils";

// Official 3 Halaqah Zoom sessions (synced with migration 20261101_tikrar_schema.sql)
export const DEFAULT_TIKRAR_HALAQAHS = [
  {
    id: "a1111111-1111-4000-8000-000000000001",
    title: "Hi Tikrar - Sesi Fajar (05:30 - 06:30 WIB)",
    session_label: "Sesi Fajar / Subuh",
    time: "05:30 - 06:30 WIB",
    days: "Senin - Jumat",
    icon: "🌅",
    musyrifah: "Ustadzah Fatimah • Musyrifah Tikrar",
    zoom_link: "https://zoom.us/j/hiaqli-tikrar-fajar",
    whatsapp_group_link: "https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq",
    capacity: 30,
    filled: 21,
    description: "Sesi pagi berkah ba'da Subuh. Sangat ideal untuk pikiran yang masih segar & fokus penuh.",
  },
  {
    id: "a1111111-1111-4000-8000-000000000002",
    title: "Hi Tikrar - Sesi Dhuha (09:00 - 10:00 WIB)",
    session_label: "Sesi Dhuha / Pagi",
    time: "09:00 - 10:00 WIB",
    days: "Senin - Jumat",
    icon: "☀️",
    musyrifah: "Ustadzah Aisyah • Musyrifah Tikrar",
    zoom_link: "https://zoom.us/j/hiaqli-tikrar-dhuha",
    whatsapp_group_link: "https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq",
    capacity: 30,
    filled: 18,
    description: "Sesi dhuha setelah urusan pagi selesai. Suasana tenang dengan pendampingan interaktif.",
  },
  {
    id: "a1111111-1111-4000-8000-000000000003",
    title: "Hi Tikrar - Sesi Malam (20:00 - 21:00 WIB)",
    session_label: "Sesi Malam / Ba'da Isya",
    time: "20:00 - 21:00 WIB",
    days: "Senin - Jumat",
    icon: "🌙",
    musyrifah: "Ustadzah Maryam • Musyrifah Tikrar",
    zoom_link: "https://zoom.us/j/hiaqli-tikrar-malam",
    whatsapp_group_link: "https://chat.whatsapp.com/Bv8e0k51CdVH12ahImxLaq",
    capacity: 30,
    filled: 26,
    description: "Sesi malam fleksibel bagi mahasiswi atau thalibah bekerja untuk menutup hari dengan Al-Qur'an.",
  },
];

const TARGET_PACES = [
  {
    months: 1,
    title: "1 Bulan (Intensif)",
    dailyTarget: "1 Halaman (4 Blok) / hari aktif",
    badge: "Intensif",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    workDaysPerJuz: 20,
    description: "Selesai 1 Juz dalam ~4 pekan. Cocok bagi yang memiliki waktu luang cukup dan siap fokus.",
  },
  {
    months: 2,
    title: "2 Bulan (Reguler - Rekomendasi)",
    dailyTarget: "1/2 Halaman (2 Blok) / hari aktif",
    badge: "Paling Populer",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    workDaysPerJuz: 40,
    description: "Irama itqan paling seimbang. Cukup 2 blok per hari, pas dengan siklus setoran 1/2 halaman ke Musyrifah.",
  },
  {
    months: 3,
    title: "3 Bulan (Santai & Konsisten)",
    dailyTarget: "1 Blok / hari aktif",
    badge: "Santai",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    workDaysPerJuz: 60,
    description: "Langkah ringan namun sangat kokoh untuk pemula atau yang memiliki kesibukan harian padat.",
  },
];

function addWorkDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < Math.floor(days)) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result;
}

interface TikrarOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TikrarOnboardingModal({
  open,
  onOpenChange,
  onSuccess,
}: TikrarOnboardingModalProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);

  // Ambil daftar halaqah dari DB jika ada, fallback ke DEFAULT_TIKRAR_HALAQAHS
  const { data: dbHalaqahs } = useCollection("halaqahs", {
    filters: [{ column: "program_type", operator: "==", value: "tikrar_daily" }],
  });

  const availableHalaqahs = useMemo(() => {
    if (dbHalaqahs && dbHalaqahs.length > 0) {
      return DEFAULT_TIKRAR_HALAQAHS.map((def) => {
        const found = dbHalaqahs.find((h: any) => h.id === def.id || h.title?.includes(def.session_label));
        return found
          ? {
              ...def,
              id: found.id,
              title: found.title || def.title,
              zoom_link: found.zoom_link || def.zoom_link,
              whatsapp_group_link: found.whatsapp_group_link || def.whatsapp_group_link,
            }
          : def;
      });
    }
    return DEFAULT_TIKRAR_HALAQAHS;
  }, [dbHalaqahs]);

  // Form State
  const initialJuz = Number(userData?.paid_juz ?? userData?.paidJuz) || 30;
  const initialDuration = Number(userData?.tikrar_target_duration_months) || 2;
  const initialHalaqahId = userData?.tikrar_halaqah_id || availableHalaqahs[0].id;

  const [selectedJuz, setSelectedJuz] = useState<number>(initialJuz);
  const [selectedMonths, setSelectedMonths] = useState<number>(initialDuration);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>(initialHalaqahId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  // Perhitungan jadwal otomatis
  const selectedPace = useMemo(() => {
    return TARGET_PACES.find((p) => p.months === selectedMonths) || TARGET_PACES[1];
  }, [selectedMonths]);

  const selectedHalaqah = useMemo(() => {
    return availableHalaqahs.find((h) => h.id === selectedHalaqahId) || availableHalaqahs[0];
  }, [availableHalaqahs, selectedHalaqahId]);

  const juzMapping = useMemo(() => {
    return JUZ_PAGE_MAPPING[selectedJuz] || { startPage: 582, endPage: 604 };
  }, [selectedJuz]);

  const totalPages = juzMapping.endPage - juzMapping.startPage + 1;
  const totalBlocks = totalPages * 4;

  const estimatedEndDate = useMemo(() => {
    const today = new Date();
    const workDaysNeeded = Math.round(totalPages * (selectedMonths === 1 ? 1 : selectedMonths === 2 ? 2 : 4));
    return addWorkDays(today, workDaysNeeded);
  }, [totalPages, selectedMonths]);

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Perlu Login",
        description: "Silakan login terlebih dahulu untuk menyimpan rencana target Tikrar.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const startPage = juzMapping.startPage;
      const payload: Record<string, any> = {
        tikrar_halaqah_id: selectedHalaqah.id,
        paid_juz: selectedJuz,
        tikrar_target_duration_months: selectedMonths,
        tikrar_active_days_per_week: 5,
        tikrar_current_page: startPage,
        tikrar_current_block: 1,
        tikrar_start_date: new Date().toISOString(),
      };

      const { error: userError } = await db.from("users").update(payload).eq("id", user.id);
      if (userError) throw userError;

      // Catat pendaftaran halaqah jika belum ada
      try {
        await db.from("halaqah_registrations").upsert({
          user_id: user.id,
          halaqah_id: selectedHalaqah.id,
          status: "active",
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        // Toleransi jika unique constraint berbeda
        console.warn("halaqah_registration notice:", err);
      }

      toast({
        title: "Target & Jadwal Berhasil Disimpan!",
        description: `Target Juz ${selectedJuz} (${selectedPace.title}) dan ${selectedHalaqah.session_label} aktif.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Failed to save Tikrar target:", err);
      toast({
        title: "Gagal Menyimpan",
        description: err.message || "Terjadi kesalahan saat menyimpan preferensi jadwal.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-[#800000]/20">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#800000] via-[#900000] to-[#5b0000] text-white p-6 sm:p-8 relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] bg-black/30 px-2.5 py-0.5 rounded-full">
              Konfigurasi Rencana Itqan
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold font-headline text-white tracking-tight">
            Tentukan Target & Pilih Jadwal Live Zoom
          </DialogTitle>
          <DialogDescription className="text-white/80 text-xs sm:text-sm mt-1 leading-relaxed">
            Atur target mandiri 1 Juz pilihan Anda dan amankan sesi halaqah Live Zoom bersama Musyrifah pendamping.
          </DialogDescription>

          {/* Stepper Tab */}
          <div className="flex items-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={cn(
                "flex-1 text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                activeStep === 1
                  ? "bg-white text-[#800000] border-white shadow"
                  : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
              )}
            >
              1. Target Juz & Durasi
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={cn(
                "flex-1 text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border",
                activeStep === 2
                  ? "bg-white text-[#800000] border-white shadow"
                  : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
              )}
            >
              2. Jadwal Sesi Live Zoom
            </button>
          </div>
        </div>

        {/* Step 1: Target Mandiri */}
        {activeStep === 1 && (
          <div className="p-6 space-y-6">
            {/* Pilihan Juz */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Pilih Juz Target (1 - 30)</span>
                <span className="text-[#800000] font-bold">
                  Halaman {juzMapping.startPage} s/d {juzMapping.endPage} ({totalPages} Halaman)
                </span>
              </label>

              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                  const isSelected = selectedJuz === juzNum;
                  return (
                    <button
                      key={juzNum}
                      type="button"
                      onClick={() => setSelectedJuz(juzNum)}
                      className={cn(
                        "h-10 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all border",
                        isSelected
                          ? "bg-[#800000] text-white border-[#800000] shadow-md scale-105"
                          : "bg-card text-foreground hover:bg-muted border-border"
                      )}
                    >
                      <span className="text-[9px] opacity-70">Juz</span>
                      <span className="text-xs font-black">{juzNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Pace / Target Durasi */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Pilihan Target Durasi (Pace)</span>
                <span className="text-emerald-700 font-bold text-[11px]">Komitmen 5 Hari / Pekan</span>
              </label>

              <div className="grid grid-cols-1 gap-3">
                {TARGET_PACES.map((pace) => {
                  const isSelected = selectedMonths === pace.months;
                  return (
                    <div
                      key={pace.months}
                      onClick={() => setSelectedMonths(pace.months)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-2 relative",
                        isSelected
                          ? "bg-[#800000]/5 border-[#800000] shadow-sm"
                          : "bg-card hover:bg-muted/40 border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center text-xs",
                              isSelected ? "bg-[#800000] text-white border-[#800000]" : "border-muted-foreground"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="font-bold text-sm text-foreground">{pace.title}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] font-bold", pace.badgeColor)}>
                          {pace.badge}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground pl-7">{pace.description}</p>

                      <div className="pl-7 flex items-center gap-4 text-xs font-semibold text-[#800000]">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" /> {pace.dailyTarget}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground text-[11px]">
                          Total {totalPages} hal ({totalBlocks} blok repetisi)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-900">
                  Simulasi Rencana: Juz {selectedJuz} • Selesai ~
                  {estimatedEndDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Jadwal memetakan <strong>5 hari kerja aktif/pekan</strong> (Senin s/d Jumat). Akhir pekan (Sabtu & Ahad)
                  menjadi waktu toleransi, murajaah mandiri, dan persiapan setoran.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setActiveStep(2)}
                className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold gap-2 px-6"
              >
                Lanjut ke Pemilihan Jadwal Zoom <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Jadwal Halaqah Live Zoom */}
        {activeStep === 2 && (
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Pilih Sesi Halaqah Live Zoom Rutin</h4>
                  <p className="text-xs text-muted-foreground">
                    Setoran hafalan wajib disimak langsung secara tatap muka virtual via Live Zoom (bukan voice note).
                  </p>
                </div>
                <Badge className="bg-[#800000] text-white text-[10px] font-bold">Wajib Live Zoom</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {availableHalaqahs.map((halaqah) => {
                  const isSelected = selectedHalaqahId === halaqah.id;
                  return (
                    <div
                      key={halaqah.id}
                      onClick={() => setSelectedHalaqahId(halaqah.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 relative",
                        isSelected
                          ? "bg-[#800000]/5 border-[#800000] shadow-sm"
                          : "bg-card hover:bg-muted/40 border-border"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{halaqah.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-sm text-foreground">{halaqah.title}</h5>
                              {isSelected && (
                                <Badge className="bg-[#800000] text-white text-[9px] font-bold">Dipilih</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{halaqah.musyrifah}</p>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0",
                            isSelected ? "bg-[#800000] text-white border-[#800000]" : "border-muted-foreground"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{halaqah.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-dashed">
                        <span className="font-semibold text-[#800000] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {halaqah.time} ({halaqah.days})
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Kuota: {halaqah.filled}/{halaqah.capacity} Thalibah
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" /> Live Zoom Resmi
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aturan Gerbang Setoran 1/2 Halaman */}
            <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#800000]">
                <ShieldCheck className="w-4 h-4" />
                <span>Aturan Ambang Batas Setoran (Milestone Itqan):</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5 leading-relaxed">
                <li>
                  Setoran wajib dilakukan setiap menuntaskan minimal <strong>2 Blok (1/2 Halaman)</strong> hingga maksimal{" "}
                  <strong>4 Blok (1 Halaman Penuh)</strong>.
                </li>
                <li>
                  Halaman berikutnya akan <strong>terkunci secara otomatis</strong> sampai Musyrifah memverifikasi
                  kelulusan tasmi' di ruang Zoom.
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep(1)}
                className="font-bold text-xs"
              >
                Kembali ke Target
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold gap-2 px-6"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Simpan & Aktifkan Rencana Tikrar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
