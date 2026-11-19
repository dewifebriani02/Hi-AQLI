'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  Loader2,
  Sparkles,
  Check,
  MousePointerClick,
  Layers,
} from 'lucide-react';
import {
  PageBlockConfig,
  SubBlockConfig,
  TikrarVerseLike,
  VerseWordLike,
  generateDefaultPageBlockConfig,
  SYAAMIL_BLOCK_THEME,
} from '@/lib/tikrar-blocks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { authFetch } from '@/db';

// Halaman awal setiap Juz standar Mushaf Madinah (604 halaman)
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182,
  202, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export interface SubBlockTarget {
  block: 1 | 2 | 3 | 4;
  sub: 'sub_1' | 'sub_2';
  label: string;
  title: string;
}

export const ALL_SUB_BLOCK_TARGETS: SubBlockTarget[] = [
  { block: 1, sub: 'sub_1', label: 'TM1-1', title: 'Blok A (Hijau) • Sub 1 Maroon' },
  { block: 1, sub: 'sub_2', label: 'TM1-2', title: 'Blok A (Hijau) • Sub 2 Hitam' },
  { block: 2, sub: 'sub_1', label: 'TM2-1', title: 'Blok B (Kuning) • Sub 1 Maroon' },
  { block: 2, sub: 'sub_2', label: 'TM2-2', title: 'Blok B (Kuning) • Sub 2 Hitam' },
  { block: 3, sub: 'sub_1', label: 'TM3-1', title: 'Blok C (Biru) • Sub 1 Maroon' },
  { block: 3, sub: 'sub_2', label: 'TM3-2', title: 'Blok C (Biru) • Sub 2 Hitam' },
  { block: 4, sub: 'sub_1', label: 'TM4-1', title: 'Blok D (Merah) • Sub 1 Maroon' },
  { block: 4, sub: 'sub_2', label: 'TM4-2', title: 'Blok D (Merah) • Sub 2 Hitam' },
];

const TARGET_KEYS = ALL_SUB_BLOCK_TARGETS.map((t) => `${t.block}.${t.sub}`);

export const SUB_BLOCK_PALETTE: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    ring: string;
    dot: string;
    badge: string;
  }
> = {
  '1.sub_1': {
    bg: 'bg-emerald-600/25',
    text: 'text-emerald-950 dark:text-emerald-100',
    border: 'border-emerald-600',
    ring: 'ring-emerald-600',
    dot: 'bg-emerald-700',
    badge: 'bg-emerald-700 text-white',
  },
  '1.sub_2': {
    bg: 'bg-emerald-400/15',
    text: 'text-emerald-900 dark:text-emerald-200',
    border: 'border-emerald-400 border-dashed',
    ring: 'ring-emerald-400',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-400',
  },
  '2.sub_1': {
    bg: 'bg-amber-500/30',
    text: 'text-amber-950 dark:text-amber-100',
    border: 'border-amber-600',
    ring: 'ring-amber-600',
    dot: 'bg-amber-600',
    badge: 'bg-amber-600 text-white',
  },
  '2.sub_2': {
    bg: 'bg-amber-300/20',
    text: 'text-amber-900 dark:text-amber-200',
    border: 'border-amber-400 border-dashed',
    ring: 'ring-amber-400',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-900 border border-amber-400',
  },
  '3.sub_1': {
    bg: 'bg-blue-600/25',
    text: 'text-blue-950 dark:text-blue-100',
    border: 'border-blue-600',
    ring: 'ring-blue-600',
    dot: 'bg-blue-700',
    badge: 'bg-blue-700 text-white',
  },
  '3.sub_2': {
    bg: 'bg-blue-400/15',
    text: 'text-blue-900 dark:text-blue-200',
    border: 'border-blue-400 border-dashed',
    ring: 'ring-blue-400',
    dot: 'bg-blue-400',
    badge: 'bg-blue-100 text-blue-900 border border-blue-400',
  },
  '4.sub_1': {
    bg: 'bg-rose-600/25',
    text: 'text-rose-950 dark:text-rose-100',
    border: 'border-rose-600',
    ring: 'ring-rose-600',
    dot: 'bg-rose-700',
    badge: 'bg-rose-700 text-white',
  },
  '4.sub_2': {
    bg: 'bg-rose-400/15',
    text: 'text-rose-900 dark:text-rose-200',
    border: 'border-rose-400 border-dashed',
    ring: 'ring-rose-400',
    dot: 'bg-rose-400',
    badge: 'bg-rose-100 text-rose-900 border border-rose-400',
  },
};

interface FlatWord {
  global_idx: number;
  verse_key: string;
  word_index: number; // 1-based position (w.position ?? idx + 1)
  text_uthmani: string;
  translation: string;
}

export function TikrarBlockAdmin() {
  const { toast } = useToast();
  const [pageNumber, setPageNumber] = useState<number>(48);
  const [pageInput, setPageInput] = useState<string>('48');
  const [verses, setVerses] = useState<TikrarVerseLike[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [activeConfig, setActiveConfig] = useState<PageBlockConfig | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isCustomSaved, setIsCustomSaved] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Target selection state
  const [activeTarget, setActiveTarget] = useState<SubBlockTarget>(ALL_SUB_BLOCK_TARGETS[0]);
  const [clickStep, setClickStep] = useState<'start' | 'end'>('start');
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [hoveredWordIdx, setHoveredWordIdx] = useState<number | null>(null);

  // Flat list of clickable words on the current page (excluding verse-end symbol markers)
  const { allWords, wordKeyToIdx } = useMemo(() => {
    const list: FlatWord[] = [];
    const map = new Map<string, number>();

    for (const v of verses) {
      if (v.words && v.words.length > 0) {
        v.words.forEach((w: VerseWordLike, idx: number) => {
          if (w.char_type_name === 'end') return;
          const wordPos = w.position ?? idx + 1;
          const gIdx = list.length;
          list.push({
            global_idx: gIdx,
            verse_key: v.verse_key,
            word_index: wordPos,
            text_uthmani: w.text_uthmani || '',
            translation: w.translation?.text || '',
          });
          map.set(`${v.verse_key}:${wordPos}`, gIdx);
        });
      }
    }
    return { allWords: list, wordKeyToIdx: map };
  }, [verses]);

  // Convert a SubBlockConfig to [startGlobalIdx, endGlobalIdx]
  const rangeToGlobalIndices = useCallback(
    (range?: SubBlockConfig | null): [number, number] | null => {
      if (!range || allWords.length === 0) return null;

      let sIdx = wordKeyToIdx.get(`${range.start_verse_key}:${range.start_word_index ?? 1}`);
      if (sIdx === undefined) {
        // Fallback: first clickable word of start_verse_key
        const found = allWords.find((w) => w.verse_key === range.start_verse_key);
        sIdx = found ? found.global_idx : 0;
      }

      let eIdx: number | undefined;
      if (range.end_word_index !== undefined) {
        eIdx = wordKeyToIdx.get(`${range.end_verse_key}:${range.end_word_index}`);
      }
      if (eIdx === undefined) {
        // Fallback: last clickable word of end_verse_key (handles when end_word_index pointed to verse-end marker)
        for (let i = allWords.length - 1; i >= 0; i--) {
          if (allWords[i].verse_key === range.end_verse_key) {
            eIdx = allWords[i].global_idx;
            break;
          }
        }
      }
      if (eIdx === undefined) eIdx = allWords.length - 1;

      return [sIdx, eIdx];
    },
    [allWords, wordKeyToIdx]
  );

  // Build preview text (Arabic snippet) from [sIdx, eIdx]
  const buildPreviewText = useCallback(
    (sIdx: number, eIdx: number): string => {
      if (allWords.length === 0 || sIdx > eIdx) return '';
      const safeS = Math.max(0, Math.min(sIdx, allWords.length - 1));
      const safeE = Math.max(safeS, Math.min(eIdx, allWords.length - 1));
      const slice = allWords.slice(safeS, safeE + 1).map((w) => w.text_uthmani);
      if (slice.length <= 7) return slice.join(' ');
      return `${slice.slice(0, 4).join(' ')} ... ${slice.slice(-2).join(' ')}`;
    },
    [allWords]
  );

  // Convert 8 [startIdx, endIdx] pairs back into PageBlockConfig
  const indicesArrayToConfig = useCallback(
    (pairs: Array<[number, number]>): PageBlockConfig => {
      const total = allWords.length;
      const letters = ['A', 'B', 'C', 'D'] as const;
      const colors = ['Hijau', 'Kuning', 'Biru', 'Merah'] as const;

      const makeSubConfig = (
        bId: 1 | 2 | 3 | 4,
        subNum: 1 | 2,
        s: number,
        e: number
      ): SubBlockConfig => {
        const letter = letters[bId - 1];
        if (total === 0) {
          return {
            sub_id: `TM${bId}-${subNum}`,
            label_alt: `Blok ${letter}-${subNum}`,
            start_verse_key: '1:1',
            start_word_index: 1,
            end_verse_key: '1:1',
            end_word_index: 1,
            preview_text: '',
          };
        }
        const clampedS = Math.max(0, Math.min(s, total - 1));
        const clampedE = Math.max(clampedS, Math.min(e, total - 1));
        const sw = allWords[clampedS];
        const ew = allWords[clampedE];
        return {
          sub_id: `TM${bId}-${subNum}`,
          label_alt: `Blok ${letter}-${subNum}`,
          start_verse_key: sw.verse_key,
          start_word_index: sw.word_index,
          end_verse_key: ew.verse_key,
          end_word_index: ew.word_index,
          preview_text: buildPreviewText(clampedS, clampedE),
        };
      };

      const cfg = {} as PageBlockConfig;
      ([1, 2, 3, 4] as const).forEach((bId, bIdx) => {
        cfg[bId] = {
          block_id: bId,
          label_primary: `TM${bId}`,
          label_alt: `Blok ${letters[bIdx]}`,
          color_name: colors[bIdx],
          sub_1: makeSubConfig(bId, 1, pairs[bIdx * 2][0], pairs[bIdx * 2][1]),
          sub_2: makeSubConfig(bId, 2, pairs[bIdx * 2 + 1][0], pairs[bIdx * 2 + 1][1]),
        };
      });
      return cfg;
    },
    [allWords, buildPreviewText]
  );

  // Extract current 8 [startIdx, endIdx] pairs from activeConfig
  const currentIndexPairs = useMemo((): Array<[number, number]> => {
    if (!activeConfig || allWords.length === 0) {
      return Array.from({ length: 8 }, () => [0, 0]);
    }
    const pairs: Array<[number, number]> = [];
    for (const bId of [1, 2, 3, 4] as const) {
      const b = activeConfig[bId];
      const p1 = rangeToGlobalIndices(b?.sub_1) || [0, 0];
      const p2 = rangeToGlobalIndices(b?.sub_2) || [0, 0];
      pairs.push(p1, p2);
    }
    return pairs;
  }, [activeConfig, allWords, rangeToGlobalIndices]);

  // Load page verses from Quran.com API + saved config from /api/admin/tikrar/blocks
  useEffect(() => {
    let isMounted = true;
    async function loadPageData() {
      setIsLoadingPage(true);
      setPageInput(String(pageNumber));
      try {
        const [quranRes, cfgRes] = await Promise.all([
          fetch(
            `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?language=id&fields=text_uthmani&words=true&word_fields=text_uthmani&word_translation_language=id&translations=33`
          ),
          authFetch(`/api/admin/tikrar/blocks?page=${pageNumber}`),
        ]);

        const quranData = await quranRes.json();
        const cfgData = await cfgRes.json();

        if (!isMounted) return;

        const loadedVerses: TikrarVerseLike[] = quranData?.verses || [];
        setVerses(loadedVerses);

        if (cfgData?.success && cfgData?.isCustom && cfgData?.config) {
          setActiveConfig(cfgData.config);
          setNotes(cfgData.notes || '');
          setIsCustomSaved(true);
        } else if (loadedVerses.length > 0) {
          setActiveConfig(generateDefaultPageBlockConfig(pageNumber, loadedVerses));
          setNotes('');
          setIsCustomSaved(false);
        } else {
          setActiveConfig(null);
          setNotes('');
          setIsCustomSaved(false);
        }

        setHasUnsavedChanges(false);
        setClickStep('start');
        setHoveredWordIdx(null);
      } catch (err: any) {
        if (!isMounted) return;
        toast({
          title: 'Gagal memuat halaman Mushaf',
          description: err?.message || 'Periksa koneksi internet Anda.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoadingPage(false);
      }
    }
    loadPageData();
    return () => {
      isMounted = false;
    };
  }, [pageNumber, toast]);

  const activeTargetKey = `${activeTarget.block}.${activeTarget.sub}`;
  const activeTargetIndex = TARGET_KEYS.indexOf(activeTargetKey);
  const activePalette = SUB_BLOCK_PALETTE[activeTargetKey];

  // Apply new boundary for target index `tIdx` and ripple adjacent blocks so NO OVERLAP ever happens!
  const applyNonOverlappingUpdate = useCallback(
    (tIdx: number, newStart: number, newEnd: number, isStartOnly: boolean) => {
      if (allWords.length === 0) return;
      const total = allWords.length;
      const pairs: Array<[number, number]> = currentIndexPairs.map(([s, e]) => [s, e]);

      const safeS = Math.max(0, Math.min(newStart, total - 1));
      const safeE = Math.max(safeS, Math.min(newEnd, total - 1));

      pairs[tIdx] = [safeS, safeE];

      // 1. Adjust preceding sub-blocks (0 .. tIdx - 1) if any of them overlap >= safeS
      let ceiling = safeS - 1;
      for (let i = tIdx - 1; i >= 0; i--) {
        if (ceiling < 0) {
          pairs[i] = [0, 0];
          continue;
        }
        let [s, e] = pairs[i];
        if (e > ceiling) e = ceiling;
        if (s > e) s = e;
        pairs[i] = [s, e];
        ceiling = s - 1;
      }

      // 2. Adjust following sub-blocks (tIdx + 1 .. 7) so they start strictly after safeE (contiguous, no overlap)
      const remainingSubBlocks = 7 - tIdx;
      if (remainingSubBlocks > 0) {
        const nextStart = Math.min(safeE + 1, total - 1);
        if (isStartOnly) {
          // While user only clicked 'start', just push any subsequent sub-block that overlaps <= safeE
          let floor = nextStart;
          for (let i = tIdx + 1; i < 8; i++) {
            let [s, e] = pairs[i];
            if (i === tIdx + 1 || s < floor) {
              s = floor;
            }
            if (e < s) e = s;
            pairs[i] = [s, e];
            floor = Math.min(e + 1, total - 1);
          }
        } else {
          // User finalized 'end' for tIdx!
          // Ensure tIdx + 1 starts immediately at safeE + 1, and redistribute any collided following blocks cleanly
          let floor = nextStart;
          const remainingWords = Math.max(1, total - floor);
          const avgPerBlock = Math.max(1, Math.floor(remainingWords / remainingSubBlocks));

          for (let i = tIdx + 1; i < 8; i++) {
            const isLast = i === 7;
            const [oldS, oldE] = pairs[i];
            const oldLen = Math.max(1, oldE - oldS + 1);

            const s = floor;
            let e: number;
            if (isLast) {
              e = total - 1;
            } else if (oldS >= floor && oldE >= s && oldE < total - (7 - i)) {
              e = oldE;
            } else {
              const step = Math.min(oldLen, avgPerBlock);
              e = Math.min(total - 1 - (7 - i), s + step - 1);
              if (e < s) e = s;
            }
            pairs[i] = [s, e];
            floor = Math.min(e + 1, total - 1);
          }
        }
      }

      const nextConfig = indicesArrayToConfig(pairs);
      setActiveConfig(nextConfig);
      setHasUnsavedChanges(true);
    },
    [allWords.length, currentIndexPairs, indicesArrayToConfig]
  );

  // Word click handler
  const handleWordClick = (verseKey: string, wordPos: number) => {
    const gIdx = wordKeyToIdx.get(`${verseKey}:${wordPos}`);
    if (gIdx === undefined) return;

    const tIdx = activeTargetIndex;
    if (tIdx < 0) return;

    if (clickStep === 'start') {
      // Immediately set start AND end of activeTarget to gIdx so ONLY this word highlights in activeTarget's color
      applyNonOverlappingUpdate(tIdx, gIdx, gIdx, true);
      setClickStep('end');
    } else {
      const currentStart = currentIndexPairs[tIdx]?.[0] ?? gIdx;
      const finalStart = Math.min(currentStart, gIdx);
      const finalEnd = Math.max(currentStart, gIdx);

      applyNonOverlappingUpdate(tIdx, finalStart, finalEnd, false);
      setClickStep('start');
      setHoveredWordIdx(null);

      // Auto-advance to next sub-block if enabled
      if (autoAdvance && tIdx < ALL_SUB_BLOCK_TARGETS.length - 1) {
        const nextTarget = ALL_SUB_BLOCK_TARGETS[tIdx + 1];
        setActiveTarget(nextTarget);
        toast({
          title: `${activeTarget.label} Selesai Diatur`,
          description: `Otomatis lanjut memilih batas untuk ${nextTarget.label} (${nextTarget.title}).`,
        });
      } else {
        toast({
          title: `${activeTarget.label} Diperbarui`,
          description: `Rentang kata untuk ${activeTarget.label} berhasil dikunci.`,
        });
      }
    }
  };

  // Quick action: assign entire verse to active sub-block
  const handleAssignWholeVerse = (verseKey: string) => {
    const verseWords = allWords.filter((w) => w.verse_key === verseKey);
    if (verseWords.length === 0) return;
    const sIdx = verseWords[0].global_idx;
    const eIdx = verseWords[verseWords.length - 1].global_idx;
    const tIdx = activeTargetIndex;

    applyNonOverlappingUpdate(tIdx, sIdx, eIdx, false);
    setClickStep('start');

    if (autoAdvance && tIdx < ALL_SUB_BLOCK_TARGETS.length - 1) {
      setActiveTarget(ALL_SUB_BLOCK_TARGETS[tIdx + 1]);
    }
  };

  // Determine which sub-block owns a word (with activeTarget priority & hover preview)
  const getSubBlockForWord = useCallback(
    (verseKey: string, wordPos: number): string | null => {
      const gIdx = wordKeyToIdx.get(`${verseKey}:${wordPos}`);
      if (gIdx === undefined) return null;

      // 1. If user is currently in 'end' step and hovering, preview the activeTarget range live!
      if (clickStep === 'end' && hoveredWordIdx !== null && activeTargetIndex >= 0) {
        const startIdx = currentIndexPairs[activeTargetIndex]?.[0] ?? gIdx;
        const previewMin = Math.min(startIdx, hoveredWordIdx);
        const previewMax = Math.max(startIdx, hoveredWordIdx);
        if (gIdx >= previewMin && gIdx <= previewMax) {
          return activeTargetKey;
        }
      }

      // 2. Check activeTarget first so its highlight is NEVER stolen by another sub-block
      if (activeTargetIndex >= 0) {
        const [aS, aE] = currentIndexPairs[activeTargetIndex] || [-1, -1];
        if (gIdx >= aS && gIdx <= aE) {
          return activeTargetKey;
        }
      }

      // 3. Check all 8 sub-blocks
      for (let i = 0; i < 8; i++) {
        const [s, e] = currentIndexPairs[i] || [-1, -1];
        if (gIdx >= s && gIdx <= e) {
          return TARGET_KEYS[i];
        }
      }
      return null;
    },
    [
      wordKeyToIdx,
      clickStep,
      hoveredWordIdx,
      activeTargetIndex,
      activeTargetKey,
      currentIndexPairs,
    ]
  );

  const handleAutoDistribute = () => {
    if (verses.length === 0) return;
    const generated = generateDefaultPageBlockConfig(pageNumber, verses);
    setActiveConfig(generated);
    setClickStep('start');
    setActiveTarget(ALL_SUB_BLOCK_TARGETS[0]);
    setHasUnsavedChanges(true);
    toast({
      title: 'Bagi Rata Otomatis diterapkan',
      description: `Seluruh ${allWords.length} kata pada Halaman ${pageNumber} telah dibagi merata menjadi 8 sub-blok. Klik Simpan untuk mengaktifkan.`,
    });
  };

  const handleResetDefault = async () => {
    if (verses.length > 0) {
      setActiveConfig(generateDefaultPageBlockConfig(pageNumber, verses));
    }
    setClickStep('start');
    setActiveTarget(ALL_SUB_BLOCK_TARGETS[0]);

    if (isCustomSaved) {
      setIsSaving(true);
      try {
        const res = await authFetch(`/api/admin/tikrar/blocks?page=${pageNumber}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Gagal menghapus konfigurasi kustom.');
        }
        setIsCustomSaved(false);
        setHasUnsavedChanges(false);
        setNotes('');
        toast({
          title: 'Reset ke Default Berhasil',
          description: `Halaman ${pageNumber} kembali menggunakan pembagian otomatis 8 sub-blok.`,
        });
      } catch (err: any) {
        toast({
          title: 'Gagal menghapus custom config',
          description: err?.message,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      setHasUnsavedChanges(false);
      toast({
        title: 'Direset ke Default',
        description: `Pembagian kata Halaman ${pageNumber} diratakan ulang.`,
      });
    }
  };

  const handleSave = async () => {
    if (!activeConfig) return;
    setIsSaving(true);
    try {
      const res = await authFetch('/api/admin/tikrar/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_number: pageNumber,
          blocks: activeConfig,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan konfigurasi blok.');
      }

      setIsCustomSaved(true);
      setHasUnsavedChanges(false);
      toast({
        title: 'Konfigurasi Blok Tersimpan!',
        description: `Pembagian 4 Blok (8 Sub-Blok) Halaman ${pageNumber} telah aktif untuk seluruh peserta.`,
      });
    } catch (err: any) {
      toast({
        title: 'Gagal Menyimpan',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(pageInput);
    if (num >= 1 && num <= 604) {
      setPageNumber(num);
    } else {
      setPageInput(String(pageNumber));
    }
  };

  const currentJuz = useMemo(() => {
    const idx = JUZ_START_PAGES.findIndex((sp) => sp > pageNumber);
    return idx === -1 ? 30 : Math.max(1, idx);
  }, [pageNumber]);

  return (
    <div className="space-y-5">
      {/* Top Bar: Navigasi Halaman Mushaf & Tombol Simpan */}
      <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Shortcut 30 Juz */}
            <select
              className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200"
              value={currentJuz}
              onChange={(e) => {
                const j = parseInt(e.target.value, 10);
                if (j >= 1 && j <= 30) setPageNumber(JUZ_START_PAGES[j - 1]);
              }}
            >
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Juz {i + 1} (Mulai Hal. {JUZ_START_PAGES[i]})
                </option>
              ))}
            </select>

            {/* Page Stepper */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1 || isLoadingPage}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 px-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Hal</span>
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={handlePageInputSubmit}
                  className="w-14 h-7 text-center font-black text-sm bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6D123F]"
                />
                <span className="text-[10px] font-bold text-slate-400">/ 604</span>
              </form>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setPageNumber((p) => Math.min(604, p + 1))}
                disabled={pageNumber >= 604 || isLoadingPage}
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {isCustomSaved ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-black text-[10px] px-2.5 py-1">
                <Check className="w-3 h-3 mr-1" /> Custom Tersimpan
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-bold text-slate-500 px-2.5 py-1">
                <Sparkles className="w-3 h-3 mr-1 text-amber-500" /> Default ({allWords.length} Kata)
              </Badge>
            )}

            {hasUnsavedChanges && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black text-[10px] px-2.5 py-1 animate-pulse">
                Belum Disimpan
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDistribute}
              disabled={isLoadingPage || isSaving}
              className="rounded-xl text-xs font-bold h-10 border-dashed"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Bagi Rata 8 Sub-Blok
            </Button>
            {isCustomSaved && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                disabled={isLoadingPage || isSaving}
                className="rounded-xl text-xs font-bold h-10 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Default
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoadingPage || isSaving || !activeConfig}
              className={cn(
                'rounded-xl text-xs font-black h-10 px-5 text-white shadow-md transition-all',
                hasUnsavedChanges
                  ? 'bg-[#6D123F] hover:bg-[#580e33] ring-2 ring-[#6D123F]/30'
                  : 'bg-slate-800 hover:bg-slate-700'
              )}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Simpan Blok Halaman {pageNumber}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bar Langkah Pemotongan Sub-Blok (1 -> 8) */}
      <Card className="rounded-3xl border-2 border-[#6D123F]/15 bg-gradient-to-r from-[#6D123F]/[0.03] via-white to-amber-500/[0.04] dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#6D123F] text-white flex items-center justify-center font-black text-xs shadow-sm">
                {activeTargetIndex + 1}/8
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#6D123F] dark:text-pink-400">
                    Sedang Mengatur: {activeTarget.label}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    ({activeTarget.title})
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  {clickStep === 'start' ? (
                    <>
                      <strong>Langkah 1:</strong> Klik <strong>kata pertama (awal)</strong> untuk{' '}
                      <span className={cn('px-1.5 py-0.5 rounded font-black', activePalette?.badge)}>
                        {activeTarget.label}
                      </span>{' '}
                      di Mushaf bawah (atau klik bulatan nomor ayat ﴿١﴾ untuk 1 ayat penuh).
                    </>
                  ) : (
                    <>
                      <strong>Langkah 2:</strong> Sekarang arahkan &amp; klik{' '}
                      <strong>kata terakhir (akhir)</strong> untuk{' '}
                      <span className={cn('px-1.5 py-0.5 rounded font-black', activePalette?.badge)}>
                        {activeTarget.label}
                      </span>
                      . Sub-blok berikutnya akan otomatis bergeser rapi tanpa tumpang-tindih!
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {clickStep === 'end' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setClickStep('start');
                    setHoveredWordIdx(null);
                  }}
                  className="h-8 rounded-xl text-[11px] font-bold border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                >
                  Ulangi Pilih Kata Awal
                </Button>
              )}
              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Auto-Lanjut Sub-Blok
                </span>
              </label>
            </div>
          </div>

          {/* 8 Sub-Block Pills Selector */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {ALL_SUB_BLOCK_TARGETS.map((t, idx) => {
              const key = `${t.block}.${t.sub}`;
              const pal = SUB_BLOCK_PALETTE[key];
              const isSelected = activeTarget.block === t.block && activeTarget.sub === t.sub;
              const [sIdx, eIdx] = currentIndexPairs[idx] || [0, 0];
              const wordCount = allWords.length > 0 && eIdx >= sIdx ? eIdx - sIdx + 1 : 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTarget(t);
                    setClickStep('start');
                    setHoveredWordIdx(null);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-2 rounded-xl border text-left transition-all',
                    isSelected
                      ? cn(pal.bg, pal.text, pal.border, 'ring-2 shadow-sm scale-[1.02]', pal.ring)
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span className={cn('w-2 h-2 rounded-full', pal.dot)} />
                    <span className="text-[11px] font-black tracking-tight">{t.label}</span>
                  </div>
                  <span className="text-[9px] font-bold opacity-75 mt-0.5">{wordCount} kata</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Split View: Kiri Mushaf Interaktif, Kanan Preview Kartu Hasil Potongan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KIRI: Kanvas Mushaf Interaktif per Kata */}
        <Card className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-[#6D123F]" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Kanvas Mushaf Halaman {pageNumber}
              </span>
            </div>
            <Badge
              className={cn(
                'text-[10px] font-black border',
                clickStep === 'start'
                  ? 'bg-[#6D123F] text-white border-[#6D123F]'
                  : 'bg-amber-500 text-white border-amber-600 animate-pulse'
              )}
            >
              {clickStep === 'start'
                ? `Klik Kata AWAL ${activeTarget.label}`
                : `Klik Kata AKHIR ${activeTarget.label}`}
            </Badge>
          </div>

          <CardContent className="p-5 sm:p-7">
            {isLoadingPage ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#6D123F]" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Memuat Mushaf Halaman {pageNumber}...
                </p>
              </div>
            ) : verses.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Data ayat tidak ditemukan untuk halaman {pageNumber}.
              </div>
            ) : (
              <div
                dir="rtl"
                className="font-arabic text-right leading-[2.75] text-2xl sm:text-3xl select-none"
              >
                {verses.map((v) => {
                  const ayahNumber = v.verse_number ?? Number(v.verse_key.split(':')[1] || 0);
                  const isVerseStart = ayahNumber === 1;
                  return (
                    <React.Fragment key={v.verse_key}>
                      {isVerseStart && (
                        <div
                          dir="ltr"
                          className="w-full my-3 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-between"
                        >
                          <span className="text-xs font-black uppercase tracking-widest text-[#6D123F] dark:text-amber-400">
                            Awal Surah ({v.verse_key.split(':')[0]})
                          </span>
                          <span className="font-arabic text-base text-slate-600 dark:text-slate-300">
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                          </span>
                        </div>
                      )}

                      {v.words && v.words.length > 0 ? (
                        v.words.map((w: VerseWordLike, idx: number) => {
                          if (w.char_type_name === 'end') {
                            return (
                              <span
                                key={`${v.verse_key}:end:${idx}`}
                                onClick={() => handleAssignWholeVerse(v.verse_key)}
                                title={`Klik nomor ayat untuk memasukkan seluruh Ayat ${v.verse_key} ke ${activeTarget.label}`}
                                className="inline-flex items-center justify-center mx-1 px-2 py-0.5 rounded-full text-xs font-sans font-black bg-slate-100 hover:bg-[#6D123F] hover:text-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 align-middle cursor-pointer transition-colors"
                              >
                                ﴿{ayahNumber}﴾
                              </span>
                            );
                          }

                          const wordPos = w.position ?? idx + 1;
                          const gIdx = wordKeyToIdx.get(`${v.verse_key}:${wordPos}`);
                          const ownerKey = getSubBlockForWord(v.verse_key, wordPos);
                          const pal = ownerKey ? SUB_BLOCK_PALETTE[ownerKey] : null;
                          const isCurrentTarget = ownerKey === activeTargetKey;

                          const ownerIdx = ownerKey ? TARGET_KEYS.indexOf(ownerKey) : -1;
                          const [oStart, oEnd] =
                            ownerIdx >= 0 ? currentIndexPairs[ownerIdx] : [-1, -1];
                          const isStartBoundary = gIdx === oStart;
                          const isEndBoundary = gIdx === oEnd;

                          return (
                            <span
                              key={`${v.verse_key}:${wordPos}:${idx}`}
                              onClick={() => handleWordClick(v.verse_key, wordPos)}
                              onMouseEnter={() => {
                                if (clickStep === 'end' && gIdx !== undefined) {
                                  setHoveredWordIdx(gIdx);
                                }
                              }}
                              title={`Ayat ${v.verse_key} (Kata #${wordPos}: ${
                                w.translation?.text || '-'
                              }) — ${
                                ownerKey ? `Milik TM${ownerKey.replace('.sub_', '-')}` : 'Belum diatur'
                              }`}
                              className={cn(
                                'inline-block mx-[2px] my-[3px] px-2 py-0.5 rounded-xl cursor-pointer transition-all border',
                                pal
                                  ? cn(pal.bg, pal.text, pal.border)
                                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
                                isCurrentTarget &&
                                  cn('ring-2 shadow-sm font-bold', pal?.ring || 'ring-[#6D123F]'),
                                (isStartBoundary || isEndBoundary) && 'relative'
                              )}
                            >
                              {isStartBoundary && ownerKey && (
                                <span
                                  dir="ltr"
                                  className={cn(
                                    'inline-block align-top text-[8px] font-sans font-black px-1 py-0.2 rounded mr-1 leading-tight',
                                    pal?.badge
                                  )}
                                >
                                  {ownerKey.replace('.sub_', '-')}
                                </span>
                              )}
                              {w.text_uthmani}
                            </span>
                          );
                        })
                      ) : (
                        <span className="inline-block px-2 py-1">{v.text_uthmani}</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KANAN: 4 Blok & Live Preview Kartu Hasil Potongan (Maroon & Hitam) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6D123F]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Hasil Potongan 4 Blok (Preview Kartu Peserta)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Maroon = Sub 1 • Hitam = Sub 2
            </span>
          </div>

          {([1, 2, 3, 4] as const).map((bId, bIdx) => {
            const theme = SYAAMIL_BLOCK_THEME[bId];
            const block = activeConfig?.[bId];
            const sub1Key = `${bId}.sub_1`;
            const sub2Key = `${bId}.sub_2`;
            const pal1 = SUB_BLOCK_PALETTE[sub1Key];
            const pal2 = SUB_BLOCK_PALETTE[sub2Key];

            const isSub1Active = activeTarget.block === bId && activeTarget.sub === 'sub_1';
            const isSub2Active = activeTarget.block === bId && activeTarget.sub === 'sub_2';

            const [s1, e1] = currentIndexPairs[bIdx * 2] || [0, 0];
            const [s2, e2] = currentIndexPairs[bIdx * 2 + 1] || [0, 0];
            const wordsSub1 =
              allWords.length > 0 && e1 >= s1 ? allWords.slice(s1, e1 + 1) : [];
            const wordsSub2 =
              allWords.length > 0 && e2 >= s2 ? allWords.slice(s2, e2 + 1) : [];

            return (
              <Card
                key={bId}
                className={cn(
                  'rounded-3xl border transition-all overflow-hidden bg-white dark:bg-slate-900',
                  isSub1Active || isSub2Active
                    ? 'border-[#6D123F] shadow-md'
                    : 'border-slate-200 dark:border-white/10 shadow-sm'
                )}
              >
                <div className={cn('px-4 py-2.5 text-white flex items-center justify-between', theme.headerBg)}>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-[9px] font-black uppercase', theme.badgeClass)}>
                      {theme.tmLabel} • Blok {theme.letter} ({theme.colorName})
                    </Badge>
                  </div>
                  <span className="text-[10px] font-bold text-white/85">
                    Total {wordsSub1.length + wordsSub2.length} Kata
                  </span>
                </div>

                <CardContent className="p-3.5 space-y-3">
                  {/* Selector Buttons for Sub 1 & Sub 2 */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTarget(ALL_SUB_BLOCK_TARGETS[bIdx * 2]);
                        setClickStep('start');
                        setHoveredWordIdx(null);
                      }}
                      className={cn(
                        'p-2.5 rounded-2xl border text-left transition-all',
                        pal1.bg,
                        pal1.border,
                        isSub1Active && cn('ring-2 shadow-sm', pal1.ring)
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-md', pal1.badge)}>
                          TM{bId}-1 (Maroon)
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {wordsSub1.length} kata
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-1.5 truncate">
                        {block?.sub_1
                          ? `Ayat ${block.sub_1.start_verse_key} (#${block.sub_1.start_word_index}) → ${block.sub_1.end_verse_key} (#${block.sub_1.end_word_index})`
                          : '-'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTarget(ALL_SUB_BLOCK_TARGETS[bIdx * 2 + 1]);
                        setClickStep('start');
                        setHoveredWordIdx(null);
                      }}
                      className={cn(
                        'p-2.5 rounded-2xl border text-left transition-all',
                        pal2.bg,
                        pal2.border,
                        isSub2Active && cn('ring-2 shadow-sm', pal2.ring)
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-md', pal2.badge)}>
                          TM{bId}-2 (Hitam)
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {wordsSub2.length} kata
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-1.5 truncate">
                        {block?.sub_2
                          ? `Ayat ${block.sub_2.start_verse_key} (#${block.sub_2.start_word_index}) → ${block.sub_2.end_verse_key} (#${block.sub_2.end_word_index})`
                          : '-'}
                      </div>
                    </button>
                  </div>

                  {/* Live Preview Tampilan Kartu Peserta (Maroon & Hitam) */}
                  <div
                    dir="rtl"
                    className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/5 font-arabic text-right text-lg leading-[2.1] max-h-36 overflow-y-auto"
                  >
                    <span
                      onClick={() => {
                        setActiveTarget(ALL_SUB_BLOCK_TARGETS[bIdx * 2]);
                        setClickStep('start');
                      }}
                      className="text-[#800000] dark:text-rose-400 font-semibold cursor-pointer hover:underline"
                      title={`TM${bId}-1 (Sub 1 Maroon)`}
                    >
                      {wordsSub1.map((w) => w.text_uthmani).join(' ')}
                    </span>{' '}
                    <span className="mx-1 text-xs font-sans font-black text-slate-300">|</span>{' '}
                    <span
                      onClick={() => {
                        setActiveTarget(ALL_SUB_BLOCK_TARGETS[bIdx * 2 + 1]);
                        setClickStep('start');
                      }}
                      className="text-slate-900 dark:text-slate-100 cursor-pointer hover:underline"
                      title={`TM${bId}-2 (Sub 2 Hitam)`}
                    >
                      {wordsSub2.map((w) => w.text_uthmani).join(' ')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Catatan Pembagian Halaman */}
          <Card className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
            <CardContent className="p-3.5 space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                Catatan Pembagian Halaman (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Mis: QS Al-Baqarah 282 dibagi 4 per waqaf utama..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="text-xs rounded-xl"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
