"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Flame,
} from "lucide-react";
import { useUser, useDoc, useCollection } from "@/db";
import { TikrarSubmissionModal } from "./tikrar-submission-modal";
import { DEFAULT_TIKRAR_HALAQAHS } from "./tikrar-onboarding-modal";
import { cn } from "@/lib/utils";

interface TikrarSetoranGatekeeperProps {
  page: number;
  juz: number;
  blocksProgress: {
    A: boolean;
    B: boolean;
    C: boolean;
    D: boolean;
  };
  isGabungABDone: boolean;
  isGabungAllDone: boolean;
  onSubmissionSuccess?: () => void;
}

export function TikrarSetoranGatekeeper({
  page,
  juz,
  blocksProgress,
  isGabungABDone,
  isGabungAllDone,
  onSubmissionSuccess,
}: TikrarSetoranGatekeeperProps) {
  const { user } = useUser();
  const { data: userData } = useDoc(user?.id ? "users" : null, user?.id);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedRangePreset, setSelectedRangePreset] = useState<string>("blok_1_2");

  // Ambil data halaqah
  const activeHalaqahId = userData?.tikrar_halaqah_id || DEFAULT_TIKRAR_HALAQAHS[0].id;
  const halaqah = useMemo(() => {
    return DEFAULT_TIKRAR_HALAQAHS.find((h) => h.id === activeHalaqahId) || DEFAULT_TIKRAR_HALAQAHS[0];
  }, [activeHalaqahId]);

  // Cek pengajuan setoran pengguna untuk halaman ini
  const { data: submissions, mutate: refreshSubmissions } = useCollection("tikrar_submissions", {
    filters: [
      { column: "user_id", operator: "==", value: user?.id },
      { column: "page_number", operator: "==", value: page },
    ],
    orderBy: { column: "created_at", ascending: false },
  });

  const latestSubmission = submissions && submissions.length > 0 ? submissions[0] : null;

  // Syarat ambang batas setoran
  const isHalfPageDone = (blocksProgress.A && blocksProgress.B) || isGabungABDone;
  const isFullPageDone = blocksProgress.A && blocksProgress.B && blocksProgress.C && blocksProgress.D && isGabungAllDone;

  const isPassed = latestSubmission?.status === "passed";
  const isPending = latestSubmission?.status === "pending";
  const needsRevision = latestSubmission?.status === "needs_revision";

  const handleOpenModal = (range: string) => {
    setSelectedRangePreset(range);
    setModalOpen(true);
  };

  // 1. Jika sudah lulus setoran di halaman ini
  if (isPassed) {
    const gradeLabel =
      latestSubmission?.grade === "mumtaz"
        ? "MUMTAZ (Istimewa)"
        : latestSubmission?.grade === "jayyid_jiddan"
        ? "JAYYID JIDDAN (Sangat Baik)"
        : "JAYYID (Baik)";

    return (
      <Card className="border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/60 shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">
                  Setoran Live Zoom Lulus! ({gradeLabel})
                </h4>
                <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase">
                  KUNCI TERBUKA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Alhamdulillah! Halaman {page} telah disahkan oleh <strong>{latestSubmission.musyrifah_name || halaqah.musyrifah}</strong>.
                Kunci halaman berikutnya telah dibuka.
              </p>
              {latestSubmission.feedback && (
                <p className="text-xs text-emerald-800 italic mt-1 bg-emerald-100/60 px-3 py-1.5 rounded-lg border border-emerald-200">
                  Catatan Musyrifah: &ldquo;{latestSubmission.feedback}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5" />
              Lanjut ke Hal. {page + 1}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. Jika antrean setoran sedang pending menunggu giliran di Zoom
  if (isPending) {
    return (
      <Card className="border-2 border-amber-500/40 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/60 shadow-sm overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-foreground">
                  Antrean Setoran Live Zoom Terdaftar
                </h4>
                <Badge className="bg-amber-600 text-white text-[9px] font-black uppercase">
                  MENUNGGU TASMI'
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Setoran Halaman {page} ({latestSubmission.blocks_range === "blok_1_4" ? "1 Halaman Penuh" : "1/2 Halaman"}) sedang
                menunggu jadwal sesi Live Zoom bersama <strong>{halaqah.musyrifah}</strong>.
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                Jadwal Sesi: {halaqah.schedule || halaqah.title}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {halaqah.zoom_link && (
              <Button
                asChild
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 shadow-sm"
              >
                <a href={halaqah.zoom_link} target="_blank" rel="noopener noreferrer">
                  <Video className="w-3.5 h-3.5" />
                  Masuk Live Zoom Sekarang
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 3. Jika perlu perbaikan tajwid/kelancaran
  if (needsRevision) {
    return (
      <>
        <Card className="border-2 border-rose-500/40 bg-gradient-to-r from-rose-50/90 via-white to-rose-50/60 shadow-sm overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">
                    Perlu Perbaikan Sebelum Buka Halaman Baru
                  </h4>
                  <Badge className="bg-rose-600 text-white text-[9px] font-black uppercase">
                    PERLU REVISI
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Musyrifah meminta Ukhti mengulang beberapa bagian agar bacaan benar-benar itqan.
                </p>
                {latestSubmission.feedback && (
                  <p className="text-xs text-rose-800 font-semibold bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                    &ldquo;{latestSubmission.feedback}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => handleOpenModal(latestSubmission.blocks_range || "blok_1_2")}
              className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold text-xs gap-1.5 h-9 shrink-0 shadow-sm"
            >
              <Video className="w-3.5 h-3.5" />
              Ajukan Setoran Ulang di Zoom
            </Button>
          </CardContent>
        </Card>

        <TikrarSubmissionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentPage={page}
          currentJuz={juz}
          defaultRange={selectedRangePreset}
          onSuccess={() => {
            refreshSubmissions();
            if (onSubmissionSuccess) onSubmissionSuccess();
          }}
        />
      </>
    );
  }

  // 4. Jika telah mencapai minimal 2 Blok (1/2 Halaman) tapi belum mendaftar setoran
  if (isHalfPageDone) {
    return (
      <>
        <Card className="border-2 border-[#800000]/30 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 shadow-sm overflow-hidden">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#800000] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">
                    🎉 Ambang Batas Setoran 1/2 Halaman Tercapai!
                  </h4>
                  <Badge className="bg-[#800000] text-white text-[9px] font-black uppercase">
                    GERBANG KELAS SETORAN
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Ukhti telah menuntaskan minimal <strong>2 Blok (1/2 Halaman)</strong>. Sesuai manhaj itqan Hi-AQLI,
                  halaman selanjutnya terkunci sampai Ukhti menyetorkan hafalan secara tatap muka virtual via Live Zoom bersama Musyrifah.
                </p>
                <div className="flex items-center gap-3 text-xs pt-1">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Setoran 1/2 Hal: +100 Poin
                  </span>
                  {isFullPageDone && (
                    <span className="font-semibold text-[#800000] flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> 1 Hal Penuh: +250 Poin
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={() => handleOpenModal(isFullPageDone ? "blok_1_4" : "blok_1_2")}
                className="bg-[#800000] hover:bg-[#6a0000] text-white font-bold text-xs gap-2 h-10 px-5 shadow-sm"
              >
                <Video className="w-4 h-4 text-[#D4AF37]" />
                Daftar Antrean Setoran Live Zoom
              </Button>
            </div>
          </CardContent>
        </Card>

        <TikrarSubmissionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentPage={page}
          currentJuz={juz}
          defaultRange={isFullPageDone ? "blok_1_4" : "blok_1_2"}
          onSuccess={() => {
            refreshSubmissions();
            if (onSubmissionSuccess) onSubmissionSuccess();
          }}
        />
      </>
    );
  }

  // 5. Belum mencapai batas 1/2 halaman (info lock)
  return (
    <div className="p-3.5 rounded-xl border border-dashed bg-muted/40 flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2.5">
        <Lock className="w-4 h-4 text-[#800000]/70 shrink-0" />
        <span>
          <strong>Gerbang Kunci Halaman:</strong> Selesaikan minimal <strong>2 Blok (1/2 Halaman)</strong> untuk membuka antrean Kelas Setoran Live Zoom bersama Musyrifah.
        </span>
      </div>
      <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground shrink-0 hidden sm:inline-flex">
        Minimal 2 Blok
      </Badge>
    </div>
  );
}
