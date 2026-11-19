'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';
import {
  PageBlockConfig,
  SubBlockConfig,
  BlockConfig,
  TikrarVerseLike,
  generateDefaultPageBlockConfig,
  SYAAMIL_BLOCK_THEME,
} from '@/lib/tikrar-blocks';

// Halaman awal setiap Juz standar Mushaf Madinah (604 halaman)
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182,
  202, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

type ActiveEditingTarget =
  | '1.sub_1'
  | '1.sub_2'
  | '2.sub_1'
  | '2.sub_2'
  | '3.sub_1'
  | '3.sub_2'
  | '4.sub_1'
  | '4.sub_2';

interface WordToken {
  verse_key: string;
  word_index: number;
  text_uthmani: string;
  translation: string;
  global_idx: number;
}

export function TikrarBlockAdmin() {
  const { toast } = useToast();
  const [page, setPage] = useState<number>(48); // Default hal 48 (Ayat Hutang Piutang 2:282)
  const [pageInput, setPageInput] = useState<string>('48');
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [verses, setVerses] = useState<TikrarVerseLike[]>([]);
  const [config, setConfig] = useState<PageBlockConfig | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [activeTarget, setActiveTarget] = useState<ActiveEditingTarget>('1.sub_1');
  const [clickStep, setClickStep] = useState<'start' | 'end'>('start');

  // 1. Fetch verses dari Quran.com API untuk halaman terpilih
  const loadVerses = useCallback(async (pageNum: number) => {
    setLoadingVerses(true);
    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/verses/by_page/${pageNum}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33`
      );
      const data = await res.json();
      if (data && data.verses) {
        setVerses(data.verses);
      }
    } catch (err: any) {
      toast({
        title: 'Gagal memuat teks Al-Qur\'an',
        description: err?.message || 'Koneksi ke API Quran.com terputus.',
        variant: 'destructive',
      });
    } finally {
      setLoadingVerses(false);
    }
  }, [toast]);

  // 2. Fetch config tersimpan untuk halaman terpilih
  const loadConfig = useCallback(async (pageNum: number) => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/admin/tikrar/blocks?page=${pageNum}`);
      const data = await res.json();
      if (data && data.success) {
        if (data.isCustom && data.config) {
          setConfig(data.config);
          setNotes(data.notes || '');
          setIsCustom(true);
        } else {
          setConfig(null);
          setNotes('');
          setIsCustom(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to load block config:', err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // Saat nomor halaman berubah, muat verses dan config
  useEffect(() => {
    loadVerses(page);
    loadConfig(page);
    setPageInput(String(page));
  }, [page, loadVerses, loadConfig]);

  // Ekstrak semua token kata dalam 1 halaman secara berurutan
  const allWords = useMemo<WordToken[]>(() => {
    const list: WordToken[] = [];
    let gIdx = 0;
    verses.forEach((v) => {
      if (v.words && v.words.length > 0) {
        v.words.forEach((w: any, idx: number) => {
          list.push({
            verse_key: v.verse_key,
            word_index: w.position ?? (idx + 1),
            text_uthmani: w.text_uthmani || '',
            translation: w.translation?.text || '',
            global_idx: gIdx++,
          });
        });
      }
    });
    return list;
  }, [verses]);

  // Konfigurasi aktif (jika belum kustom, generate fallback otomatis)
  const activeConfig = useMemo<PageBlockConfig | null>(() => {
    if (config) return config;
    if (verses.length > 0) {
      try {
        return generateDefaultPageBlockConfig(page, verses);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [config, page, verses]);

  // Cek kata ini masuk ke Sub-Blok yang mana
  const getSubBlockForWord = useCallback(
    (verseKey: string, wordIdx: number): string | null => {
      if (!activeConfig) return null;
      for (const bId of [1, 2, 3, 4] as const) {
        const b = activeConfig[bId];
        if (!b) continue;

        // Sub 1
        if (
          isWordInRange(
            verseKey,
            wordIdx,
            b.sub_1.start_verse_key,
            b.sub_1.start_word_index,
            b.sub_1.end_verse_key,
            b.sub_1.end_word_index,
            verses
          )
        ) {
          return `${bId}.sub_1`;
        }

        // Sub 2
        if (
          isWordInRange(
            verseKey,
            wordIdx,
            b.sub_2.start_verse_key,
            b.sub_2.start_word_index,
            b.sub_2.end_verse_key,
            b.sub_2.end_word_index,
            verses
          )
        ) {
          return `${bId}.sub_2`;
        }
      }
      return null;
    },
    [activeConfig, verses]
  );

  // Helper untuk menentukan urutan kata apakah berada di dalam range
  function isWordInRange(
    vk: string,
    wIdx: number,
    startVk: string,
    startWIdx: number,
    endVk: string,
    endWIdx: number,
    verseList: TikrarVerseLike[]
  ): boolean {
    const vOrder = (key: string) => verseList.findIndex((v) => v.verse_key === key);
    const currVIdx = vOrder(vk);
    const startVIdx = vOrder(startVk);
    const endVIdx = vOrder(endVk);

    if (currVIdx === -1 || startVIdx === -1 || endVIdx === -1) return false;

    if (currVIdx < startVIdx || currVIdx > endVIdx) return false;

    if (currVIdx === startVIdx && wIdx < startWIdx) return false;
    if (currVIdx === endVIdx && wIdx > endWIdx) return false;

    return true;
  }

  // Handle klik pada sebuah kata di mushaf
  const handleWordClick = (word: WordToken) => {
    if (!activeConfig) return;

    const [bStr, subKey] = activeTarget.split('.') as ['1' | '2' | '3' | '4', 'sub_1' | 'sub_2'];
    const bId = parseInt(bStr, 10) as 1 | 2 | 3 | 4;

    const currentSub = activeConfig[bId][subKey];

    const newConfig: PageBlockConfig = JSON.parse(JSON.stringify(activeConfig));

    if (clickStep === 'start') {
      newConfig[bId][subKey] = {
        ...currentSub,
        start_verse_key: word.verse_key,
        start_word_index: word.word_index,
      };
      setClickStep('end');
      toast({
        title: `Titik Awal ${currentSub.label_alt || currentSub.sub_id} Dipilih`,
        description: `Ayat ${word.verse_key} kata ke-${word.word_index} ("${word.text_uthmani}"). Sekarang klik kata akhir.`,
      });
    } else {
      newConfig[bId][subKey] = {
        ...currentSub,
        end_verse_key: word.verse_key,
        end_word_index: word.word_index,
      };
      setClickStep('start');
      toast({
        title: `Titik Akhir ${currentSub.label_alt || currentSub.sub_id} Dipilih`,
        description: `Ayat ${word.verse_key} kata ke-${word.word_index} ("${word.text_uthmani}"). Rentang tersimpan.`,
      });
    }

    setConfig(newConfig);
    setIsCustom(true);
  };

  // Generate otomatis
  const handleAutoGenerate = () => {
    if (verses.length === 0) return;
    try {
      const generated = generateDefaultPageBlockConfig(page, verses);
      setConfig(generated);
      setIsCustom(true);
      toast({
        title: 'Pembagian 4 Blok x 2 Sub Otomatis Dihasilkan',
        description: 'Blok TM1 s/d TM4 telah dibagi rata seimbang. Klik "Simpan" untuk menerapkan.',
      });
    } catch (err: any) {
      toast({
        title: 'Gagal generate otomatis',
        description: err?.message,
        variant: 'destructive',
      });
    }
  };

  // Simpan ke database
  const handleSave = async () => {
    if (!activeConfig) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tikrar/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_number: page,
          blocks: activeConfig,
          notes: notes,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setIsCustom(true);
        toast({
          title: 'Berhasil Menyimpan Konfigurasi Blok',
          description: `Konfigurasi Blok Halaman ${page} tersimpan & aktif untuk seluruh santri.`,
        });
      } else {
        throw new Error(data.error || 'Gagal menyimpan.');
      }
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan',
        description: err?.message || 'Terjadi kesalahan server.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset ke default
  const handleReset = async () => {
    if (!confirm(`Yakin ingin mereset Halaman ${page} ke konfigurasi default (menghapus setting kustom)?`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tikrar/blocks?page=${page}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data && data.success) {
        setConfig(null);
        setNotes('');
        setIsCustom(false);
        toast({
          title: 'Konfigurasi Direset',
          description: `Halaman ${page} kembali menggunakan pembagian default bawaan.`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Gagal Mereset',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getSubBlockStyle = (subTag: string | null) => {
    switch (subTag) {
      case '1.sub_1':
        return 'bg-emerald-600/30 text-emerald-950 border-b-2 border-emerald-600 font-bold';
      case '1.sub_2':
        return 'bg-emerald-400/20 text-emerald-900 border-b-2 border-emerald-400';
      case '2.sub_1':
        return 'bg-amber-600/30 text-amber-950 border-b-2 border-amber-600 font-bold';
      case '2.sub_2':
        return 'bg-amber-400/20 text-amber-900 border-b-2 border-amber-400';
      case '3.sub_1':
        return 'bg-blue-600/30 text-blue-950 border-b-2 border-blue-600 font-bold';
      case '3.sub_2':
        return 'bg-blue-400/20 text-blue-900 border-b-2 border-blue-400';
      case '4.sub_1':
        return 'bg-rose-600/30 text-rose-950 border-b-2 border-rose-600 font-bold';
      case '4.sub_2':
        return 'bg-rose-400/20 text-rose-900 border-b-2 border-rose-400';
      default:
        return 'hover:bg-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER CONTROL & SELECTOR */}
      <Card className="border-2 border-[#800000]/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-[#800000] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#D4AF37]" />
                Manajemen Blok &amp; Potongan Ayat Tikrar
              </CardTitle>
              <CardDescription>
                Atur pembagian 4 Blok (TM1–TM4 / Blok A–D) dan 8 Sub-Blok (TM1-1 s/d TM4-2) presisi hingga tingkat potongan kata (word-level)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoGenerate}
                disabled={loadingVerses || saving}
                className="font-bold text-xs gap-1 border-dashed"
                title="Bagi rata seluruh kata dalam 1 halaman menjadi 4 blok dan 8 sub-blok seimbang"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Bagi Rata Otomatis
              </Button>
              {isCustom && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={saving}
                  className="font-bold text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset Default
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !activeConfig}
                className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xs gap-1.5 shadow-md"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Konfigurasi
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Page Navigator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-600">Halaman:</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1 || loadingVerses}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = parseInt(pageInput, 10);
                      if (n >= 1 && n <= 604) setPage(n);
                    }
                  }}
                  className="w-16 h-8 text-center font-black text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= 604 || loadingVerses}
                  onClick={() => setPage((p) => Math.min(604, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Juz Jump */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-600">Juz:</span>
              <select
                className="h-8 rounded-md border border-slate-300 text-xs font-bold px-2 bg-white"
                value={JUZ_START_PAGES.findIndex((sp) => sp > page) === -1 ? 30 : JUZ_START_PAGES.findIndex((sp) => sp > page)}
                onChange={(e) => {
                  const j = parseInt(e.target.value, 10);
                  if (j >= 1 && j <= 30) setPage(JUZ_START_PAGES[j - 1]);
                }}
              >
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Juz {i + 1} (Hal. {JUZ_START_PAGES[i]})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Badge */}
            <div className="ml-auto flex items-center gap-2">
              {loadingConfig || loadingVerses ? (
                <Badge variant="outline" className="text-slate-500 gap-1 text-[10px]">
                  <Loader2 className="w-3 h-3 animate-spin" /> Memuat data...
                </Badge>
              ) : isCustom ? (
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Konfigurasi Kustom Tersimpan
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px] gap-1">
                  <Info className="w-3 h-3" /> Menggunakan Default Heuristik
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MAIN EDITOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KOLOM KIRI: MUSHAF WORD-LEVEL VIEWER (7 COLS) */}
        <Card className="lg:col-span-7 border-2 border-slate-200 flex flex-col">
          <CardHeader className="pb-3 border-b bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#800000]" />
                  Pratinjau Mushaf Halaman {page}
                </CardTitle>
                <CardDescription className="text-xs">
                  Klik kata pertama lalu kata terakhir untuk menetapkan batas sub-blok aktif.
                </CardDescription>
              </div>

              {/* Selector Target Aktif yang sedang diedit */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1">
                <span className="text-[10px] font-black uppercase text-slate-500 px-1">Sedang Atur:</span>
                <select
                  value={activeTarget}
                  onChange={(e) => {
                    setActiveTarget(e.target.value as ActiveEditingTarget);
                    setClickStep('start');
                  }}
                  className="text-xs font-black bg-transparent outline-none cursor-pointer text-[#800000]"
                >
                  <option value="1.sub_1">TM1-1 (Blok A-1)</option>
                  <option value="1.sub_2">TM1-2 (Blok A-2)</option>
                  <option value="2.sub_1">TM2-1 (Blok B-1)</option>
                  <option value="2.sub_2">TM2-2 (Blok B-2)</option>
                  <option value="3.sub_1">TM3-1 (Blok C-1)</option>
                  <option value="3.sub_2">TM3-2 (Blok C-2)</option>
                  <option value="4.sub_1">TM4-1 (Blok D-1)</option>
                  <option value="4.sub_2">TM4-2 (Blok D-2)</option>
                </select>
                <Badge
                  variant="outline"
                  className={clickStep === 'start' ? 'bg-amber-100 text-amber-800 text-[9px]' : 'bg-emerald-100 text-emerald-800 text-[9px]'}
                >
                  {clickStep === 'start' ? '1. Klik Awal' : '2. Klik Akhir'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1">
            {loadingVerses ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
                <span className="text-xs font-bold">Memuat teks mushaf dari Quran.com...</span>
              </div>
            ) : verses.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                Tidak ada data ayat untuk halaman ini.
              </div>
            ) : (
              <div
                className="bg-[#FCFBF7] rounded-xl border border-amber-900/10 p-5 shadow-inner max-h-[560px] overflow-y-auto leading-[2.6] text-right"
                dir="rtl"
              >
                {verses.map((v) => (
                  <span key={v.verse_key} className="inline-block my-1">
                    {v.words && v.words.length > 0 ? (
                      v.words.map((w: any, idx: number) => {
                        const wordIdx = w.position ?? (idx + 1);
                        const subTag = getSubBlockForWord(v.verse_key, wordIdx);
                        const isEndChar = w.char_type_name === 'end';

                        if (isEndChar) {
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center justify-center text-[11px] font-bold text-amber-900 px-1.5 py-0.5 mx-1 border border-amber-800/30 rounded-full bg-white select-none align-middle"
                              title={`Akhir Ayat ${v.verse_key}`}
                            >
                              ۝ {v.verse_key.split(':')[1]}
                            </span>
                          );
                        }

                        return (
                          <span
                            key={idx}
                            onClick={() =>
                              handleWordClick({
                                verse_key: v.verse_key,
                                word_index: wordIdx,
                                text_uthmani: w.text_uthmani || '',
                                translation: w.translation?.text || '',
                                global_idx: 0,
                              })
                            }
                            title={`${v.verse_key} kata #${wordIdx} (${w.translation?.text || '-'})`}
                            className={`font-arabic text-lg sm:text-xl px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-all ${getSubBlockStyle(
                              subTag
                            )}`}
                          >
                            {w.text_uthmani}
                          </span>
                        );
                      })
                    ) : (
                      <span className="font-arabic text-xl px-1">{v.text_uthmani}</span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* LEGENDA WARNA BLOK */}
            <div className="mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-600 shrink-0" />
                <span className="font-bold text-emerald-900">TM1 (Blok A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
                <span className="font-bold text-amber-900">TM2 (Blok B)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 shrink-0" />
                <span className="font-bold text-blue-900">TM3 (Blok C)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-600 shrink-0" />
                <span className="font-bold text-rose-900">TM4 (Blok D)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KOLOM KANAN: RINCIAN KONFIGURASI 4 BLOK & 8 SUB-BLOK (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {([1, 2, 3, 4] as const).map((bId) => {
            const theme = SYAAMIL_BLOCK_THEME[bId];
            const blockData = activeConfig?.[bId];

            return (
              <Card key={bId} className={`border-2 ${theme.cardBorder} shadow-sm overflow-hidden`}>
                <div className={`px-4 py-2 ${theme.headerBg} text-white flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] font-black uppercase ${theme.badgeClass}`}>
                      {theme.tmLabel} • {theme.letter} ({theme.colorName})
                    </Badge>
                  </div>
                  <span className="text-[10px] font-bold text-white/80">
                    {blockData ? `${blockData.sub_1.start_verse_key} s/d ${blockData.sub_2.end_verse_key}` : '-'}
                  </span>
                </div>

                <CardContent className="p-3 space-y-3 bg-white">
                  {/* SUB 1 */}
                  <div
                    onClick={() => {
                      setActiveTarget(`${bId}.sub_1`);
                      setClickStep('start');
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      activeTarget === `${bId}.sub_1`
                        ? 'border-[#800000] bg-[#800000]/5 ring-1 ring-[#800000]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-800">
                        {theme.tmLabel}-1 ({theme.letter}-1) • Maroon
                      </span>
                      {activeTarget === `${bId}.sub_1` && (
                        <Badge className="bg-[#800000] text-white text-[8px] font-black uppercase">
                          SEDANG DIATUR
                        </Badge>
                      )}
                    </div>
                    {blockData?.sub_1 ? (
                      <div className="text-[11px] text-slate-600 flex justify-between items-center">
                        <span>
                          Ayat <b>{blockData.sub_1.start_verse_key}</b> (kata #{blockData.sub_1.start_word_index}) s/d{' '}
                          <b>{blockData.sub_1.end_verse_key}</b> (kata #{blockData.sub_1.end_word_index})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Belum diatur</span>
                    )}
                  </div>

                  {/* SUB 2 */}
                  <div
                    onClick={() => {
                      setActiveTarget(`${bId}.sub_2`);
                      setClickStep('start');
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      activeTarget === `${bId}.sub_2`
                        ? 'border-[#800000] bg-[#800000]/5 ring-1 ring-[#800000]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-800">
                        {theme.tmLabel}-2 ({theme.letter}-2) • Hitam
                      </span>
                      {activeTarget === `${bId}.sub_2` && (
                        <Badge className="bg-[#800000] text-white text-[8px] font-black uppercase">
                          SEDANG DIATUR
                        </Badge>
                      )}
                    </div>
                    {blockData?.sub_2 ? (
                      <div className="text-[11px] text-slate-600 flex justify-between items-center">
                        <span>
                          Ayat <b>{blockData.sub_2.start_verse_key}</b> (kata #{blockData.sub_2.start_word_index}) s/d{' '}
                          <b>{blockData.sub_2.end_verse_key}</b> (kata #{blockData.sub_2.end_word_index})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Belum diatur</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* CATATAN PENGATURAN */}
          <Card className="border border-slate-200">
            <CardContent className="p-3">
              <label className="text-xs font-black text-slate-700 block mb-1">
                Catatan Pembagian Halaman (Opsional):
              </label>
              <Input
                type="text"
                placeholder="Mis: QS Al-Baqarah 282 dibagi 4 per waqaf utama..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
