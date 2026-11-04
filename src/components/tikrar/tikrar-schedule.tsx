'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useUser } from '@/db';
import { authFetch } from '@/db/client';
import { cn } from '@/lib/utils';
import {
  BLOCK_LETTERS,
  generateTikrarSchedule,
  getDayOfWeekFromKey,
  getJuzPageRange,
  parseDateKeyUTC,
  TIKRAR_PACE_OPTIONS,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Loader2,
  Lock,
  Pencil,
  Sparkles,
  Target,
} from 'lucide-react';

export interface TikrarScheduleProps {
  onScheduleSaved?: (target?: { page: number; juz: number }) => void;
  onOpenMushafTarget?: (target: { page: number; juz: number }) => void;
  onJumpToDailyReport?: () => void;
  refreshSignal?: number;
}

const DAY_NAMES_ID = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function TikrarSchedule({
  onScheduleSaved,
  onOpenMushafTarget,
  onJumpToDailyReport,
  refreshSignal = 0,
}: TikrarScheduleProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: userData, refresh: refreshUser } = useDoc<any>(user?.id ? 'users' : null, user?.id);

  const halaqahOptions = useMemo(
    () => ({
      filters: [{ column: 'program_type', operator: '==', value: 'tikrar_daily' }],
    }),
    []
  );
  const { data: tikrarHalaqahs } = useCollection<any>('halaqahs', halaqahOptions);

  const schedulesOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
      orderBy: { column: 'scheduled_date', ascending: true },
    }),
    [user?.id]
  );
  const {
    data: savedSchedules,
    isLoading: loadingSchedules,
    refresh: refreshSchedules,
  } = useCollection<any>(user?.id ? 'tikrar_user_schedules' : null, schedulesOptions);

  const logsOptions = useMemo(
    () => ({
      filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    }),
    [user?.id]
  );
  const { data: userLogs, refresh: refreshLogs } = useCollection<any>(
    user?.id ? 'tikrar_daily_logs' : null,
    logsOptions
  );

  useEffect(() => {
    if (refreshSignal > 0 && user?.id) {
      refreshUser();
      refreshSchedules();
      refreshLogs();
    }
  }, [refreshSignal, user?.id, refreshUser, refreshSchedules, refreshLogs]);

  const todayKey = useMemo(() => toDateKeyWIB(), []);

  // Form states
  const [selectedJuz, setSelectedJuz] = useState<number>(30);
  const [durationMonths, setDurationMonths] = useState<1 | 2 | 3 | 4>(2);
  const [activeDaysPerWeek, setActiveDaysPerWeek] = useState<number>(5);
  const [startDateKey, setStartDateKey] = useState<string>(todayKey);
  const [selectedHalaqahId, setSelectedHalaqahId] = useState<string>('');
  const [hasInitializedForm, setHasInitializedForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  // Status edit: default tertutup (false) jika jadwal sudah ada di DB, terbuka (true) jika baru pertama kali
  const [isEditingSchedule, setIsEditingSchedule] = useState<boolean>(false);
  const [hasCheckedInitialEditState, setHasCheckedInitialEditState] = useState(false);

  useEffect(() => {
    if (userData && !hasInitializedForm) {
      const savedJuz = Number(userData.paidJuz ?? userData.paid_juz);
      if (savedJuz >= 1 && savedJuz <= 30) setSelectedJuz(savedJuz);

      const savedDur = Number(userData.tikrar_target_duration_months);
      if (savedDur >= 1 && savedDur <= 4) {
        setDurationMonths(savedDur as 1 | 2 | 3 | 4);
      }

      const savedDays = Number(userData.tikrar_active_days_per_week);
      if (savedDays >= 1 && savedDays <= 7) setActiveDaysPerWeek(savedDays);

      if (userData.tikrar_start_date) {
        setStartDateKey(toDateKeyWIB(userData.tikrar_start_date));
      }

      if (userData.tikrar_halaqah_id) {
        setSelectedHalaqahId(userData.tikrar_halaqah_id);
      }
      setHasInitializedForm(true);
    }
  }, [userData, hasInitializedForm]);

  useEffect(() => {
    if (!selectedHalaqahId && tikrarHalaqahs && tikrarHalaqahs.length > 0) {
      setSelectedHalaqahId(userData?.tikrar_halaqah_id || tikrarHalaqahs[0].id);
    }
  }, [tikrarHalaqahs, selectedHalaqahId, userData?.tikrar_halaqah_id]);

  // Live preview calculation using `generateTikrarSchedule`
  const previewSchedule = useMemo(
    () =>
      generateTikrarSchedule({
        juz: selectedJuz,
        durationMonths,
        activeDaysPerWeek,
        startDate: startDateKey,
      }),
    [selectedJuz, durationMonths, activeDaysPerWeek, startDateKey]
  );

  // Completed blocks set from daily logs so both saved & preview items reflect true completion
  const completedBlockKeys = useMemo(() => {
    const s = new Set<string>();
    (userLogs || []).forEach((log: any) => {
      if (!log?.completed) return;
      const arr = Array.isArray(log.blocks_completed) ? log.blocks_completed : [];
      arr.forEach((b: any) => {
        s.add(`${Number(log.page_number)}:${Number(b)}`);
      });
    });
    return s;
  }, [userLogs]);

  // Active schedule rows for the selected Juz (use DB rows if generated for this Juz, else live preview)
  const savedForSelectedJuz = useMemo(
    () =>
      (savedSchedules || []).filter((r: any) => Number(r.juz) === selectedJuz),
    [savedSchedules, selectedJuz]
  );

  const isDisplayingSavedDbSchedule = savedForSelectedJuz.length > 0;

  useEffect(() => {
    if (!loadingSchedules && !hasCheckedInitialEditState) {
      if (!isDisplayingSavedDbSchedule) {
        setIsEditingSchedule(true);
      } else {
        setIsEditingSchedule(false);
      }
      setHasCheckedInitialEditState(true);
    }
  }, [loadingSchedules, isDisplayingSavedDbSchedule, hasCheckedInitialEditState]);

  // Current pace meta information
  const currentPaceOption = useMemo(
    () =>
      TIKRAR_PACE_OPTIONS.find((p) => p.durationMonths === durationMonths) ||
      TIKRAR_PACE_OPTIONS[1],
    [durationMonths]
  );

  const juzRange = useMemo(() => getJuzPageRange(selectedJuz), [selectedJuz]);

  // Group schedule slots into Daily Cards -> Weekly Accordions (5 active days/week)
  const weeklyGroups = useMemo(() => {
    const rawItems = isDisplayingSavedDbSchedule
      ? savedForSelectedJuz.map((r: any) => ({
          juz: Number(r.juz),
          page_number: Number(r.page_number),
          block_number: Number(r.block_number) as 1 | 2 | 3 | 4,
          block_letter: BLOCK_LETTERS[Number(r.block_number)] || 'A',
          scheduled_date: toDateKeyWIB(r.scheduled_date),
          status:
            r.status === 'completed' ||
            completedBlockKeys.has(`${Number(r.page_number)}:${Number(r.block_number)}`)
              ? 'completed'
              : toDateKeyWIB(r.scheduled_date) < todayKey
              ? 'overdue'
              : 'pending',
        }))
      : previewSchedule.items.map((item) => ({
          ...item,
          status: completedBlockKeys.has(`${item.page_number}:${item.block_number}`)
            ? 'completed'
            : item.scheduled_date < todayKey
            ? 'overdue'
            : 'pending',
        }));

    // Group by date first
    const byDateMap = new Map<
      string,
      {
        dateKey: string;
        blocks: typeof rawItems;
        allCompleted: boolean;
        isToday: boolean;
        isOverdue: boolean;
      }
    >();

    for (const item of rawItems) {
      const existing = byDateMap.get(item.scheduled_date);
      if (!existing) {
        byDateMap.set(item.scheduled_date, {
          dateKey: item.scheduled_date,
          blocks: [item],
          allCompleted: item.status === 'completed',
          isToday: item.scheduled_date === todayKey,
          isOverdue: item.status === 'overdue',
        });
      } else {
        existing.blocks.push(item);
        existing.allCompleted = existing.allCompleted && item.status === 'completed';
        existing.isOverdue = existing.isOverdue || item.status === 'overdue';
      }
    }

    const sortedDays = Array.from(byDateMap.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey)
    );

    const perWeek = Math.max(1, activeDaysPerWeek);
    const weeks: {
      weekNumber: number;
      startDate: string;
      endDate: string;
      days: typeof sortedDays;
      completedBlocks: number;
      totalBlocks: number;
      containsToday: boolean;
    }[] = [];

    for (let i = 0; i < sortedDays.length; i += perWeek) {
      const slice = sortedDays.slice(i, i + perWeek);
      const totalBlocks = slice.reduce((acc, d) => acc + d.blocks.length, 0);
      const completedBlocks = slice.reduce(
        (acc, d) => acc + d.blocks.filter((b) => b.status === 'completed').length,
        0
      );
      weeks.push({
        weekNumber: Math.floor(i / perWeek) + 1,
        startDate: slice[0].dateKey,
        endDate: slice[slice.length - 1].dateKey,
        days: slice,
        completedBlocks,
        totalBlocks,
        containsToday: slice.some((d) => d.isToday),
      });
    }

    return weeks;
  }, [
    isDisplayingSavedDbSchedule,
    savedForSelectedJuz,
    previewSchedule.items,
    completedBlockKeys,
    todayKey,
    activeDaysPerWeek,
  ]);

  // Auto-open the week containing today (or first incomplete week)
  useEffect(() => {
    const todayWeek = weeklyGroups.find((w) => w.containsToday);
    if (todayWeek) {
      setExpandedWeek(todayWeek.weekNumber);
      return;
    }
    const firstIncomplete = weeklyGroups.find((w) => w.completedBlocks < w.totalBlocks);
    if (firstIncomplete) setExpandedWeek(firstIncomplete.weekNumber);
  }, [weeklyGroups.length]);

  const totalCompletedBlocksInJuz = useMemo(
    () =>
      weeklyGroups.reduce((acc, w) => acc + w.completedBlocks, 0),
    [weeklyGroups]
  );

  // Active target page to jump to
  const activeTargetPage = useMemo(() => {
    const firstPending = savedForSelectedJuz.find((r: any) => {
      const isDone =
        r.status === 'completed' ||
        completedBlockKeys.has(`${Number(r.page_number)}:${Number(r.block_number)}`);
      return !isDone;
    });
    if (firstPending) {
      return Number(firstPending.page_number);
    }
    const userCurr = Number(userData?.tikrar_current_page);
    if (userCurr >= juzRange.startPage && userCurr <= juzRange.endPage) {
      return userCurr;
    }
    return juzRange.startPage;
  }, [savedForSelectedJuz, completedBlockKeys, userData?.tikrar_current_page, juzRange]);

  const handleCancelEdit = () => {
    if (userData) {
      const savedJuz = Number(userData.paidJuz ?? userData.paid_juz);
      if (savedJuz >= 1 && savedJuz <= 30) setSelectedJuz(savedJuz);
      const savedDur = Number(userData.tikrar_target_duration_months);
      if (savedDur >= 1 && savedDur <= 4) setDurationMonths(savedDur as 1 | 2 | 3 | 4);
      const savedDays = Number(userData.tikrar_active_days_per_week);
      if (savedDays >= 1 && savedDays <= 7) setActiveDaysPerWeek(savedDays);
      if (userData.tikrar_start_date) setStartDateKey(toDateKeyWIB(userData.tikrar_start_date));
    }
    setIsEditingSchedule(false);
  };

  const handleSaveAndGenerate = async () => {
    if (!user) {
      toast({
        title: 'Silakan Masuk Terlebih Dahulu',
        description: 'Masuk ke akun Ukhti untuk menyimpan target Juz & jadwal harian permanen.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await authFetch('/api/tikrar/schedule', {
        method: 'POST',
        body: JSON.stringify({
          juz: selectedJuz,
          duration_months: durationMonths,
          active_days_per_week: activeDaysPerWeek,
          start_date: startDateKey,
          halaqah_id: selectedHalaqahId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || 'Gagal menyimpan jadwal Tikrar.');
      }

      const summary = json.data?.summary;
      const targetPage = Number(summary?.currentPage || summary?.startPage || previewSchedule.startPage);
      const targetJuz = Number(summary?.juz || selectedJuz);

      toast({
        title: 'Target & Jadwal Berhasil Disimpan!',
        description: `Target Juz ${selectedJuz} (${summary?.totalBlocks || previewSchedule.totalBlocks} Blok) telah aktif. Membuka Mushaf Hal. ${targetPage}...`,
      });
      setIsEditingSchedule(false);
      await Promise.all([refreshUser(), refreshSchedules()]);
      onScheduleSaved?.({ page: targetPage, juz: targetJuz });
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan Jadwal',
        description: err?.message || 'Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Tampilan Saat Jadwal Sudah Dipilih & Tidak Sedang Diedit (Tampilan Tertutup / Ringkasan Aktif) */}
      {!isEditingSchedule && isDisplayingSavedDbSchedule ? (
        <Card className="border border-stone-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#800000] text-white border-b-4 border-[#D4AF37] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-1">
                  <Target className="w-3.5 h-3.5" /> Target &amp; Jadwal Berjalan
                </div>
                <CardTitle className="text-xl font-headline font-black flex items-center gap-2">
                  <span>Juz {selectedJuz}</span>
                  <span className="text-xs font-normal text-white/80">
                    (Hal. {juzRange.startPage}–{juzRange.endPage} • {juzRange.totalPages} Hal)
                  </span>
                </CardTitle>
                <CardDescription className="text-white/80 text-xs mt-0.5">
                  Ritme {currentPaceOption.name} • {activeDaysPerWeek} Hari Aktif/Pekan
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge className="bg-[#D4AF37] text-stone-950 hover:bg-[#D4AF37] font-black text-[10px] shadow-sm">
                  ✓ Jadwal Aktif
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingSchedule(true)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-black text-xs h-9 px-3.5 rounded-xl shadow-sm transition-all"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                  Ubah / Edit Jadwal
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* 4 Kartu Metrik Ringkasan Target */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Kecepatan (Pace)</p>
                <p className="text-sm font-black text-stone-900">{currentPaceOption.name}</p>
                <p className="text-[11px] font-bold text-[#800000]">{currentPaceOption.targetLabel}</p>
              </div>

              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Hari Belajar</p>
                <p className="text-sm font-black text-stone-900">{activeDaysPerWeek} Hari / Pekan</p>
                <p className="text-[11px] text-stone-500">Sabtu &amp; Ahad toleransi</p>
              </div>

              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Periode Belajar</p>
                <p className="text-sm font-black text-emerald-800">
                  {parseDateKeyUTC(previewSchedule.estimatedEndDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </p>
                <p className="text-[11px] text-stone-500">
                  Mulai:{' '}
                  {parseDateKeyUTC(startDateKey).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'UTC',
                  })}
                </p>
              </div>

              <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-black uppercase text-stone-500">Progres Blok</p>
                <p className="text-sm font-black text-[#800000]">
                  {totalCompletedBlocksInJuz} / {previewSchedule.totalBlocks} Blok
                </p>
                <p className="text-[11px] font-bold text-stone-600">
                  Target Saat Ini: Hal. {activeTargetPage}
                </p>
              </div>
            </div>

            {/* Quick Action Bar Menuju Mushaf Target */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#800000] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-stone-900">
                    Lanjutkan Latihan Tikrar Halaman {activeTargetPage}
                  </h4>
                  <p className="text-xs text-stone-600">
                    Buka mushaf sub-blok, simak murattal 5x, dan lakukan repetisi hafalan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    onOpenMushafTarget
                      ? onOpenMushafTarget({ page: activeTargetPage, juz: selectedJuz })
                      : onScheduleSaved?.({ page: activeTargetPage, juz: selectedJuz })
                  }
                  className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-10 px-5 rounded-xl shadow-md gap-2 shrink-0"
                >
                  <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                  Buka Mushaf Target (Hal. {activeTargetPage})
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Form Konfigurasi Target & Generator Jadwal (Saat Baru Pertama Kali atau Sedang Klik Edit) */
        <Card className="border border-stone-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-[#800000] text-white border-b-4 border-[#D4AF37]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-1">
                  <Target className="w-3.5 h-3.5" />{' '}
                  {isDisplayingSavedDbSchedule ? 'Pengaturan Target' : 'Fase Perencanaan Mandiri'}
                </div>
                <CardTitle className="text-xl font-headline font-black">
                  {isDisplayingSavedDbSchedule
                    ? 'Ubah Target & Ritme Belajar'
                    : 'Target Juz & Generator Jadwal'}
                </CardTitle>
                <CardDescription className="text-white/80 text-xs mt-1">
                  Tentukan 1 Juz pilihan dan kecepatan belajar ({activeDaysPerWeek} hari aktif/pekan).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {isDisplayingSavedDbSchedule && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs h-9 px-3 rounded-xl"
                  >
                    Batal
                  </Button>
                )}
                {user && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleSaveAndGenerate}
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-stone-950 font-black text-xs h-9 px-4 rounded-xl shadow-md border border-amber-300"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Simpan Jadwal
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* 2. Pilihan Juz, Hari Aktif & Tanggal Mulai */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  1. Target Juz Pilihan
                </label>
                <select
                  aria-label="Pilih Target Juz"
                  value={selectedJuz}
                  onChange={(e) => setSelectedJuz(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-black text-[#800000]"
                >
                  {Array.from({ length: 30 }, (_, idx) => {
                    const j = idx + 1;
                    const r = getJuzPageRange(j);
                    return (
                      <option key={j} value={j}>
                        Juz {j} (Hal. {r.startPage}–{r.endPage} • {r.totalPages} Hal)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  2. Hari Aktif / Pekan
                </label>
                <select
                  aria-label="Pilih Hari Aktif per Pekan"
                  value={activeDaysPerWeek}
                  onChange={(e) => setActiveDaysPerWeek(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800"
                >
                  <option value={5}>5 Hari Kerja (Senin – Jumat) • Standar</option>
                  <option value={4}>4 Hari / Pekan (Senin – Kamis)</option>
                  <option value={6}>6 Hari / Pekan (Senin – Sabtu)</option>
                  <option value={3}>3 Hari / Pekan (Ringan)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                  3. Tanggal Mulai
                </label>
                <Input
                  type="date"
                  value={startDateKey}
                  onChange={(e) => setStartDateKey(e.target.value || todayKey)}
                  className="h-10 rounded-xl border-stone-300 font-bold text-sm"
                />
              </div>
            </div>

            {/* 3. Pilihan Pace / Target Durasi 1 Juz */}
            <div className="space-y-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700">
                4. Pilih Kecepatan Hafalan (Pace 1 Juz)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TIKRAR_PACE_OPTIONS.map((opt) => {
                  const active = durationMonths === opt.durationMonths;
                  return (
                    <button
                      key={opt.durationMonths}
                      type="button"
                      onClick={() => setDurationMonths(opt.durationMonths)}
                      className={cn(
                        'text-left p-4 rounded-xl border-2 transition-all space-y-1.5',
                        active
                          ? 'border-[#800000] bg-red-50/40 shadow-sm'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-stone-900">{opt.name}</span>
                        <Badge
                          className={cn(
                            'text-[10px] font-black',
                            active
                              ? 'bg-[#800000] text-white hover:bg-[#800000]'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-100'
                          )}
                        >
                          {opt.badge}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-[#800000]">{opt.targetLabel}</p>
                      <p className="text-[11px] text-stone-500 leading-relaxed">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ringkasan Kalkulasi Otomatis & Tombol Generate */}
            <div className="bg-[#fdfbf7] border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                <div>
                  <p className="text-[10px] font-black uppercase text-stone-500">Rentang Mushaf</p>
                  <p className="text-sm font-black text-[#800000]">
                    Hal. {juzRange.startPage}–{juzRange.endPage}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-stone-500">Total Target</p>
                  <p className="text-sm font-black text-stone-900">
                    {previewSchedule.totalPages} Hal ({previewSchedule.totalBlocks} Blok)
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-stone-500">Hari Belajar</p>
                  <p className="text-sm font-black text-stone-900">
                    {previewSchedule.totalActiveDays} Hari Aktif
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-stone-500">Estimasi Khatam</p>
                  <p className="text-sm font-black text-emerald-700">
                    {parseDateKeyUTC(previewSchedule.estimatedEndDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>
              </div>

              {user ? (
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAndGenerate}
                  className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-11 px-6 rounded-xl shadow-md shrink-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan Jadwal...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-[#D4AF37]" />
                      Simpan Target &amp; Generate Jadwal
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  asChild
                  className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-11 px-6 rounded-xl shrink-0"
                >
                  <Link href="/login">
                    <Lock className="w-3.5 h-3.5 mr-2" /> Masuk untuk Simpan Jadwal
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Rencana Harian per Pekan */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-lg font-black font-headline text-stone-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#800000]" />
              Kalender Jadwal Harian Juz {selectedJuz}{' '}
              {!isDisplayingSavedDbSchedule && (
                <Badge variant="outline" className="text-[10px] font-bold border-amber-300 text-amber-800">
                  Pratinjau (Klik Simpan untuk Mengaktifkan)
                </Badge>
              )}
            </h3>
            <p className="text-xs text-stone-500">
              Sabtu &amp; Ahad dikosongkan otomatis sebagai hari murajaah, toleransi, dan sesi
              setoran.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-black text-xs px-3 py-1">
              {totalCompletedBlocksInJuz} / {previewSchedule.totalBlocks} Blok Tuntas
            </Badge>
          </div>
        </div>

        {loadingSchedules ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
              <span className="text-xs font-bold text-stone-500">Memuat jadwal peserta...</span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {weeklyGroups.map((week) => {
              const isOpen = expandedWeek === week.weekNumber;
              const isWeekDone = week.completedBlocks >= week.totalBlocks && week.totalBlocks > 0;
              const startStr = parseDateKeyUTC(week.startDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              });
              const endStr = parseDateKeyUTC(week.endDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              });

              return (
                <Card
                  key={week.weekNumber}
                  className={cn(
                    'border transition-all rounded-2xl overflow-hidden',
                    week.containsToday
                      ? 'border-[#800000] shadow-sm'
                      : isWeekDone
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-stone-200 bg-white'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedWeek(isOpen ? 0 : week.weekNumber)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs',
                          isWeekDone
                            ? 'bg-emerald-600 text-white'
                            : week.containsToday
                            ? 'bg-[#800000] text-white'
                            : 'bg-stone-100 text-stone-700'
                        )}
                      >
                        P{week.weekNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-stone-900">
                            Pekan ke-{week.weekNumber}
                          </span>
                          <span className="text-xs text-stone-500 font-semibold">
                            ({startStr} – {endStr})
                          </span>
                          {week.containsToday && (
                            <Badge className="bg-[#D4AF37] text-black hover:bg-[#D4AF37] text-[9px] font-black h-4">
                              PEKAN INI
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          {week.days.length} Hari Aktif • {week.completedBlocks}/{week.totalBlocks}{' '}
                          Blok Selesai
                        </p>
                      </div>
                    </div>

                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-stone-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {week.days.map((day, dIdx) => {
                        const dow = getDayOfWeekFromKey(day.dateKey);
                        const pretty = parseDateKeyUTC(day.dateKey).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'UTC',
                        });

                        // Group blocks by page for concise display
                        const pageGroups = new Map<number, string[]>();
                        day.blocks.forEach((b) => {
                          const arr = pageGroups.get(b.page_number) || [];
                          arr.push(b.block_letter);
                          pageGroups.set(b.page_number, arr);
                        });

                        return (
                          <div
                            key={day.dateKey}
                            className={cn(
                              'p-3 rounded-xl border flex flex-col justify-between gap-2.5',
                              day.allCompleted
                                ? 'bg-emerald-50/70 border-emerald-200'
                                : day.isToday
                                ? 'bg-amber-50/60 border-[#800000] ring-1 ring-[#800000]/20'
                                : day.isOverdue
                                ? 'bg-rose-50/40 border-rose-200'
                                : 'bg-stone-50/70 border-stone-200'
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-black uppercase text-stone-500">
                                  Hari {dIdx + 1} • {DAY_NAMES_ID[dow]}
                                </span>
                                {day.allCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : day.isToday ? (
                                  <Badge className="bg-[#800000] text-white text-[8px] font-black h-4 px-1.5">
                                    HARI INI
                                  </Badge>
                                ) : day.isOverdue ? (
                                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                                ) : null}
                              </div>
                              <p className="text-xs font-extrabold text-stone-900">{pretty}</p>

                              <div className="space-y-1 pt-0.5">
                                {Array.from(pageGroups.entries()).map(([pNum, letters]) => (
                                  <button
                                    key={pNum}
                                    type="button"
                                    onClick={() => onOpenMushafTarget?.({ page: pNum, juz: selectedJuz })}
                                    className="text-xs font-black text-[#800000] hover:underline flex items-center gap-1 text-left"
                                  >
                                    <BookOpen className="w-3 h-3 shrink-0" />
                                    Hal. {pNum} • Blok {letters.join(', ')}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {day.isToday && !day.allCompleted && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const firstDayPage = Array.from(pageGroups.keys())[0] || activeTargetPage;
                                  if (onOpenMushafTarget) {
                                    onOpenMushafTarget({ page: firstDayPage, juz: selectedJuz });
                                  } else {
                                    onJumpToDailyReport?.();
                                  }
                                }}
                                className="h-7 w-full bg-[#800000] hover:bg-[#800000]/90 text-white text-[10px] font-black rounded-lg"
                              >
                                Buka Mushaf &amp; Lapor
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Sticky Save Button jika sedang dalam mode edit dan jadwal belum tersimpan */}
      {user && isEditingSchedule && !isDisplayingSavedDbSchedule && (
        <div className="sm:hidden fixed bottom-16 left-0 right-0 z-30 p-2.5 bg-[#800000] text-white border-t-2 border-[#D4AF37] shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="min-w-0 flex-1 pl-1">
            <p className="text-[10px] font-black uppercase text-[#D4AF37] leading-tight">
              Target Juz {selectedJuz}
            </p>
            <p className="text-xs font-bold text-white truncate leading-tight">
              {previewSchedule.totalBlocks} Blok • {previewSchedule.totalActiveDays} Hari Aktif
            </p>
          </div>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={handleSaveAndGenerate}
            className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-stone-950 font-black text-xs h-9 px-4 rounded-xl shrink-0 shadow-md"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Simpan Jadwal
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
