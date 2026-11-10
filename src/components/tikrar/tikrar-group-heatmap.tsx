'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { getDayOfWeekFromKey, parseDateKeyUTC } from '@/lib/tikrar-schedule-generator';
import { HEATMAP_COLORS, type HeatmapLevel } from '@/lib/tikrar-steps';
import { Flame, Loader2, Star, Users } from 'lucide-react';

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


  const load = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/tikrar/group-activity?halaqah=${encodeURIComponent(selectedHalaqahFilter)}`);
      const json = await res.json();
      if (res.ok) {
        setMembers(json.data?.members || []);
        setTodayKey(json.data?.todayKey || '');
      }
    } catch (e) {
      console.warn('Gagal memuat keaktifan grup:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, selectedHalaqahFilter]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  return (
    <Card className="border border-stone-200 bg-white shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#800000]" />
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                Pantau Progres Anggota Grup (30 Hari Terakhir)
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Keaktifan hari ini diakui bila target langkah harian tercapai. Streak dihitung dari hari aktif terjadwal.
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

        <div className="flex items-center gap-1.5 flex-wrap border-b border-stone-100 pb-3">
          <button
            type="button"
            onClick={() => setSelectedHalaqahFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-extrabold transition-colors',
              selectedHalaqahFilter === 'all' ? 'bg-[#800000] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
                selectedHalaqahFilter === h.id ? 'bg-[#800000] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {String(h.title || '').replace('Hi Tikrar - ', '')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
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

                    <div className="py-1">
                      {/* 30 hari: 2 baris x 15 di HP, 1 baris di layar lebar, tanpa perlu digeser */}
                      <div className="grid gap-[3px] [grid-template-columns:repeat(15,14px)] lg:[grid-template-columns:repeat(30,14px)]">
                        {member.days.map((d) => {
                          const dow = getDayOfWeekFromKey(d.date);
                          const isToday = d.date === todayKey;
                          const statusText =
                            d.level === 'tasmi'
                              ? `★ Lulus Tasmi' ${d.tasmi?.join(', ')}`
                              : d.level === 'met'
                              ? `Target tercapai • ${d.steps} langkah, ${d.clicks} klik`
                              : d.level === 'active'
                              ? d.clicks > 0
                                ? `Aktif ${d.clicks} klik • ${d.steps} langkah (target belum tercapai)`
                                : 'Aktif (laporan blok tuntas)'
                              : 'Tidak ada klik counter';
                          const prettyDate = parseDateKeyUTC(d.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC',
                          });
                          return (
                            <Tooltip key={d.date}>
                              <TooltipTrigger asChild>
                                <div
                                  tabIndex={0}
                                  style={{ backgroundColor: HEATMAP_COLORS[d.level] }}
                                  className={cn(
                                    'w-3.5 h-3.5 rounded-[3px] border border-stone-200 transition-transform hover:scale-125 cursor-pointer flex items-center justify-center',
                                    isToday && 'ring-1 ring-[#800000] ring-offset-1'
                                  )}
                                >
                                  {d.level === 'tasmi' && <Star className="w-2.5 h-2.5 text-white fill-white" />}
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
                      <span className="font-black text-xs sm:text-sm text-[#800000]">{member.points} Poin</span>
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
    <div className="pt-1.5 space-y-1 max-w-[230px]">
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
