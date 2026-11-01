"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Video,
  MessageCircle,
  Settings2,
  Calendar,
  Clock,
  Target,
  Sparkles,
  ExternalLink,
  Users,
} from "lucide-react";
import { useUser, useDoc, useCollection } from "@/db";
import { TikrarOnboardingModal, DEFAULT_TIKRAR_HALAQAHS } from "./tikrar-onboarding-modal";
import { JUZ_PAGE_MAPPING } from "@/lib/quran-mapping";

export function TikrarActiveHalaqahBanner() {
  const { user } = useUser();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);
  const [modalOpen, setModalOpen] = useState(false);

  // Ambil halaqah dari DB jika tersedia
  const { data: dbHalaqahs } = useCollection("halaqahs", {
    filters: [{ column: "program_type", operator: "==", value: "tikrar_daily" }],
  });

  const activeHalaqahId = userData?.tikrar_halaqah_id;
  const currentJuz = Number(userData?.paid_juz ?? userData?.paidJuz) || 30;
  const durationMonths = Number(userData?.tikrar_target_duration_months) || 2;

  const halaqah = useMemo(() => {
    if (!activeHalaqahId) return null;
    const foundInDb = dbHalaqahs?.find((h: any) => h.id === activeHalaqahId);
    if (foundInDb) return foundInDb;
    return DEFAULT_TIKRAR_HALAQAHS.find((h) => h.id === activeHalaqahId) || DEFAULT_TIKRAR_HALAQAHS[0];
  }, [activeHalaqahId, dbHalaqahs]);

  const juzMapping = JUZ_PAGE_MAPPING[currentJuz] || { startPage: 582, endPage: 604 };
  const totalPages = juzMapping.endPage - juzMapping.startPage + 1;

  const paceLabel =
    durationMonths === 1
      ? "1 Bulan (Intensif - 1 Hal/Hari)"
      : durationMonths === 3
      ? "3 Bulan (Santai - 1 Blok/Hari)"
      : "2 Bulan (Reguler - 1/2 Hal/Hari)";

  // Jika belum mengatur target atau jadwal
  if (!activeHalaqahId) {
    return (
      <>
        <Card className="border-2 border-dashed border-[#800000]/30 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 shadow-sm overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#800000]/10 text-[#800000] flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#800000]">Tentukan Target & Pilih Jadwal Live Zoom</h3>
                  <Badge className="bg-amber-600 text-white text-[9px] font-black tracking-wider">LANGKAH AWAL</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Pilih Juz target mandiri, sesuaikan durasi (1–3 bulan), dan tentukan jadwal sesi Zoom bersama Musyrifah
                  pendamping untuk kelas setoran tatap muka langsung.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setModalOpen(true)}
              className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold text-xs gap-2 shrink-0 shadow-md h-10 px-5"
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Atur Rencana Tikrar Sekarang
            </Button>
          </CardContent>
        </Card>

        <TikrarOnboardingModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // Tampilan ketika sudah memiliki halaqah aktif
  return (
    <>
      <Card className="border border-[#800000]/20 bg-gradient-to-r from-[#800000]/5 via-white to-[#800000]/5 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Informasi Halaqah & Target */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#800000] text-white text-[9px] font-black tracking-wider uppercase">
                  HALAQAH AKTIF
                </Badge>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#800000]" />
                  {halaqah?.schedule || halaqah?.title || "Senin - Jumat"}
                </span>
                <span className="text-muted-foreground text-xs hidden sm:inline">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {halaqah?.musyrifah || "Musyrifah Tikrar"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 font-bold text-[#800000] bg-[#800000]/10 px-2.5 py-1 rounded-lg">
                  <Target className="w-3.5 h-3.5" />
                  <span>
                    Target: Juz {currentJuz} (Hal. {juzMapping.startPage}–{juzMapping.endPage})
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-muted-foreground bg-muted px-2.5 py-1 rounded-lg font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{paceLabel} • 5 Hari/Pekan</span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Zoom & WhatsApp) */}
            <div className="flex flex-wrap items-center gap-2">
              {halaqah?.zoom_link && (
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 shadow-sm"
                >
                  <a href={halaqah.zoom_link} target="_blank" rel="noopener noreferrer">
                    <Video className="w-3.5 h-3.5" />
                    Masuk Live Zoom
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </Button>
              )}

              {halaqah?.whatsapp_group_link && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 font-bold text-xs gap-1.5 h-9"
                >
                  <a href={halaqah.whatsapp_group_link} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Grup WA
                  </a>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setModalOpen(true)}
                className="text-muted-foreground hover:text-foreground text-xs gap-1.5 h-9"
                title="Sesuaikan Target atau Jadwal"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Ubah
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TikrarOnboardingModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
