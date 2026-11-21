'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser } from '@/db';
import { authFetch } from '@/db/client';
import { cn } from '@/lib/utils';
import {
  DAY_NAMES_ID,
  formatDateID,
  getDayOfWeekFromKey,
  getJuzPageRange,
  parseDateKeyUTC,
  TIKRAR_PACE_OPTIONS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import { generateTikrarStepSchedule, STEPS_PER_PAGE, TIKRAR_STEPS } from '@/lib/tikrar-steps';
import type { TikrarSummary } from '@/lib/tikrar-server';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Sparkles,
  Target,
} from 'lucide-react';

export interface TikrarScheduleProps {
  onScheduleSaved?: (target?: { page: number; juz: number }) => void;
  onOpenMushafTarget?: (target: { page: number; juz: number }) => void;
  onJumpToDailyReport?: () => void;
  refreshSignal?: number;
  summary?: TikrarSummary | null;
}

function formatDate(dateKey: string, withYear = false, withDay = false) {
  return formatDateID(dateKey, { withDay, withYear, shortYear: !withYear });
}

export function TikrarSchedule({ onScheduleSaved, onOpenMushafTarget, summary }: TikrarScheduleProps) {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const halaqahOptions = useMemo(
    () => ({ filters: [{ column: 'program_type', operator: '==', value: 'tikrar_daily' }] }),
    []
  );
  const { data: tikrarHalaqahs } = useCollection<any>('halaqahs', halaqahOptions);

  const target = summary?.target || null;
  const todayKey = useMemo(() => toDateKeyWIB(), []);

  const [selectedJuz, setSelectedJuz] = useState<number>(30);
  const juzRange = useMemo(() => getJuzPageRange(selectedJuz), [selectedJuz]);
  const [startPage, setStartPage] = useState<number>(juzRange.startPage);
  const [endPage, setEndPage] = useState<number>(juzRange.endPage);
  const [durationMonths, setDurationMonths] = useState<1 | 2 | 3 | 4>(2);
  const [activeDaysPerWeek, setActiveDaysPerWeek] = useState<number>(5);
  const [startDateKey, setStartDateKey] = useState<string>(todayKey);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);
  const [showIstiqomah, setShowIstiqomah] = useState(false);
  const recentChanges = summary?.targetChangesLast30Days || 0;
  const [markPriorPagesDone, setMarkPriorPagesDone] = useState(true);

  useEffect(() => {
    setMarkPriorPagesDone(true);
  }, [selectedJuz, startPage]);

  // Isi form dari target aktif (sekali)
  useEffect(() => {
    if (hasInitializedForm || !summary) return;
    if (target) {
      setSelectedJuz(target.juz);
      setStartPage(target.startPage);
      setEndPage(target.endPage);
      setDurationMonths(Math.max(1, Math.min(4, target.durationMonths)) as 1 | 2 | 3 | 4);
      setActiveDaysPerWeek(target.activeDaysPerWeek);
      setStartDateKey(target.startDate);
      if (target.halaqahId) setSelectedHalaqahId(target.halaqahId);
    }
    setHasInitializedForm(true);
  }, [summary, target, hasInitializedForm]);

  useEffect(() => {
    if (!selectedHalaqahId && tikrarHalaqahs && tikrarHalaqahs.length > 0) {
      setSelectedHalaqahId(tikrarHalaqahs[0].id);
    }
  }, [tikrarHalaqahs, selectedHalaqahId]);

  const showForm = !target || isEditing;

  const preview = useMemo(
    () =>
      generateTikrarStepSchedule({
        juz: selectedJuz,
        startPage,
        endPage,
        startDate: startDateKey,
        durationMonths,
        activeDaysPerWeek,
      }),
    [selectedJuz, startPage, endPage, startDateKey, durationMonths, activeDaysPerWeek]
  );

  const activeSchedule = useMemo(() => {
    if (showForm || !target) return preview;
    return generateTikrarStepSchedule({
      juz: target.juz,
      startPage: target.startPage,
      endPage: target.endPage,
      startDate: target.startDate,
      durationMonths: target.durationMonths,
      activeDaysPerWeek: target.activeDaysPerWeek,
    });
  }, [showForm, target, preview]);

  // Posisi langkah tuntas di dalam target (berurutan per halaman)
  const completedGlobal = useMemo(() => {
    if (!target || showForm) return 0;
    let done = 0;
    for (let p = target.startPage; p <= target.endPage; p++) {
      const s = summary?.stepsByPage?.[p] || 0;
      done += s;
      if (s < STEPS_PER_PAGE) break;
    }
    return done;
  }, [target, showForm, summary?.stepsByPage]);

  const weeks = useMemo(() => {
    const map = new Map<number, typeof activeSchedule.days>();
    activeSchedule.days.forEach((d) => {
      if (!map.has(d.weekNumber)) map.set(d.weekNumber, []);
      map.get(d.weekNumber)!.push(d);
    });
    return Array.from(map.entries()).map(([week, days]) => ({ week, days }));
  }, [activeSchedule]);

  const currentWeek = useMemo(() => {
    const d = activeSchedule.days.find((x) => x.date >= todayKey) || activeSchedule.days[0];
    return d?.weekNumber || 1;
  }, [activeSchedule, todayKey]);
  const openWeek = expandedWeek ?? currentWeek;

  const handleSave = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const res = await authFetch('/api/tikrar/schedule', {
        method: 'POST',
        body: JSON.stringify({
          juz: selectedJuz,
          start_page: startPage,
          end_page: endPage,
          duration_months: durationMonths,
          active_days_per_week: activeDaysPerWeek,
          start_date: startDateKey,
          halaqah_id: selectedHalaqahId || null,
          mark_prior_pages_done: startPage > juzRange.startPage ? markPriorPagesDone : false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan target.');
      const targetPaceSaved = TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === durationMonths) || paceMeta;
      toast({
        title: 'Target & Jadwal Tersimpan',
        description: `Juz ${selectedJuz} • Hal. ${startPage}–${endPage} • ${targetPaceSaved.monthlyPagesLabel} (${targetPaceSaved.dailyPortionLabel}). Membuka Mushaf Hal. ${startPage}...`,
      });
      setIsEditing(false);
      onScheduleSaved?.({ page: json.data?.summary?.target?.unlockedPage || startPage, juz: selectedJuz });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  const paceMeta = TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === durationMonths) || TIKRAR_PACE_OPTIONS[0];
  const targetPace = useMemo(() => {
    if (!target) return null;
    return (
      TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === target.durationMonths) ||
      TIKRAR_PACE_OPTIONS[0]
    );
  }, [target]);
  const totalPagesSelected = endPage - startPage + 1;

  return (
    <div className="space-y-8 pb-20">
      <Dialog open={showIstiqomah} onOpenChange={setShowIstiqomah}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[88dvh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-3 shrink-0 border-b border-stone-100">
            <DialogTitle className="text-[#6D123F] font-black">Istiqomah Lebih Utama</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {recentChanges >= 2
                ? `Ukhti sudah mengubah target ${recentChanges} kali dalam 30 hari terakhir. Sering berganti target bisa membuat hafalan tidak kokoh.`
                : 'Sebelum mengubah target, renungkan sejenak pesan berikut.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 p-5 overflow-y-auto flex-1">
            <div className="rounded-2xl bg-[#6D123F]/5 border border-[#6D123F]/10 p-3.5 space-y-1.5">
              <p dir="rtl" className="font-arabic text-xl sm:text-2xl leading-relaxed text-right text-stone-900">
                أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ
              </p>
              <p className="text-xs sm:text-sm font-semibold text-stone-800">
                &ldquo;Amalan yang paling dicintai Allah adalah yang paling rutin dikerjakan, meskipun sedikit.&rdquo;
              </p>
              <p className="text-[10px] font-bold text-stone-500">HR. Al-Bukhari dan Muslim</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-1.5">
              <p dir="rtl" className="font-arabic text-xl sm:text-2xl leading-relaxed text-right text-stone-900">
                فَاسْتَقِمْ كَمَا أُمِرْتَ
              </p>
              <p className="text-xs sm:text-sm font-semibold text-stone-800">
                &ldquo;Maka tetaplah (istiqomahlah) engkau sebagaimana telah diperintahkan kepadamu.&rdquo;
              </p>
              <p className="text-[10px] font-bold text-stone-500">QS. Hud: 112</p>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Lebih baik sedikit tapi terus-menerus daripada banyak lalu berhenti. Ubah target bila memang perlu,
              misalnya jadwal tidak sesuai kondisi Ukhti, bukan karena ingin berpindah-pindah.
            </p>
          </div>
          <DialogFooter className="p-4 bg-stone-50 border-t border-stone-200/60 shrink-0 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              onClick={() => setShowIstiqomah(false)}
              className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-black rounded-xl h-10 sm:h-11 text-xs sm:text-sm"
            >
              Tetap dengan Target Sekarang
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowIstiqomah(false);
                setIsEditing(true);
              }}
              className="font-bold rounded-xl h-10 sm:h-11 text-xs sm:text-sm border-stone-300"
            >
              Saya Tetap Ingin Mengubah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!showForm && target ? (
        <Card className="border border-stone-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#6D123F] text-white border-b-4 border-[#D4AF37] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-1">
                  <Target className="w-3.5 h-3.5" /> Target &amp; Jadwal Berjalan
                </div>
                <CardTitle className="text-xl font-headline font-black">
                  Juz {target.juz} • Hal. {target.startPage}–{target.endPage}
                </CardTitle>
                <CardDescription className="text-white/80 text-xs mt-0.5">
                  Target: {targetPace?.monthlyPagesLabel} ({targetPace?.dailyPortionLabel}) • {target.activeDaysPerWeek} hari aktif/pekan • Periode {formatDate(target.startDate, false, true)} – {formatDate(target.endDate, true, true)}
                </CardDescription>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowIstiqomah(true)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-black text-xs h-9 px-3.5 rounded-xl"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                  Ubah Target
                </Button>
                {recentChanges >= 2 && (
                  <span className="text-[10px] text-white/75 max-w-[220px] sm:text-right">
                    Target sudah diubah {recentChanges}x dalam 30 hari terakhir.
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Target Hari Ini</p>
                <p className="text-sm font-black text-stone-900">
                  {summary?.today.stepsToday || 0} / {target.dailyQuota} Langkah
                </p>
                <p className="text-[11px] text-stone-600 font-bold">
                  Porsi: {targetPace?.dailyPortionLabel || `${target.dailyQuota} langkah`}
                </p>
                <p className={cn('text-[11px] font-bold', summary?.today.targetMet ? 'text-emerald-700' : 'text-amber-700')}>
                  {summary?.today.targetMet ? '✓ Tercapai' : 'Belum tercapai'}
                </p>
              </div>
              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Progres Target</p>
                <p className="text-sm font-black text-[#6D123F]">
                  {target.completedSteps} / {target.totalSteps} Langkah
                </p>
                <Progress value={(target.completedSteps / Math.max(1, target.totalSteps)) * 100} className="h-1.5" />
              </div>
              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Halaman Lulus Ujian</p>
                <p className="text-sm font-black text-stone-900">
                  {target.clearedPagesInTarget.length} / {target.endPage - target.startPage + 1} Hal.
                </p>
                <p className="text-[11px] text-stone-500">Halaman aktif: {target.unlockedPage}</p>
              </div>
              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Posisi Jadwal</p>
                <p
                  className={cn(
                    'text-sm font-black',
                    target.completedSteps >= target.expectedStepsToday ? 'text-emerald-700' : 'text-amber-700'
                  )}
                >
                  {target.completedSteps >= target.expectedStepsToday
                    ? 'Sesuai jadwal'
                    : `Tertinggal ${target.expectedStepsToday - target.completedSteps} langkah`}
                </p>
                <p className="text-[11px] text-stone-500">Seharusnya: {target.expectedStepsToday} langkah</p>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#6D123F] text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-stone-900">
                    Lanjutkan Halaman {target.unlockedPage}
                  </h4>
                  <p className="text-xs text-stone-600">
                    {target.todaySchedule
                      ? `Jadwal hari ini: ${target.todaySchedule.items
                          .map((i) => `Hal. ${i.page} ${i.shortLabel}`)
                          .join(', ')}`
                      : 'Hari ini tidak terjadwal — boleh murajaah atau mencicil langkah berikutnya.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => onOpenMushafTarget?.({ page: target.unlockedPage, juz: target.juz })}
                className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-black text-xs h-10 px-5 rounded-xl gap-2 shrink-0"
              >
                <BookOpen className="w-4 h-4 text-[#D4AF37]" /> Buka Mushaf <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-stone-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#6D123F] text-white border-b-4 border-[#D4AF37]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-1">
                  <Target className="w-3.5 h-3.5" /> {target ? 'Ubah Target' : 'Langkah Awal Wajib'}
                </div>
                <CardTitle className="text-xl font-headline font-black">Target Hafalan &amp; Jadwal Per Langkah</CardTitle>
                <CardDescription className="text-white/80 text-xs mt-1">
                  Pilih Juz, halaman mulai sampai halaman akhir, dan durasi periode. Jadwal disusun mengikuti urutan
                  mushaf: Simak → TM 1-1 → TM 1-2 → Gabung TM 1 → … → Gabung TM 1–4 → Ujian. Progres yang sudah tercatat tidak hilang
                  saat target diubah.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {target && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-9 px-3 rounded-xl"
                  >
                    Batal
                  </Button>
                )}
                {isUserLoading ? (
                  <Button type="button" size="sm" disabled className="font-bold text-xs h-9 px-4 rounded-xl">
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Memeriksa...
                  </Button>
                ) : user ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-stone-950 font-black text-xs h-9 px-4 rounded-xl border border-amber-300"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Simpan &amp; Buka Mushaf
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">1. Juz</label>
                <select
                  aria-label="Pilih Juz"
                  value={selectedJuz}
                  onChange={(e) => {
                    const j = Number(e.target.value);
                    const r = getJuzPageRange(j);
                    setSelectedJuz(j);
                    setStartPage(r.startPage);
                    setEndPage(r.endPage);
                  }}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-black text-[#6D123F]"
                >
                  {Array.from({ length: 30 }, (_, idx) => {
                    const r = getJuzPageRange(idx + 1);
                    return (
                      <option key={idx + 1} value={idx + 1}>
                        Juz {idx + 1} (Hal. {r.startPage}–{r.endPage})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">2. Mulai Halaman</label>
                <select
                  aria-label="Halaman mulai"
                  value={startPage}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setStartPage(p);
                    if (endPage < p) setEndPage(p);
                  }}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800"
                >
                  {Array.from({ length: juzRange.totalPages }, (_, i) => juzRange.startPage + i).map((p) => (
                    <option key={p} value={p}>
                      Hal. {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">3. Sampai Halaman</label>
                <select
                  aria-label="Halaman akhir"
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800"
                >
                  {Array.from({ length: juzRange.endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
                    <option key={p} value={p}>
                      Hal. {p} {p === juzRange.endPage ? '(Akhir Juz)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">4. Tanggal Mulai</label>
                <Input
                  type="date"
                  value={startDateKey}
                  min={target ? undefined : todayKey}
                  onChange={(e) => e.target.value && setStartDateKey(e.target.value)}
                  className="h-10 rounded-xl border-stone-300 text-sm font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">5. Hari Aktif / Pekan</label>
                <select
                  aria-label="Hari aktif per pekan"
                  value={activeDaysPerWeek}
                  onChange={(e) => setActiveDaysPerWeek(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800"
                >
                  <option value={5}>5 Hari (Senin – Jumat)</option>
                  <option value={4}>4 Hari (Senin – Kamis)</option>
                  <option value={6}>6 Hari (Senin – Sabtu)</option>
                  <option value={7}>7 Hari (Setiap Hari)</option>
                  <option value={3}>3 Hari (Senin – Rabu)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">6. Sesi Halaqah</label>
                <select
                  aria-label="Sesi halaqah"
                  value={selectedHalaqahId}
                  onChange={(e) => setSelectedHalaqahId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800"
                >
                  {(tikrarHalaqahs || []).map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {startPage > juzRange.startPage && (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-950">
                      Mulai dari Pertengahan Juz {selectedJuz} (Hal. {startPage})
                    </h4>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Ukhti memulai hafalan dari Hal. {startPage}, melewati {startPage - juzRange.startPage} halaman awal Juz {selectedJuz} (Hal. {juzRange.startPage}–{startPage - 1}).
                      Tandai semua langkah pada halaman-halaman awal ini sebagai sudah tuntas agar tersimpan rapi di progres dan tidak terkunci saat murajaah.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={markPriorPagesDone}
                    onChange={(e) => setMarkPriorPagesDone(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6D123F] accent-[#6D123F] focus:ring-[#6D123F]"
                  />
                  <span className="text-xs font-black text-stone-800">
                    Tandai semua langkah Hal. {juzRange.startPage} s.d. Hal. {startPage - 1} sudah tuntas (100% selesai &amp; tersimpan di progres)
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  7. Target Hafalan / Bulan &amp; Ritme Harian
                </label>
                <span className="text-[11px] text-stone-500 font-medium">
                  Pilih porsi yang paling realistis untuk istiqomah
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TIKRAR_PACE_OPTIONS.map((opt) => {
                  const sched = generateTikrarStepSchedule({
                    juz: selectedJuz,
                    startPage,
                    endPage,
                    startDate: startDateKey,
                    durationMonths: opt.durationMonths,
                    activeDaysPerWeek,
                  });
                  const isSel = durationMonths === opt.durationMonths;
                  return (
                    <button
                      key={opt.durationMonths}
                      type="button"
                      onClick={() => setDurationMonths(opt.durationMonths)}
                      className={cn(
                        "relative text-left rounded-2xl border-2 p-3.5 transition-all flex flex-col justify-between gap-2.5",
                        isSel
                          ? "border-[#6D123F] bg-[#6D123F]/5 shadow-sm ring-1 ring-[#6D123F]/20"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <Badge
                            className={cn(
                              "text-[10px] font-black border-none px-2 py-0.5",
                              opt.isRecommended
                                ? "bg-[#6D123F] text-[#D4AF37]"
                                : isSel
                                ? "bg-[#6D123F]/15 text-[#6D123F]"
                                : "bg-stone-100 text-stone-600"
                            )}
                          >
                            {opt.badge}
                          </Badge>
                          <span className="text-[11px] font-bold text-stone-400">
                            {opt.durationMonths} Bulan
                          </span>
                        </div>
                        <p className="text-base font-black text-stone-900 pt-0.5">
                          {opt.monthlyPagesLabel}
                        </p>
                        <p className="text-xs font-bold text-[#6D123F]">
                          {opt.dailyPortionLabel}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-100 space-y-0.5 text-[11px] text-stone-500">
                        <p className="font-semibold text-stone-700">⏱️ {opt.estimatedTimePerDay}</p>
                        <p>{sched.activeDays} hari aktif • {sched.dailyQuota} langkah/hari</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#fdfbf7] border border-[#6D123F]/20 rounded-xl p-4 text-xs text-stone-700 leading-relaxed space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-sm text-[#6D123F]">
                  Ringkasan Target: {paceMeta.monthlyPagesLabel} ({paceMeta.durationMonths} Bulan)
                </span>
                {paceMeta.isRecommended && (
                  <Badge className="bg-[#6D123F] text-[#D4AF37] border-none text-[10px] font-black">
                    Rekomendasi Utama
                  </Badge>
                )}
              </div>
              <p className="text-stone-700">
                Total <strong>{totalPagesSelected} halaman</strong> diselesaikan dalam waktu{" "}
                <strong>{preview.activeDays} hari aktif belajar</strong>
                {preview.activeDays !== 40 && (
                  <span className="text-stone-500 font-medium"> (~{(preview.activeDays / 20).toFixed(1)} bulan)</span>
                )}. Porsi harian:{" "}
                <strong className="text-stone-900">{paceMeta.dailyPortionLabel}</strong> (setara{" "}
                <span className="text-[#6D123F] font-bold">{preview.dailyQuota} langkah sistematis/hari</span>).
              </p>
              <p className="text-[11px] text-stone-500">
                📅 Periode estimasi: <strong>{formatDate(startDateKey, false, true)}</strong> s.d.{" "}
                <strong>{formatDate(preview.endDate, true, true)}</strong> dengan komitmen{" "}
                <strong>{activeDaysPerWeek} hari aktif per pekan</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jadwal per langkah, dikelompokkan per pekan */}
      <Card className="border border-stone-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#6D123F]" />
            <CardTitle className="text-base font-black">
              {showForm ? 'Pratinjau Jadwal' : 'Jadwal Per Langkah'} ({activeSchedule.days.length} hari aktif)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Urutan baku tiap halaman: {TIKRAR_STEPS.map((s) => s.shortLabel).join(' → ')}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {weeks.map(({ week, days }) => {
            const isOpen = openWeek === week;
            const weekDone = !showForm && days.every((d) => completedGlobal >= d.toStep);
            return (
              <div key={week} className="border border-stone-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedWeek(isOpen ? -1 : week)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50 hover:bg-stone-100 text-left"
                >
                  <span className="text-xs font-black text-stone-800">
                    Pekan {week} • {formatDate(days[0].date, false, true)} – {formatDate(days[days.length - 1].date, false, true)}
                  </span>
                  <span className="flex items-center gap-2">
                    {weekDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-stone-100">
                    {days.map((d) => {
                      const done = !showForm && completedGlobal >= d.toStep;
                      const isToday = d.date === todayKey;
                      const overdue = !showForm && !done && d.date < todayKey;
                      return (
                        <div
                          key={d.date}
                          className={cn('px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2', isToday && 'bg-amber-50/70')}
                        >
                          <div className="w-32 shrink-0">
                            <p className="text-xs font-black text-stone-900">
                              {DAY_NAMES_ID[getDayOfWeekFromKey(d.date)]}, {formatDate(d.date)}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] font-bold',
                                done ? 'text-emerald-700' : overdue ? 'text-red-600' : isToday ? 'text-amber-700' : 'text-stone-400'
                              )}
                            >
                              {done ? '✓ Tuntas' : overdue ? 'Terlewat' : isToday ? 'Hari ini' : `Hari ke-${d.dayIndex}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {d.items.map((it, idx) => {
                              const g = d.fromStep + idx;
                              const itemDone = !showForm && completedGlobal > g;
                              return (
                                <span
                                  key={`${it.page}-${it.stepIndex}`}
                                  className={cn(
                                    'px-2 py-0.5 rounded-md text-[10px] font-bold border',
                                    itemDone
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : it.stepIndex === STEPS_PER_PAGE - 1
                                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                                      : 'bg-white border-stone-200 text-stone-700'
                                  )}
                                >
                                  Hal. {it.page} • {it.shortLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
