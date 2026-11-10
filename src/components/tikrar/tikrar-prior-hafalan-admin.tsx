'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/db/client';
import { cn } from '@/lib/utils';
import { getJuzForPage, getJuzPageRange } from '@/lib/tikrar-schedule-generator';
import { ClipboardCheck, History, Loader2, RefreshCw } from 'lucide-react';

type PriorStatus = 'tested_external' | 'untested';

interface PriorPage {
  page: number;
  status: PriorStatus;
  testedBy: string | null;
  aqliTested: boolean;
}

interface PriorUser {
  userId: string;
  name: string;
  hasWhatsapp: boolean;
  pages: PriorPage[];
}

interface PriorRange {
  start: number;
  end: number;
  status: PriorStatus;
  testedBy: string | null;
  untestedPages: number[];
}

/** Gabungkan halaman berurutan dengan status & penguji sama menjadi rentang */
function toRanges(pages: PriorPage[]): PriorRange[] {
  const out: PriorRange[] = [];
  for (const p of [...pages].sort((a, b) => a.page - b.page)) {
    const last = out[out.length - 1];
    if (last && last.end + 1 === p.page && last.status === p.status && last.testedBy === p.testedBy) {
      last.end = p.page;
      if (!p.aqliTested) last.untestedPages.push(p.page);
    } else {
      out.push({
        start: p.page,
        end: p.page,
        status: p.status,
        testedBy: p.testedBy,
        untestedPages: p.aqliTested ? [] : [p.page],
      });
    }
  }
  return out;
}

function rangeLabel(start: number, end: number) {
  const js = getJuzForPage(start);
  const je = getJuzForPage(end);
  const r = getJuzPageRange(js);
  if (js === je && start === r.startPage && end === r.endPage) return `Juz ${js} (Hal. ${start}–${end})`;
  if (start === end) return `Hal. ${start} (Juz ${js})`;
  return `Hal. ${start}–${end} (Juz ${js === je ? js : `${js}–${je}`})`;
}

/** Panel muallimah/admin: hafalan sebelum bergabung per thalibah & halaman yang belum diuji tasmi' di AQLI */
export function TikrarPriorHafalanAdmin({
  onTestPage,
}: {
  onTestPage?: (userId: string, page: number, name: string) => void;
}) {
  const [data, setData] = useState<PriorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyUntested, setOnlyUntested] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/tikrar/prior-hafalan?scope=all');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memuat hafalan lama.');
      setData(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat hafalan lama.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data
      .map((u) => {
        const ranges = toRanges(u.pages);
        const untested = u.pages.filter((p) => !p.aqliTested).length;
        return { ...u, ranges, untested, total: u.pages.length };
      })
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .filter((u) => !onlyUntested || u.untested > 0)
      .sort((a, b) => b.untested - a.untested || a.name.localeCompare(b.name));
  }, [data, query, onlyUntested]);

  const totalUntested = rows.reduce((sum, u) => sum + u.untested, 0);

  return (
    <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2 text-[#800000]">
              <History className="w-4 h-4" /> Hafalan Sebelum Bergabung
            </CardTitle>
            <CardDescription className="text-xs">
              Diisi sendiri oleh thalibah. Halaman yang belum lulus tasmi&apos; di AQLI perlu diuji muallimah agar
              tercatat &quot;diuji&quot; (marun) di Itqan 30 Juz.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={load} className="h-9 text-xs font-bold shrink-0">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Muat Ulang
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama thalibah…"
            className="h-9 text-xs sm:max-w-xs"
          />
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={onlyUntested} onChange={(e) => setOnlyUntested(e.target.checked)} />
            Hanya yang masih ada halaman belum diuji AQLI
          </label>
          <span className="text-xs font-bold text-slate-500 sm:ml-auto">
            {rows.length} thalibah • {totalUntested} hal. belum diuji AQLI
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
          </div>
        ) : error ? (
          <p className="text-sm font-bold text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {data.length === 0
              ? 'Belum ada thalibah yang mengisi hafalan sebelum bergabung.'
              : 'Semua hafalan lama sudah diuji di AQLI.'}
          </p>
        ) : (
          rows.map((u) => (
            <div key={u.userId} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-slate-900">{u.name}</span>
                  {!u.hasWhatsapp && (
                    <Badge variant="outline" className="text-[9px] font-bold border-amber-300 text-amber-800">
                      Tanpa no. WA
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {u.total} hal. hafalan lama •{' '}
                  <span className={u.untested > 0 ? 'text-[#800000]' : 'text-emerald-700'}>
                    {u.untested > 0 ? `${u.untested} belum diuji AQLI` : 'semua sudah diuji AQLI'}
                  </span>
                </span>
              </div>
              <div className="space-y-1.5">
                {u.ranges.map((r) => {
                  const done = r.untestedPages.length === 0;
                  return (
                    <div
                      key={`${r.start}-${r.status}`}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs',
                        done ? 'bg-emerald-50' : 'bg-slate-50'
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className="font-black text-slate-900">{rangeLabel(r.start, r.end)}</p>
                        <p className="text-[11px] text-slate-600">
                          {r.status === 'tested_external'
                            ? `Diuji di luar AQLI${r.testedBy ? ` • ${r.testedBy}` : ''}`
                            : 'Belum pernah diuji'}{' '}
                          •{' '}
                          {done
                            ? 'semua sudah lulus tasmi\' AQLI'
                            : `${r.untestedPages.length}/${r.end - r.start + 1} hal. belum diuji AQLI`}
                        </p>
                      </div>
                      {!done && onTestPage && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onTestPage(u.userId, r.untestedPages[0], u.name)}
                          className="h-9 bg-[#800000] hover:bg-[#800000]/90 text-white text-xs font-black rounded-lg shrink-0"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Uji Tasmi&apos; Hal. {r.untestedPages[0]}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
