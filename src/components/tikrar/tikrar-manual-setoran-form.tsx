'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { authFetch } from '@/db/client';
import { useToast } from '@/hooks/use-toast';
import { toDateKeyWIB, TIKRAR_GRADE_LABELS } from '@/lib/tikrar-schedule-generator';
import { ClipboardCheck, Loader2, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';

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
  prefill,
}: {
  participants: Participant[];
  onSaved?: () => void;
  /** Isi otomatis dari panel hafalan lama (nonce berubah setiap tombol "Uji Tasmi'" ditekan) */
  prefill?: { userId: string; page: number; name: string; nonce: number } | null;
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState('');
  const [range, setRange] = useState<'blok_1_4' | 'blok_1_2' | 'blok_3_4'>('blok_1_4');
  const [grade, setGrade] = useState<'mumtaz' | 'jayyid_jiddan' | 'perlu_perbaikan'>('mumtaz');
  const [sessionDate, setSessionDate] = useState(toDateKeyWIB());
  const [feedback, setFeedback] = useState('');
  const [sendWa, setSendWa] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setIsOpen(true);
    setQuery(prefill.name);
    setUserId(prefill.userId);
    setPage(String(prefill.page));
    setRange('blok_1_4');
  }, [prefill]);

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
    <Card className="rounded-3xl border border-primary/20 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <div
        onClick={() => setIsOpen((v) => !v)}
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-rose-400 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-primary dark:text-rose-400 flex items-center gap-2">
              Input Setoran Tasmi&apos; Manual (Tanpa Antrean)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Klik untuk mencatat kelulusan tasmi&apos; peserta secara langsung oleh Muallimah/Admin
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={isOpen ? 'ghost' : 'outline'}
          size="sm"
          className="rounded-xl text-xs font-bold h-8 gap-1.5 border-primary/20 text-primary"
        >
          {isOpen ? (
            <>
              Tutup Form <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" /> Buka Form Input
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <CardContent className="pt-3 pb-5 px-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-slate-800/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Cari Thalibah</label>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ketik nama peserta..." className="h-9 text-xs bg-white dark:bg-slate-900" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Pilih Thalibah</label>
            <select
              aria-label="Pilih thalibah"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                const p = participants.find((x) => x.id === e.target.value);
                if (p?.tikrar_current_page && !page) setPage(String(p.tikrar_current_page));
              }}
              className="w-full h-9 rounded-md border border-input bg-white dark:bg-slate-900 px-2 text-xs font-bold"
            >
              <option value="">— Pilih Peserta —</option>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.username || p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Halaman (1–604)</label>
            <Input type="number" min={1} max={604} value={page} onChange={(e) => setPage(e.target.value)} className="h-9 text-xs bg-white dark:bg-slate-900" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Bagian</label>
            <select
              aria-label="Bagian setoran"
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-white dark:bg-slate-900 px-2 text-xs font-bold"
            >
              <option value="blok_1_4">1 Halaman Penuh (Blok 1–4)</option>
              <option value="blok_1_2">1/2 Halaman Pertama (Blok 1 & 2)</option>
              <option value="blok_3_4">1/2 Halaman Kedua (Blok 3 & 4)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Predikat</label>
            <select
              aria-label="Predikat"
              value={grade}
              onChange={(e) => setGrade(e.target.value as any)}
              className="w-full h-9 rounded-md border border-input bg-white dark:bg-slate-900 px-2 text-xs font-bold"
            >
              {(['mumtaz', 'jayyid_jiddan', 'perlu_perbaikan'] as const).map((g) => (
                <option key={g} value={g}>
                  {TIKRAR_GRADE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Tanggal Setoran</label>
            <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="h-9 text-xs bg-white dark:bg-slate-900" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] font-black uppercase text-stone-600 dark:text-slate-300">Catatan Evaluasi (opsional)</label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className="text-xs bg-white dark:bg-slate-900" />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-[11px] font-bold text-stone-600 dark:text-slate-300 cursor-pointer">
              <Checkbox checked={sendWa} onCheckedChange={(v) => setSendWa(Boolean(v))} /> Kirim notifikasi WhatsApp
            </label>
            <Button
              type="button"
              onClick={submit}
              disabled={saving}
              className="bg-primary hover:bg-[#580e33] text-white font-black text-xs h-9 rounded-xl shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Hasil Setoran'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
