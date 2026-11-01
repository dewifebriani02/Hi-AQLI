'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCollection, useDoc, useUser } from '@/db';
import { cn } from '@/lib/utils';
import {
  BLOCK_LETTERS,
  computeTikrarStreakAndWeekly,
  getDayOfWeekFromKey,
  parseDateKeyUTC,
  toDateKeyWIB,
} from '@/lib/tikrar-schedule-generator';
import { Flame, Loader2, Star, Users } from 'lucide-react';

export interface TikrarGroupHeatmapProps {
  refreshSignal?: number;
}

const DAY_NAMES_ID = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function TikrarGroupHeatmap({ refreshSignal = 0 }: TikrarGroupHeatmapProps) {
  const { user } = useUser();
  const { data: myUserData } = useDoc<any>(user?.id ? 'users' : null, user?.id);

  const halaqahOptions = useMemo(
    () => ({
      filters: [{ column: 'program_type', operator: '==', value: 'tikrar_daily' }],
    }),
    []
  );
  const { data: tikrarHalaqahs } = useCollection<any>('halaqahs', halaqahOptions);
  const { data: allUsers, isLoading: loadingUsers, refresh: refreshUsers } =
    useCollection<any>('users');
  const { data: allLogs, isLoading: loadingLogs, refresh: refreshLogs } =
    useCollection<any>('tikrar_daily_logs');
  const { data: allSubmissions, refresh: refreshSubs } =
    useCollection<any>('tikrar_submissions');

  useEffect(() => {
    if (refreshSignal > 0) {
      refreshUsers();
      refreshLogs();
      refreshSubs();
    }
  }, [refreshSignal, refreshUsers, refreshLogs, refreshSubs]);

  const [selectedHalaqahFilter, setSelectedHalaqahFilter] = useState<string>('all');
  const [hasAutoSelectedGroup, setHasAutoSelectedGroup] = useState(false);

  // Auto-select user's own halaqah if they belong to one
  useEffect(() => {
    if (!hasAutoSelectedGroup && myUserData?.tikrar_halaqah_id) {
      setSelectedHalaqahFilter(myUserData.tikrar_halaqah_id);
      setHasAutoSelectedGroup(true);
    }
  }, [myUserData?.tikrar_halaqah_id, hasAutoSelectedGroup]);

  const todayKey = useMemo(() => toDateKeyWIB(), []);
  const { last30DateKeys } = useMemo(
    () => computeTikrarStreakAndWeekly([], todayKey),
    [todayKey]
  );

  const halaqahNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (tikrarHalaqahs || []).forEach((h: any) => {
      if (h?.id) m.set(h.id, h.title || 'Halaqah Tikrar');
    });
    return m;
  }, [tikrarHalaqahs]);

  // Index logs & passed submissions per user and date
  const { logsByUserDate, passedSubsByUserDate, activeUserIds } = useMemo(() => {
    const logMap = new Map<
      string,
      Map<string, { blocksCount: number; pages: number[]; labels: string[] }>
    >();
    const subMap = new Map<string, Map<string, { page: number; grade?: string }>>();
    const activeSet = new Set<string>();

    (allLogs || []).forEach((l: any) => {
      if (!l?.user_id || !l?.completed || !l?.log_date) return;
      activeSet.add(l.user_id);
      const dk = toDateKeyWIB(l.log_date);
      if (!logMap.has(l.user_id)) logMap.set(l.user_id, new Map());
      const uMap = logMap.get(l.user_id)!;
      const blocksArr: number[] = Array.isArray(l.blocks_completed)
        ? l.blocks_completed.map((b: any) => Number(b)).filter((b: number) => b >= 1 && b <= 4)
        : [];
      const prev = uMap.get(dk) || { blocksCount: 0, pages: [], labels: [] };
      const letters = blocksArr.map((b) => BLOCK_LETTERS[b]).join(',');
      uMap.set(dk, {
        blocksCount: prev.blocksCount + Math.max(1, blocksArr.length),
        pages: Array.from(new Set([...prev.pages, Number(l.page_number)])),
        labels: [...prev.labels, `Hal. ${l.page_number} (${letters || 'Selesai'})`],
      });
    });

    (allSubmissions || []).forEach((s: any) => {
      if (!s?.user_id) return;
      activeSet.add(s.user_id);
      if (s.status !== 'passed') return;
      const rawDate = s.verified_at || s.session_date || s.submitted_at;
      if (!rawDate) return;
      const dk = toDateKeyWIB(rawDate);
      if (!subMap.has(s.user_id)) subMap.set(s.user_id, new Map());
      subMap.get(s.user_id)!.set(dk, {
        page: Number(s.page_number),
        grade: s.grade || 'Lulus',
      });
    });

    return {
      logsByUserDate: logMap,
      passedSubsByUserDate: subMap,
      activeUserIds: activeSet,
    };
  }, [allLogs, allSubmissions]);

  const memberRows = useMemo(() => {
    if (!allUsers) return [];

    const candidates = allUsers.filter((u: any) => {
      if (!u?.id) return false;
      const isMe = user?.id === u.id;
      const hasTikrarFlag =
        Boolean(u.tikrar_halaqah_id) ||
        Boolean(u.is_tikrar_paid) ||
        activeUserIds.has(u.id) ||
        isMe;
      if (!hasTikrarFlag) return false;

      if (selectedHalaqahFilter !== 'all') {
        return u.tikrar_halaqah_id === selectedHalaqahFilter;
      }
      return true;
    });

    return candidates
      .map((u: any) => {
        const uLogMap = logsByUserDate.get(u.id) || new Map();
        const uSubMap = passedSubsByUserDate.get(u.id) || new Map();
        const metrics = computeTikrarStreakAndWeekly(uLogMap.keys(), todayKey);
        const targetDays = Number(u.tikrar_active_days_per_week) || 5;

        return {
          id: u.id,
          isMe: user?.id === u.id,
          name: u.full_name || u.username || 'Thalibah HI AQLI',
          halaqahTitle: u.tikrar_halaqah_id
            ? halaqahNameMap.get(u.tikrar_halaqah_id) || 'Sesi Tikrar'
            : 'Mandiri',
          weeklyActiveDays: metrics.weeklyActiveDays,
          targetDays,
          streak: metrics.streak,
          points: Number(u.points) || 0,
          uLogMap,
          uSubMap,
        };
      })
      .sort((a, b) => {
        if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
        if (b.weeklyActiveDays !== a.weeklyActiveDays) {
          return b.weeklyActiveDays - a.weeklyActiveDays;
        }
        return b.points - a.points;
      });
  }, [
    allUsers,
    activeUserIds,
    selectedHalaqahFilter,
    logsByUserDate,
    passedSubsByUserDate,
    todayKey,
    halaqahNameMap,
    user?.id,
  ]);

  return (
    <Card className="border border-stone-200 bg-white shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Header & Legenda Warna (Wireframe Section 3) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#800000]" />
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                Pantau Progres Anggota Grup (30 Hari Terakhir)
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Wajib 5 hari aktif/pekan (Senin–Jumat). Akhir pekan fleksibel untuk murajaah &amp;
              toleransi setoran.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-600 font-semibold">
            <span>Kosong</span>
            <span
              className="w-3 h-3 rounded-[3px] inline-block border border-stone-300"
              style={{ backgroundColor: '#e7e5e4' }}
              title="Hari kerja belum laporan"
            />
            <span
              className="w-3 h-3 rounded-[3px] inline-block border border-stone-200"
              style={{ backgroundColor: '#f5f5f4' }}
              title="Akhir pekan (Sabtu/Ahad)"
            />
            <span
              className="w-3 h-3 rounded-[3px] inline-block"
              style={{ backgroundColor: '#86efac' }}
              title="Laporan 1 Blok"
            />
            <span
              className="w-3 h-3 rounded-[3px] inline-block"
              style={{ backgroundColor: '#16a34a' }}
              title="Selesai Target Harian (>=2 Blok)"
            />
            <span
              className="w-3 h-3 rounded-[3px] inline-block"
              style={{ backgroundColor: '#ca8a04' }}
              title="Lulus Kelas Setoran Live Zoom"
            />
            <span className="font-bold text-amber-700">Setoran Lulus</span>
          </div>
        </div>

        {/* Filter Kelompok Sesi Live Zoom */}
        <div className="flex items-center gap-1.5 flex-wrap border-b border-stone-100 pb-3">
          <button
            type="button"
            onClick={() => setSelectedHalaqahFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors',
              selectedHalaqahFilter === 'all'
                ? 'bg-[#800000] text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
                selectedHalaqahFilter === h.id
                  ? 'bg-[#800000] text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {String(h.title || '').replace('Hi Tikrar - ', '')}
            </button>
          ))}
        </div>

        {/* Tabel Member & Grid 30 Hari */}
        {loadingUsers || loadingLogs ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
            <span className="text-xs font-bold">Memuat heatmap keaktifan grup...</span>
          </div>
        ) : memberRows.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-stone-50 rounded-xl border border-dashed border-stone-200">
            <p className="text-sm font-bold text-stone-700">
              Belum ada anggota pada sesi halaqah ini.
            </p>
            <p className="text-xs text-stone-500">
              Pilih sesi halaqah Live Zoom di tab <strong>Target &amp; Jadwal</strong> atau lihat{' '}
              <button
                type="button"
                onClick={() => setSelectedHalaqahFilter('all')}
                className="text-[#800000] underline font-bold"
              >
                Semua Sesi Tikrar
              </button>
              .
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-col gap-2.5">
              {memberRows.slice(0, 25).map((member, index) => {
                const metWeekly = member.weeklyActiveDays >= member.targetDays;
                return (
                  <div
                    key={member.id}
                    className={cn(
                      'flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border transition-colors',
                      member.isMe
                        ? 'bg-amber-50/40 border-[#D4AF37]'
                        : 'bg-[#fafaf9] border-stone-200/70'
                    )}
                  >
                    {/* Identitas Anggota & Badge Pekanan */}
                    <div className="min-w-[210px] max-w-full lg:w-[230px] shrink-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-stone-900 truncate">
                          {index + 1}. {member.name}
                        </span>
                        {member.isMe && (
                          <Badge className="bg-[#800000] text-white hover:bg-[#800000] text-[9px] font-black h-4 px-1.5">
                            Anda
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <span
                          className={cn(
                            'font-extrabold',
                            metWeekly
                              ? 'text-emerald-700'
                              : member.weeklyActiveDays >= 3
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          )}
                        >
                          {metWeekly ? '✓' : '⚠️'} {member.weeklyActiveDays}/{member.targetDays}{' '}
                          Hari Pekan Ini
                        </span>
                        {member.streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-orange-700 font-bold">
                            <Flame className="w-3 h-3 fill-orange-500 text-orange-600" />
                            {member.streak}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 30-Day Contribution Grid */}
                    <div className="overflow-x-auto py-1">
                      <div className="flex items-center gap-[3px] min-w-max">
                        {last30DateKeys.map((dk) => {
                          const dow = getDayOfWeekFromKey(dk);
                          const isWeekend = dow === 0 || dow === 6;
                          const logEntry = member.uLogMap.get(dk);
                          const subEntry = member.uSubMap.get(dk);
                          const isToday = dk === todayKey;

                          let bgColor = isWeekend ? '#f5f5f4' : '#e7e5e4';
                          let statusText = isWeekend
                            ? 'Akhir Pekan (Toleransi / Murajaah)'
                            : 'Belum mengisi laporan';

                          if (subEntry) {
                            bgColor = '#ca8a04';
                            statusText = `★ Lulus Setoran Hal. ${subEntry.page} (${subEntry.grade})`;
                          } else if (logEntry) {
                            bgColor = logEntry.blocksCount >= 2 ? '#16a34a' : '#86efac';
                            statusText = `Selesai ${logEntry.blocksCount} Blok: ${logEntry.labels.join(
                              ', '
                            )}`;
                          }

                          const prettyDate = parseDateKeyUTC(dk).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC',
                          });

                          return (
                            <Tooltip key={dk}>
                              <TooltipTrigger asChild>
                                <div
                                  tabIndex={0}
                                  style={{ backgroundColor: bgColor }}
                                  className={cn(
                                    'w-3.5 h-3.5 rounded-[3px] transition-transform hover:scale-125 cursor-pointer flex items-center justify-center',
                                    isWeekend && !logEntry && !subEntry && 'border border-stone-200',
                                    isToday && 'ring-1 ring-[#800000] ring-offset-1'
                                  )}
                                >
                                  {subEntry && (
                                    <Star className="w-2.5 h-2.5 text-white fill-white" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipPortal>
                                <TooltipContent className="bg-stone-900 text-white border-none text-xs px-3 py-1.5 z-[100]">
                                  <p className="font-bold">
                                    {DAY_NAMES_ID[dow]}, {prettyDate}{' '}
                                    {isToday ? '(Hari Ini)' : ''}
                                  </p>
                                  <p className="text-[11px] opacity-90">{statusText}</p>
                                </TooltipContent>
                              </TooltipPortal>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>

                    {/* Poin Keaktifan */}
                    <div className="lg:w-[88px] shrink-0 text-left lg:text-right">
                      <span className="font-black text-xs sm:text-sm text-[#800000]">
                        {member.points} Poin
                      </span>
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
