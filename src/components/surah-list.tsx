
"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const surahs = [
  { id: 1, name: "Al-Fatihah", translation: "Pembukaan", verses: 7, type: "Makkiyah", arabic: "الفاتحة" },
  { id: 2, name: "Al-Baqarah", translation: "Sapi Betina", verses: 286, type: "Madaniyah", arabic: "البقرة" },
  { id: 3, name: "Ali 'Imran", translation: "Keluarga 'Imran", verses: 200, type: "Madaniyah", arabic: "آل عمران" },
  { id: 4, name: "An-Nisa'", translation: "Wanita", verses: 176, type: "Madaniyah", arabic: "النساء" },
  { id: 5, name: "Al-Ma'idah", translation: "Hidangan", verses: 120, type: "Madaniyah", arabic: "المائدة" },
  { id: 6, name: "Al-An'am", translation: "Binatang Ternak", verses: 165, type: "Makkiyah", arabic: "الأنعام" },
  { id: 7, name: "Al-A'raf", translation: "Tempat yang Tertinggi", verses: 206, type: "Makkiyah", arabic: "الأعراف" },
  { id: 8, name: "Al-Anfal", translation: "Rampasan Perang", verses: 75, type: "Madaniyah", arabic: "الأنفال" },
  { id: 9, name: "At-Tawbah", translation: "Pengampunan", verses: 129, type: "Madaniyah", arabic: "التوبة" },
  { id: 10, name: "Yunus", translation: "Yunus", verses: 109, type: "Makkiyah", arabic: "يونس" },
  { id: 11, name: "Hud", translation: "Hud", verses: 123, type: "Makkiyah", arabic: "هود" },
  { id: 12, name: "Yusuf", translation: "Yusuf", verses: 111, type: "Makkiyah", arabic: "يوسف" },
];

export function SurahList() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
      {surahs.map((surah) => (
        <Card 
          key={surah.id} 
          className="p-4 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group border-none shadow-sm bg-card/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors rotate-45">
                <span className="-rotate-45">{surah.id}</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-base">{surah.name}</h4>
                <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">
                  {surah.translation} • {surah.verses} Ayat
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-arabic leading-none mb-1">{surah.arabic}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-accent-foreground/80 font-semibold">
                {surah.type}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
