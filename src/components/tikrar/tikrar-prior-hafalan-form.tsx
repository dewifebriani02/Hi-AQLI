'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getJuzForPage, getJuzPageRange } from '@/lib/tikrar-schedule-generator';
import { History, Loader2, Trash2 } from 'lucide-react';

type PriorStatus = 'tested_external' | 'untested';
interface PriorRow {
  page: number;
  status: PriorStatus;
  testedBy: string | null;
}

const STATUS_LABEL: Record<PriorStatus, string> = {
  tested_external: 'Sudah diuji di luar AQLI',
  untested: 'Belum diuji',
};

/** Ringkas halaman berurutan dengan status & penguji yang sama menjadi rentang */
function groupRanges(rows: PriorRow[]) {
  const out: { start: number; end: number; status: PriorStatus; testedBy: string | null }[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.end + 1 === r.page && last.status === r.status && last.testedBy === r.testedBy) last.end = r.page;
    else out.push({ start: r.page, end: r.page, status: r.status, testedBy: r.testedBy });
  }
  return out;
}

function rangeLabel(start: number, end: number) {
  const js = getJuzForPage(start);
  const r = getJuzPageRange(js);
  if (start === r.startPage && end === r.endPage) return `Juz ${js} (Hal. ${start}–${end})`;
  return start === end ? `Hal. ${start} (Juz ${js})` : `Hal. ${start}–${end}`;
}

/** Hafalan sebelum bergabung: diisi sendiri per juz atau rentang halaman */
export function TikrarPriorHafalanForm({ onSaved }: { onSaved?: () => void }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<PriorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'juz' | 'pages'>('juz');
  const [juzFrom, setJuzFrom] = useState(30);
  const [juzTo, setJuzTo] = useState(30);
  const [pageFrom, setPageFrom] = useState('');
  const [pageTo, setPageTo] = useState('');
  const [status, setStatus] = useState<PriorStatus>('untested');
  const [testedBy, setTestedBy] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/tikrar/prior-hafalan');
        const json = await res.json();
        if (res.ok) setRows(json.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ranges = useMemo(() => groupRanges(rows), [rows]);

  const selectedRange = (): { start: number; end: number } | null => {
    if (mode === 'juz') {
      const a = Math.min(juzFrom, juzTo);
      const b = Math.max(juzFrom, juzTo);
      return { start: getJuzPageRange(a).startPage, end: getJuzPageRange(b).endPage };
    }
    const s = Number(pageFrom);
    const e = Number(pageTo || pageFrom);
    if (!s || !e || s < 1 || e > 604 || e < s) return null;
    return { start: s, end: e };
  };

  const send = async (method: 'POST' | 'DELETE', range: { start: number; end: number }) => {
    setSaving(true);
    try {
      const res = await authFetch('/api/tikrar/prior-hafalan', {
        method,
        body: JSON.stringify({
          start_page: range.start,
          end_page: range.end,
          status,
          tested_by: testedBy,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan.');
      setRows(json.data || []);
      toast({
        title: method === 'POST' ? 'Hafalan Lama Tersimpan' : 'Hafalan Lama Dihapus',
        description: rangeLabel(range.start, range.end),
      });
      onSaved?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    const r = selectedRange();
    if (!r) {
      toast({ variant: 'destructive', title: 'Rentang halaman tidak valid (1–604).' });
      return;
    }
    send('POST', r);
  };

  return (
    <div className="space-y-4 bg-white border-2 border-[#800000]/10 rounded-3xl p-5">
      <div className="space-y-1">
        <h4 className="text-sm font-black font-headline uppercase text-[#800000] flex items-center gap-2">
          <History className="w-4 h-4 text-[#D4AF37]" /> Hafalan Sebelum Bergabung
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Isi hafalan yang sudah Ukhti miliki sebelum memakai HI AQLI. Hafalan ini tampil di Itqan 30 Juz dengan warna
          lebih muda, tidak menambah poin/streak, dan tidak membuka kunci halaman. Muallimah AQLI dapat mengujinya lewat
          setoran Tasmi&apos;.
        </p>
      </div>

      <div className="flex gap-2">
        {(['juz', 'pages'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-extrabold',
              mode === m ? 'bg-[#800000] text-white' : 'bg-stone-100 text-stone-600'
            )}
          >
            {m === 'juz' ? 'Per Juz' : 'Per Halaman'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {mode === 'juz' ? (
          <>
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase text-stone-600">Dari Juz</span>
              <select
                value={juzFrom}
                onChange={(e) => setJuzFrom(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-stone-300 bg-white px-2 text-sm font-bold"
              >
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Juz {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase text-stone-600">Sampai Juz</span>
              <select
                value={juzTo}
                onChange={(e) => setJuzTo(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-stone-300 bg-white px-2 text-sm font-bold"
              >
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Juz {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase text-stone-600">Dari Halaman</span>
              <Input type="number" min={1} max={604} value={pageFrom} onChange={(e) => setPageFrom(e.target.value)} className="h-11" />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-black uppercase text-stone-600">Sampai Halaman</span>
              <Input type="number" min={1} max={604} value={pageTo} onChange={(e) => setPageTo(e.target.value)} className="h-11" />
            </label>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(['untested', 'tested_external'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatus(st)}
            className={cn(
              'text-left rounded-2xl border-2 p-3 min-h-[56px]',
              status === st ? 'border-[#800000] bg-[#800000]/5' : 'border-stone-200'
            )}
          >
            <p className="text-sm font-black text-stone-900">{STATUS_LABEL[st]}</p>
            <p className="text-[11px] text-stone-500">
              {st === 'untested'
                ? 'Sudah hafal, belum pernah disetorkan/diuji'
                : 'Pernah lulus diuji di lembaga/guru lain'}
            </p>
          </button>
        ))}
      </div>

      {status === 'tested_external' && (
        <label className="block space-y-1">
          <span className="text-[11px] font-black uppercase text-stone-600">Diuji oleh (opsional)</span>
          <Input
            value={testedBy}
            onChange={(e) => setTestedBy(e.target.value)}
            placeholder="Nama guru / lembaga"
            className="h-11"
          />
        </label>
      )}

      <Button
        type="button"
        onClick={submit}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-[#800000] hover:bg-[#800000]/90 text-white font-black"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Hafalan Lama'}
      </Button>

      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase text-stone-500">Tersimpan</p>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#800000]" />
        ) : ranges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada hafalan lama yang diisi.</p>
        ) : (
          ranges.map((r) => (
            <div
              key={`${r.start}-${r.status}`}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
            >
              <div>
                <p className="font-black text-stone-900">{rangeLabel(r.start, r.end)}</p>
                <p className="text-[11px] text-stone-500">
                  {STATUS_LABEL[r.status]}
                  {r.testedBy ? ` • ${r.testedBy}` : ''} • {r.end - r.start + 1} hal.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={saving}
                onClick={() => send('DELETE', { start: r.start, end: r.end })}
                className="h-10 w-10 text-stone-500 hover:text-red-600"
                title="Hapus"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
