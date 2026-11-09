'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import { toDateKeyWIB, TIKRAR_GRADE_LABELS } from '@/lib/tikrar-schedule-generator';
import { ClipboardCheck, Loader2 } from 'lucide-react';

interface Participant {
  id: string;
  full_name?: string | null;
  username?: string | null;
  tikrar_current_page?: number | null;
}

/** Input hasil setoran Tasmi' langsung oleh muallimah/admin tanpa antrean dari thalibah */
export function TikrarManualSetoranForm({
  participants,
  onSaved,
}: {
  participants: Participant[];
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState('');
  const [range, setRange] = useState<'blok_1_4' | 'blok_1_2' | 'blok_3_4'>('blok_1_4');
  const [grade, setGrade] = useState<'mumtaz' | 'jayyid_jiddan' | 'perlu_perbaikan'>('mumtaz');
  const [sessionDate, setSessionDate] = useState(toDateKeyWIB());
  const [feedback, setFeedback] = useState('');
  const [sendWa, setSendWa] = useState(true);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants
      .filter((p) => !q || `${p.full_name || ''} ${p.username || ''}`.toLowerCase().includes(q))
      .slice(0, 100);
  }, [participants, query]);

  const submit = async () => {
    const pageNum = Number(page);
    if (!userId || !pageNum) {
      toast({ variant: 'destructive', title: 'Pilih thalibah dan isi nomor halaman.' });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/tikrar/submissions/verify', {
        method: 'POST',
        body: JSON.stringify({
          manual: { user_id: userId, page_number: pageNum, blocks_range: range, session_date: sessionDate },
          grade,
          feedback,
          send_whatsapp: sendWa,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyimpan setoran.');
      toast({
        title: grade === 'perlu_perbaikan' ? 'Catatan Perbaikan Tersimpan' : "Setoran Tasmi' Lulus Tersimpan",
        description: `Halaman ${pageNum}${json.data?.pointsAwarded ? ` • +${json.data.pointsAwarded} Poin` : ''}.`,
      });
      setPage('');
      setFeedback('');
      onSaved?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-[#800000]/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-black flex items-center gap-2 text-[#800000]">
          <ClipboardCheck className="w-4 h-4" /> Input Setoran Tasmi&apos; Manual
        </CardTitle>
        <CardDescription className="text-xs">
          Muallimah/admin mengisi hasil tasmi&apos; langsung tanpa menunggu thalibah mendaftar antrean. Halaman yang lulus
          tercatat sebagai &quot;sudah diuji&quot; di Itqan 30 Juz dan heatmap cokelat.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-stone-600">Cari Thalibah</label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nama..." className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-stone-600">Thalibah</label>
          <select
            aria-label="Pilih thalibah"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              const p = participants.find((x) => x.id === e.target.value);
              if (p?.tikrar_current_page && !page) setPage(String(p.tikrar_current_page));
            }}
            className="w-full h-9 rounded-md border border-input bg-white px-2 text-xs font-bold"
          >
            <option value="">— Pilih —</option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.username || p.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-stone-600">Halaman (1–604)</label>
          <Input type="number" min={1} max={604} value={page} onChange={(e) => setPage(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-stone-600">Bagian</label>
          <select
            aria-label="Bagian setoran"
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-white px-2 text-xs font-bold"
          >
            <option value="blok_1_4">1 Halaman Penuh (A–D)</option>
            <option value="blok_1_2">1/2 Halaman Pertama (A & B)</option>
            <option value="blok_3_4">1/2 Halaman Kedua (C & D)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-stone-600">Predikat</label>
          <select
            aria-label="Predikat"
            value={grade}
            onChange={(e) => setGrade(e.target.value as any)}
            className="w-full h-9 rounded-md border border-input bg-white px-2 text-xs font-bold"
          >
            {(['mumtaz', 'jayyid_jiddan', 'perlu_perbaikan'] as const).map((g) => (
              <option key={g} value={g}>
                {TIKRAR_GRADE_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase text-stone-600">Tanggal Setoran</label>
          <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-[11px] font-black uppercase text-stone-600">Catatan (opsional)</label>
          <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className="text-xs" />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-[11px] font-bold text-stone-600">
            <Checkbox checked={sendWa} onCheckedChange={(v) => setSendWa(Boolean(v))} /> Kirim notifikasi WhatsApp
          </label>
          <Button
            type="button"
            onClick={submit}
            disabled={saving}
            className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs h-9 rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Hasil Setoran'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
