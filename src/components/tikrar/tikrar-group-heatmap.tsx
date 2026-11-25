'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCollection, useUser } from '@/db';
import { authFetch } from '@/db/client';
import { cn } from '@/lib/utils';
import {
  addCalendarDays,
  getDayOfWeekFromKey,
  parseDateKeyUTC,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import { HEATMAP_COLORS, type HeatmapLevel } from '@/lib/tikrar-steps';
import { ChevronLeft, ChevronRight, Flame, Loader2, LogIn, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';

export interface TikrarGroupHeatmapProps {
  refreshSignal?: number;
}

interface MemberRow {
  id: string;
  isMe: boolean;
  name: string;
  points: number;
  targetDays: number;
  weeklyMet: number;
  streak: number;
  today: {
    hasTarget: boolean;
    clicks: number;
    stepsToday: number;
    dailyQuota: number;
    clicksTarget: number;
    met: boolean;
  };
  days: { date: string; level: HeatmapLevel; clicks: number; steps: number; tasmi: string[] | null }[];
}

const DAY_NAMES_ID = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const LEGEND: { level: HeatmapLevel; label: string }[] = [
  { level: 'none', label: 'Tidak klik counter' },
  { level: 'active', label: 'Aktif, target belum tercapai' },
  { level: 'met', label: 'Target hari itu tercapai' },
  { level: 'tasmi', label: "Lulus setoran Tasmi'" },
];

function buildMockGroupMembers(shownMonthKey: string, todayKey: string): MemberRow[] {
  const [y, m] = shownMonthKey.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fromKey = `${shownMonthKey}-01`;
  const dateKeys: string[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    dateKeys.push(addCalendarDays(fromKey, i));
  }

  const samples = [
    {
      id: 'mock-1',
      isMe: true,
      name: 'A. R. (Contoh)',
      points: 840,
      targetDays: 5,
      weeklyMet: 4,
      streak: 5,
      today: { hasTarget: true, clicks: 82, stepsToday: 6, dailyQuota: 6, clicksTarget: 82, met: true },
      pattern: (dayIdx: number, dow: number) =>
        dow === 0
          ? ('none' as HeatmapLevel)
          : dayIdx % 9 === 4
          ? ('tasmi' as HeatmapLevel)
          : dayIdx % 4 === 1
          ? ('active' as HeatmapLevel)
          : ('met' as HeatmapLevel),
    },
    {
      id: 'mock-2',
      isMe: false,
      name: 'S. M. (Contoh)',
      points: 755,
      targetDays: 6,
      weeklyMet: 5,
      streak: 4,
      today: { hasTarget: true, clicks: 94, stepsToday: 6, dailyQuota: 6, clicksTarget: 94, met: true },
      pattern: (dayIdx: number, dow: number) =>
        dow === 0 || dow === 6
          ? ('none' as HeatmapLevel)
          : dayIdx % 11 === 6
          ? ('tasmi' as HeatmapLevel)
          : dayIdx % 3 === 0
          ? ('met' as HeatmapLevel)
          : ('active' as HeatmapLevel),
    },
    {
      id: 'mock-3',
      isMe: false,
      name: 'N. H. (Contoh)',
      points: 665,
      targetDays: 5,
      weeklyMet: 3,
      streak: 2,
      today: { hasTarget: true, clicks: 45, stepsToday: 3, dailyQuota: 6, clicksTarget: 120, met: false },
      pattern: (dayIdx: number, dow: number) =>
        dow === 0 || dow === 5
          ? ('none' as HeatmapLevel)
          : dayIdx % 5 === 0
          ? ('met' as HeatmapLevel)
          : dayIdx % 2 === 0
          ? ('active' as HeatmapLevel)
          : ('none' as HeatmapLevel),
    },
    {
      id: 'mock-4',
      isMe: false,
      name: 'F. Z. (Contoh)',
      points: 590,
      targetDays: 5,
      weeklyMet: 2,
      streak: 1,
      today: { hasTarget: true, clicks: 28, stepsToday: 2, dailyQuota: 5, clicksTarget: 110, met: false },
      pattern: (dayIdx: number, dow: number) =>
        dow === 0 || dow === 6
          ? ('none' as HeatmapLevel)
          : dayIdx % 4 === 2
          ? ('met' as HeatmapLevel)
          : dayIdx % 3 === 1
          ? ('active' as HeatmapLevel)
          : ('none' as HeatmapLevel),
    },
  ];

  return samples.map((s, sIdx) => ({
    id: s.id,
    isMe: s.isMe,
    name: s.name,
    points: s.points,
    targetDays: s.targetDays,
    weeklyMet: s.weeklyMet,
    streak: s.streak,
    today: s.today,
    days: dateKeys.map((d, idx) => {
      const isFuture = d > todayKey;
      const dow = getDayOfWeekFromKey(d);
      const level: HeatmapLevel = isFuture
        ? 'none'
        : d === todayKey
        ? s.today.met
          ? 'met'
          : s.today.clicks > 0
          ? 'active'
          : 'none'
        : s.pattern(idx + 1, dow);
      const clicks =
        level === 'tasmi' ? 120 : level === 'met' ? 85 : level === 'active' ? 35 : 0;
      const steps =
        level === 'tasmi' ? 6 : level === 'met' ? 6 : level === 'active' ? 2 : 0;
      const tasmi = level === 'tasmi' ? [`Hal. ${582 + sIdx}`] : null;
      return { date: d, level, clicks, steps, tasmi };
    }),
  }));
}

export function TikrarGroupHeatmap({ refreshSignal = 0 }: TikrarGroupHeatmapProps) {
  const { user } = useUser();

  const halaqahOptions = useMemo(
    () => ({ filters: [{ column: 'program_type', operator: '==', value: 'tikrar_daily' }] }),
    []
  );
  const { data: tikrarHalaqahs } = useCollection<any>('halaqahs', halaqahOptions);

  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>('all');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [todayKey, setTodayKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  // Bulan kalender yang ditampilkan (YYYY-MM); kosong = bulan berjalan
  const [month, setMonth] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const shownMonth = month || currentMonth;
  const shiftMonth = (delta: number) => {
    if (!shownMonth) return;
    const [y, m] = shownMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (currentMonth && next > currentMonth) return;
    setMonth(next);
  };
  const monthLabel = shownMonth
    ? new Date(`${shownMonth}-01T12:00:00Z`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';

  const load = useCallback(async () => {
    if (!user?.id) {
      const tk = toDateKeyWIB();
      const cm = tk.slice(0, 7);
      const targetMonth = month && month <= cm ? month : cm;
      setTodayKey(tk);
      setCurrentMonth(cm);
      setIsAdminView(false);
      setMembers(buildMockGroupMembers(targetMonth, tk));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await authFetch(
        `/api/tikrar/group-activity?halaqah=${encodeURIComponent(selectedHalaqahFilter)}${month ? `&month=${month}` : ''}`
      );
      const json = await res.json();
      if (res.ok) {
        setMembers(json.data?.members || []);
        setTodayKey(json.data?.todayKey || '');
        setCurrentMonth(json.data?.currentMonth || '');
        setIsAdminView(Boolean(json.data?.isAdminView));
      }
    } catch (e) {
      console.warn('Gagal memuat keaktifan grup:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, selectedHalaqahFilter, month]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const isGuestMockup = !user?.id;

  return (
    <Card className="border border-stone-200 bg-white shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {isGuestMockup && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge className="bg-amber-700 text-white hover:bg-amber-700 text-[10px] font-black shrink-0">
                <Sparkles className="w-3 h-3 mr-1" /> CONTOH REKAP GRUP
              </Badge>
              <span className="text-xs font-bold text-amber-950">
                Data di bawah ini hanya simulasi contoh tampilan. Masuk akun untuk melihat progres grup asli.
              </span>
            </div>
            <Button
              asChild
              size="sm"
              className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-black shrink-0"
            >
              <Link href="/login">
                <LogIn className="w-3.5 h-3.5 mr-1.5" /> Masuk Akun
              </Link>
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                {isGuestMockup ? 'Contoh Pantau Progres Anggota Grup' : 'Pantau Progres Anggota Grup'}
              </h3>
              {!isGuestMockup && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-bold',
                    isAdminView
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-stone-200 bg-stone-50 text-stone-600'
                  )}
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {isAdminView ? 'Mode Admin (Nama Lengkap)' : 'Privasi: Nama Inisial'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Keaktifan hari ini diakui bila target langkah harian tercapai. Streak dihitung dari hari aktif terjadwal.
              {!isGuestMockup && !isAdminView && ' Nama peserta ditampilkan dalam inisial (hanya Admin/Musyrifah yang melihat nama lengkap).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-stone-600 font-semibold">
            {LEGEND.map((l) => (
              <span key={l.level} className="inline-flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-[3px] inline-block border border-stone-300"
                  style={{ backgroundColor: HEATMAP_COLORS[l.level] }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-primary hover:bg-white"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-black text-stone-900 capitalize">{monthLabel || 'Memuat…'}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={!shownMonth || shownMonth >= currentMonth}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-primary hover:bg-white disabled:opacity-30"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap border-b border-stone-100 pb-3">
          <button
            type="button"
            onClick={() => setSelectedHalaqahFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors',
              selectedHalaqahFilter === 'all' ? 'bg-primary text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            )}
          >
            Semua Sesi Tikrar
          </button>
          {(tikrarHalaqahs || []).map((h: any) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelectedHalaqahFilter(h.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors',
                selectedHalaqahFilter === h.id ? 'bg-primary text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {String(h.title || '').replace('Hi Tikrar - ', '')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-bold">Memuat heatmap keaktifan grup...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
            <p className="text-sm font-bold text-stone-700">Belum ada anggota pada sesi halaqah ini.</p>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-col gap-2.5">
              {members.slice(0, 50).map((member, index) => {
                const metWeekly = member.weeklyMet >= member.targetDays;
                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border',
                      member.isMe ? 'bg-amber-50/40 border-[#D4AF37]' : 'bg-[#fafaf9] border-stone-200/70'
                    )}
                  >
                    <div className="min-w-0 w-full lg:w-[230px] shrink-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">
                          {index + 1}. {member.name}
                        </span>
                        {member.isMe && (
                          <Badge className="bg-primary text-white hover:bg-primary text-[9px] font-black h-4 px-1.5">
                            {isGuestMockup ? 'Simulasi Anda' : 'Anda'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <span className={cn('font-extrabold', metWeekly ? 'text-emerald-700' : 'text-amber-600')}>
                          {metWeekly ? '✓' : '•'} {member.weeklyMet}/{member.targetDays} target pekan ini
                        </span>
                        {member.streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-orange-700 font-bold">
                            <Flame className="w-3 h-3 fill-orange-500 text-orange-600" />
                            {member.streak}h
                          </span>
                        )}
                      </div>
                      <TodayProgress today={member.today} />
                    </div>

                    <div className="py-1 overflow-x-auto max-w-full">
                      {/* Tanggal 1 s/d akhir bulan: 2 baris x 16 di HP, 1 baris di layar lebar */}
                      <div className="grid gap-x-[3px] gap-y-1 [grid-template-columns:repeat(16,15px)] lg:[grid-template-columns:repeat(31,15px)]">
                        {member.days.map((d) => {
                          const dow = getDayOfWeekFromKey(d.date);
                          const isToday = d.date === todayKey;
                          const isFuture = Boolean(todayKey) && d.date > todayKey;
                          const isWeekend = dow === 0 || dow === 6;
                          const statusText =
                            d.level === 'tasmi'
                              ? `★ Lulus Tasmi' ${d.tasmi?.join(', ')}`
                              : d.level === 'met'
                              ? `Target tercapai • ${d.steps} langkah, ${d.clicks} klik`
                              : d.level === 'active'
                              ? d.clicks > 0
                                ? `Aktif ${d.clicks} klik • ${d.steps} langkah (target belum tercapai)`
                                : 'Aktif (laporan blok tuntas)'
                              : isFuture
                              ? 'Belum terjadi'
                              : 'Tidak ada klik counter';
                          const prettyDate = parseDateKeyUTC(d.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC',
                          });
                          return (
                            <Tooltip key={d.date}>
                              <TooltipTrigger asChild>
                                <div tabIndex={0} className={cn('flex flex-col items-center gap-0.5 cursor-pointer', isFuture && 'opacity-30')}>
                                  <span
                                    className={cn(
                                      'text-[8px] leading-none font-bold tabular-nums',
                                      isToday ? 'text-primary font-black' : isWeekend ? 'text-stone-400' : 'text-stone-500'
                                    )}
                                  >
                                    {Number(d.date.slice(8))}
                                  </span>
                                  <span
                                    style={{ backgroundColor: HEATMAP_COLORS[d.level] }}
                                    className={cn(
                                      'w-3.5 h-3.5 rounded-[3px] border border-stone-200 transition-transform hover:scale-125 flex items-center justify-center',
                                      isToday && 'ring-1 ring-primary ring-offset-1'
                                    )}
                                  >
                                    {d.level === 'tasmi' && <Star className="w-2.5 h-2.5 text-white fill-white" />}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipContent className="bg-stone-900 text-white border-none text-xs px-3 py-1.5 z-[100]">
                                  <p className="font-bold">
                                    {DAY_NAMES_ID[dow]}, {prettyDate} {isToday ? '(Hari Ini)' : ''}
                                  </p>
                                  <p className="text-[11px] opacity-90">{statusText}</p>
                                </TooltipContent>
                              </TooltipPortal>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lg:w-[88px] shrink-0 text-left lg:text-right">
                      <span className="font-black text-xs sm:text-sm text-primary">{member.points} Poin</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

/** Progres klik hari ini menuju target harian (hijau pekat) */
function TodayProgress({ today }: { today?: MemberRow['today'] }) {
  if (!today) return null;
  if (!today.hasTarget) {
    return <p className="text-[11px] font-semibold text-stone-400 pt-1">Belum mengisi target</p>;
  }
  const pct = today.met
    ? 100
    : today.clicksTarget > 0
    ? Math.min(100, Math.round((today.clicks / today.clicksTarget) * 100))
    : 0;
  return (
    <div className="pt-1.5 space-y-1 w-full max-w-[230px]">
      <p className={cn('text-[11px] font-bold', today.met ? 'text-emerald-700' : 'text-stone-600')}>
        {today.met
          ? `✓ Target hari ini tercapai • ${today.clicks} klik`
          : `Hari ini: ${today.clicks}/${today.clicksTarget} klik • ${today.stepsToday}/${today.dailyQuota} langkah`}
      </p>
      <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: today.met ? HEATMAP_COLORS.met : '#4ade80' }}
        />
      </div>
      {!today.met && today.clicksTarget > today.clicks && (
        <p className="text-[10px] text-stone-500">
          ±{today.clicksTarget - today.clicks} klik lagi untuk hijau pekat
        </p>
      )}
    </div>
  );
}
