'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/db/client';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Search,
  Trophy,
} from 'lucide-react';

interface QuizAttemptRow {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  juz: number;
  page: number;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  passed: boolean;
  isPriorPage: boolean;
  part1Correct?: number | null;
  part1Total?: number | null;
  part2Correct?: number | null;
  part2Total?: number | null;
  mufradatMode?: string | null;
  createdAt: string;
}

interface PendingQuizPage {
  page: number;
  juz: number;
  source: 'prior' | 'progress';
  priorStatus: string | null;
  lastScore: number | null;
  lastCorrect: number | null;
  lastTotal: number | null;
}

interface ParticipantQuizSummary {
  userId: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  activeJuz: number;
  currentPage: number | null;
  attemptCount: number;
  passedQuizCount: number;
  passedQuizPages: number[];
  avgScore: number | null;
  latestScore: number | null;
  latestPage: number | null;
  latestPassed: boolean | null;
  latestAt: string | null;
  pendingQuizPages: PendingQuizPage[];
  recentAttempts: {
    id: string;
    page: number;
    juz: number;
    correctAnswers: number;
    totalQuestions: number;
    score: number;
    passed: boolean;
    part1Correct?: number | null;
    part1Total?: number | null;
    part2Correct?: number | null;
    part2Total?: number | null;
    mufradatMode?: string | null;
    createdAt: string;
  }[];
}

export function TikrarQuizScoresAdmin() {
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantQuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'participants' | 'attempts'>('participants');
  const [filterMode, setFilterMode] = useState<'all' | 'has_pending' | 'has_attempts'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/tikrar/quizzes');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memuat skor ujian.');
      setAttempts(json.data?.attempts || []);
      setParticipants(json.data?.participants || []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat skor ujian.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredParticipants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants
      .filter((p) => {
        if (filterMode === 'has_pending' && p.pendingQuizPages.length === 0) return false;
        if (filterMode === 'has_attempts' && p.attemptCount === 0) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.whatsapp || '').toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          b.attemptCount - a.attemptCount ||
          b.pendingQuizPages.length - a.pendingQuizPages.length ||
          a.name.localeCompare(b.name)
      );
  }, [participants, query, filterMode]);

  const filteredAttempts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attempts.filter((a) => {
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        String(a.page).includes(q)
      );
    });
  }, [attempts, query]);

  const stats = useMemo(() => {
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a) => a.passed).length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
        : 0;
    const totalPendingPages = participants.reduce((s, p) => s + p.pendingQuizPages.length, 0);
    return { totalAttempts, passedAttempts, avgScore, totalPendingPages };
  }, [attempts, participants]);

  return (
    <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2 text-primary">
              <Trophy className="w-4 h-4 text-[#D4AF37]" /> Skor Ujian Halaman 60 Soal (Hafalan &amp; Terjemah Per Kata)
            </CardTitle>
            <CardDescription className="text-xs">
              Menampilkan skor ujian halaman (Part 1: 30 Hafalan Ayat + Part 2: 30 Terjemah Per Kata) dari database dan
              daftar halaman yang sudah dihafal namun belum lulus ujian.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            className="h-9 text-xs font-bold shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Muat Ulang
          </Button>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-black uppercase text-slate-500">Total Ujian Asli</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.totalAttempts}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-[10px] font-black uppercase text-emerald-700">Lulus (≥80%)</p>
            <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.passedAttempts}</p>
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
            <p className="text-[10px] font-black uppercase text-primary">Rata-rata Skor</p>
            <p className="text-xl font-black text-primary mt-0.5">{stats.avgScore}%</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-[10px] font-black uppercase text-amber-800">Belum Ujian PG</p>
            <p className="text-xl font-black text-amber-900 mt-0.5">{stats.totalPendingPages} hal.</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('participants')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-black transition-colors',
                  viewMode === 'participants' ? 'bg-primary text-white' : 'text-slate-600'
                )}
              >
                Per Thalibah ({filteredParticipants.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('attempts')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-black transition-colors',
                  viewMode === 'attempts' ? 'bg-primary text-white' : 'text-slate-600'
                )}
              >
                Riwayat Skor ({filteredAttempts.length})
              </button>
            </div>

            {viewMode === 'participants' && (
              <div className="flex items-center gap-1">
                {(
                  [
                    ['all', 'Semua'],
                    ['has_pending', 'Ada Belum Ujian PG'],
                    ['has_attempts', 'Sudah Pernah Ujian'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilterMode(k)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-black border transition-colors',
                      filterMode === k
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, email, WA, atau hal..."
              className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-sm font-bold text-red-600">{error}</p>
        ) : viewMode === 'participants' ? (
          filteredParticipants.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Tidak ada data thalibah yang sesuai filter.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredParticipants.map((p) => (
                <div key={p.userId} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900">{p.name}</span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          Juz {p.activeJuz} {p.currentPage ? `• Hal. ${p.currentPage}` : ''}
                        </Badge>
                        {p.passedQuizCount > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Lulus Ujian PG: {p.passedQuizCount} hal.
                          </Badge>
                        )}
                        {p.pendingQuizPages.length > 0 && (
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px] font-black">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Belum Ujian PG: {p.pendingQuizPages.length} hal.
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {p.email || '-'} • Total percobaan ujian: {p.attemptCount}
                        {p.avgScore !== null ? ` • Rata-rata skor: ${p.avgScore}%` : ''}
                        {p.latestScore !== null
                          ? ` • Terakhir: Hal. ${p.latestPage} (${p.latestScore}%)`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {/* Daftar halaman belum ujian PG */}
                  {p.pendingQuizPages.length > 0 && (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 space-y-1.5">
                      <p className="text-[11px] font-black text-amber-950">
                        Halaman sudah dihafal tetapi belum lulus ujian halaman 60 soal ({p.pendingQuizPages.length} hal.):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.pendingQuizPages.map((pg) => (
                          <span
                            key={pg.page}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
                              pg.lastScore !== null
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : 'bg-white border-amber-300 text-amber-950'
                            )}
                          >
                            Hal. {pg.page} (Juz {pg.juz})
                            {pg.source === 'prior' ? ' • Luar/Lama' : ''}
                            {pg.lastScore !== null ? ` • Skor ${pg.lastScore}%` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Riwayat skor ujian thalibah */}
                  {p.recentAttempts.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Riwayat Skor Ujian Pilihan Ganda
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.recentAttempts.map((att) => (
                          <div
                            key={att.id}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2',
                              att.passed
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50 border-rose-200 text-rose-900'
                            )}
                          >
                            <span className="font-black">Hal. {att.page}</span>
                            <span className="font-bold">
                              {att.correctAnswers}/{att.totalQuestions} ({att.score}%)
                            </span>
                            {att.part1Correct !== null &&
                              att.part1Correct !== undefined &&
                              att.part2Correct !== null &&
                              att.part2Correct !== undefined && (
                                <span className="text-[10px] opacity-80">
                                  [Hafalan {att.part1Correct}/{att.part1Total ?? 30} • Kata {att.part2Correct}/
                                  {att.part2Total ?? 30}]
                                </span>
                              )}
                            <span className="text-[10px] opacity-75">
                              {att.passed ? 'LULUS' : 'Belum Lulus'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Belum ada skor ujian pilihan ganda yang tersimpan di database.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filteredAttempts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Belum ada riwayat skor ujian pilihan ganda di database.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredAttempts.map((a) => (
              <div
                key={a.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-slate-50/70"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900">{a.name}</span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Hal. {a.page} • Juz {a.juz}
                    </Badge>
                    {a.isPriorPage && (
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[9px] font-black">
                        Hafalan Lama / Luar
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {new Date(a.createdAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {a.part1Correct !== null &&
                    a.part1Correct !== undefined &&
                    a.part2Correct !== null &&
                    a.part2Correct !== undefined
                      ? ` • Hafalan ${a.part1Correct}/${a.part1Total ?? 30} • Per Kata ${a.part2Correct}/${a.part2Total ?? 30}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-slate-800">
                    {a.correctAnswers}/{a.totalQuestions} benar
                  </span>
                  <Badge
                    className={cn(
                      'text-xs font-black',
                      a.passed
                        ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                        : 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                    )}
                  >
                    <ClipboardCheck className="w-3 h-3 mr-1" />
                    {a.score}% • {a.passed ? 'LULUS' : 'BELUM LULUS'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
