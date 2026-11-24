import React from 'react';
import { cn } from '@/lib/utils';

export type TajwidCategoryKey =
  | 'ghunnah'
  | 'ikhfa'
  | 'iqlab'
  | 'idgham_no_ghunnah'
  | 'qalqalah'
  | 'mad_long'
  | 'mad_normal'
  | 'silent';

export interface TajwidCategoryMeta {
  key: TajwidCategoryKey;
  label: string;
  shortLabel: string;
  description: string;
  textClass: string;
  dotColor: string;
}

export const TAJWID_CATEGORIES: Record<TajwidCategoryKey, TajwidCategoryMeta> = {
  ghunnah: {
    key: 'ghunnah',
    label: 'Ghunnah / Idgham Bighunnah / Mimi',
    shortLabel: 'Ghunnah & Idgham Bighunnah',
    description: 'Dengung 2 harakat (Nun/Mim bertasydid, Idgham Bighunnah, Idgham Mimi)',
    textClass: 'text-[#15803d] font-bold',
    dotColor: '#15803d',
  },
  ikhfa: {
    key: 'ikhfa',
    label: 'Ikhfa Haqiqi & Ikhfa Syafawi',
    shortLabel: 'Ikhfa',
    description: 'Samar disertai dengung 2 harakat',
    textClass: 'text-[#c2410c] font-bold',
    dotColor: '#c2410c',
  },
  iqlab: {
    key: 'iqlab',
    label: 'Iqlab',
    shortLabel: 'Iqlab',
    description: 'Nun sukun/tanwin bertemu Ba berubah menjadi Mim berdengung',
    textClass: 'text-[#0284c7] font-bold',
    dotColor: '#0284c7',
  },
  qalqalah: {
    key: 'qalqalah',
    label: 'Qalqalah',
    shortLabel: 'Qalqalah',
    description: 'Pantulan bunyi huruf ق ط ب ج د saat sukun/waqaf',
    textClass: 'text-[#0f766e] font-bold',
    dotColor: '#0f766e',
  },
  mad_long: {
    key: 'mad_long',
    label: 'Mad Wajib / Jaiz / Lazim (4–6 Harakat)',
    shortLabel: 'Mad Wajib / Jaiz / Lazim',
    description: 'Bacaan panjang 4–6 harakat (Muttashil, Munfashil, Lazim)',
    textClass: 'text-[#be123c] font-bold',
    dotColor: '#be123c',
  },
  mad_normal: {
    key: 'mad_normal',
    label: "Mad Thabi'i / Arid Lissukun",
    shortLabel: "Mad Thabi'i / Arid",
    description: 'Bacaan panjang 2 harakat (atau 2/4/6 saat waqaf Arid Lissukun)',
    textClass: 'text-[#9333ea]',
    dotColor: '#9333ea',
  },
  idgham_no_ghunnah: {
    key: 'idgham_no_ghunnah',
    label: 'Idgham Bilaghunnah / Mutajanisain',
    shortLabel: 'Idgham Bilaghunnah',
    description: 'Melebur ke huruf berikutnya tanpa dengung (Lam / Ra)',
    textClass: 'text-[#64748b]',
    dotColor: '#64748b',
  },
  silent: {
    key: 'silent',
    label: 'Hamzah Washal / Lam Syamsiyah / Huruf Senyap',
    shortLabel: 'Tidak Dibaca (Washal/Syamsiyah)',
    description: 'Huruf yang tidak dilafalkan saat bacaan bersambung',
    textClass: 'text-[#94a3b8]',
    dotColor: '#94a3b8',
  },
};

export const TAJWID_LEGEND_ITEMS: TajwidCategoryMeta[] = [
  TAJWID_CATEGORIES.ghunnah,
  TAJWID_CATEGORIES.ikhfa,
  TAJWID_CATEGORIES.iqlab,
  TAJWID_CATEGORIES.qalqalah,
  TAJWID_CATEGORIES.mad_long,
  TAJWID_CATEGORIES.mad_normal,
  TAJWID_CATEGORIES.idgham_no_ghunnah,
  TAJWID_CATEGORIES.silent,
];

const RULE_CLASS_TO_CATEGORY: Record<string, TajwidCategoryKey> = {
  ghunnah: 'ghunnah',
  idgham_ghunnah: 'ghunnah',
  idgham_shafawi: 'ghunnah',
  ikhafa: 'ikhfa',
  ikhafa_shafawi: 'ikhfa',
  iqlab: 'iqlab',
  idgham_wo_ghunnah: 'idgham_no_ghunnah',
  idgham_mutajanisayn: 'idgham_no_ghunnah',
  idgham_mutaqaribayn: 'idgham_no_ghunnah',
  qalaqah: 'qalqalah',
  madda_obligatory: 'mad_long',
  madda_obligatory_mottasel: 'mad_long',
  madda_obligatory_monfasel: 'mad_long',
  madda_necessary: 'mad_long',
  madda_normal: 'mad_normal',
  madda_permissible: 'mad_normal',
  ham_wasl: 'silent',
  laam_shamsiyah: 'silent',
  slnt: 'silent',
};

export interface TajwidSegment {
  text: string;
  category: TajwidCategoryKey | null;
  ruleClass: string | null;
}

// Unicode range untuk harakat/tanda baca Al-Qur'an yang wajib ikut menempel pada huruf sebelumnya
// agar ligatur & posisi harakat pada font Amiri tidak bergeser atau terputus di batas <span>.
function isLeadingArabicMark(code: number): boolean {
  return (
    (code >= 0x0610 && code <= 0x061a) ||
    (code >= 0x064b && code <= 0x065f) ||
    code === 0x0670 ||
    (code >= 0x06d6 && code <= 0x06ed)
  );
}

/**
 * Mengurai markup `text_uthmani_tajweed` dari Quran.com API v4 (mis. `<rule class=ghunnah>مّ</rule>َ`)
 * menjadi daftar segmen teks + kategori tajwid yang aman dirender sebagai elemen React `<span>`.
 */
export function parseTajwidMarkup(rawMarkup?: string | null, fallbackText?: string | null): TajwidSegment[] {
  const source = rawMarkup || fallbackText || '';
  if (!source) return [];

  if (!source.includes('<')) {
    return [{ text: source, category: null, ruleClass: null }];
  }

  const tagRegex = /<\/?(?:rule|tajweed|span)(?:\s+class=["']?([a-zA-Z0-9_-]+)["']?)?\s*>/gi;
  const ruleStack: Array<{ ruleClass: string; category: TajwidCategoryKey | null }> = [];
  const rawSegments: TajwidSegment[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const currentRule = () => {
    for (let i = ruleStack.length - 1; i >= 0; i--) {
      if (ruleStack[i].category) return ruleStack[i];
    }
    return ruleStack[ruleStack.length - 1] || null;
  };

  const pushText = (text: string) => {
    if (!text) return;
    const active = currentRule();
    rawSegments.push({
      text,
      category: active?.category ?? null,
      ruleClass: active?.ruleClass ?? null,
    });
  };

  while ((match = tagRegex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      pushText(source.slice(lastIndex, match.index));
    }
    const fullTag = match[0];
    if (fullTag.startsWith('</')) {
      ruleStack.pop();
    } else {
      const cls = (match[1] || '').trim();
      const mapped = RULE_CLASS_TO_CATEGORY[cls] ?? null;
      ruleStack.push({ ruleClass: cls, category: mapped });
    }
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < source.length) {
    pushText(source.slice(lastIndex));
  }

  // Satukan harakat pengikut (combining marks) yang terpisah tepat setelah penutup </rule>
  // ke dalam segmen huruf sebelumnya supaya harakat di atas tasydid (seperti عَمَّ) tidak terlepas.
  const merged: TajwidSegment[] = [];
  for (const seg of rawSegments) {
    let text = seg.text;
    if (merged.length > 0 && text.length > 0) {
      let markCount = 0;
      while (markCount < text.length && isLeadingArabicMark(text.charCodeAt(markCount))) {
        markCount++;
      }
      if (markCount > 0) {
        merged[merged.length - 1].text += text.slice(0, markCount);
        text = text.slice(markCount);
      }
    }
    if (!text) continue;
    const prev = merged[merged.length - 1];
    if (prev && prev.category === seg.category) {
      prev.text += text;
    } else {
      merged.push({ ...seg, text });
    }
  }

  return merged.length > 0
    ? merged
    : [{ text: fallbackText || source.replace(/<[^>]+>/g, ''), category: null, ruleClass: null }];
}

/**
 * Merender teks kata Al-Qur'an dengan pewarnaan hukum tajwid (bila `enabled = true`)
 * atau teks Uthmani polos (bila `enabled = false`).
 */
export function renderTajwidWord(
  word: { text_uthmani?: string; text_uthmani_tajweed?: string } | null | undefined,
  enabled: boolean
): React.ReactNode {
  if (!word) return null;
  if (!enabled || !word.text_uthmani_tajweed) {
    return word.text_uthmani || '';
  }
  const segments = parseTajwidMarkup(word.text_uthmani_tajweed, word.text_uthmani);
  if (segments.length === 1 && !segments[0].category) {
    return segments[0].text;
  }
  return segments.map((seg, idx) => {
    if (!seg.category) {
      return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
    }
    const meta = TAJWID_CATEGORIES[seg.category];
    return (
      <span key={idx} className={meta.textClass}>
        {seg.text}
      </span>
    );
  });
}

/**
 * Komponen baris legenda warna hukum tajwid yang ringkas & responsif.
 */
export function TajwidLegendBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white/95 border border-stone-200/90 px-3 py-2 shadow-2xs space-y-1.5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Panduan Warna Tajwid
        </span>
        <span className="text-[9.5px] font-semibold text-stone-500">
          Standar Mushaf Tajwid
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {TAJWID_LEGEND_ITEMS.map((item) => (
          <span
            key={item.key}
            title={item.description}
            className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-stone-800"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.dotColor }}
            />
            <span>{item.shortLabel}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
