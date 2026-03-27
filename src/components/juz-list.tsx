"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// Mapping Juz to starting surah and verse
const JUZ_MAPPING: Record<number, { surah: number, verse: number, name: string }> = {
  1: { surah: 1, verse: 1, name: "Al-Fatihah" },
  2: { surah: 2, verse: 142, name: "Al-Baqarah" },
  3: { surah: 2, verse: 253, name: "Al-Baqarah" },
  4: { surah: 3, verse: 93, name: "Ali 'Imran" },
  5: { surah: 4, verse: 24, name: "An-Nisa'" },
  6: { surah: 4, verse: 148, name: "An-Nisa'" },
  7: { surah: 5, verse: 82, name: "Al-Ma'idah" },
  8: { surah: 6, verse: 111, name: "Al-An'am" },
  9: { surah: 7, verse: 88, name: "Al-A'raf" },
  10: { surah: 8, verse: 41, name: "Al-Anfal" },
  11: { surah: 9, verse: 93, name: "At-Taubah" },
  12: { surah: 11, verse: 6, name: "Hud" },
  13: { surah: 12, verse: 53, name: "Yusuf" },
  14: { surah: 15, verse: 1, name: "Al-Hijr" },
  15: { surah: 17, verse: 1, name: "Al-Isra'" },
  16: { surah: 18, verse: 75, name: "Al-Kahf" },
  17: { surah: 21, verse: 1, name: "Al-Anbiya'" },
  18: { surah: 23, verse: 1, name: "Al-Mu'minun" },
  19: { surah: 25, verse: 21, name: "Al-Furqan" },
  20: { surah: 27, verse: 56, name: "An-Naml" },
  21: { surah: 29, verse: 45, name: "Al-'Ankabut" },
  22: { surah: 33, verse: 31, name: "Al-Ahzab" },
  23: { surah: 36, verse: 28, name: "Ya-Sin" },
  24: { surah: 39, verse: 32, name: "Az-Zumar" },
  25: { surah: 41, verse: 47, name: "Fussilat" },
  26: { surah: 46, verse: 1, name: "Al-Ahqaf" },
  27: { surah: 51, verse: 31, name: "Adh-Dhariyat" },
  28: { surah: 58, verse: 1, name: "Al-Mujadila" },
  29: { surah: 67, verse: 1, name: "Al-Mulk" },
  30: { surah: 78, verse: 1, name: "An-Naba'" },
};

export function JuzList({ baseUrl = "/mufradat" }: { baseUrl?: string }) {
  const [search, setSearch] = useState("");
  
  const juzArray = Array.from({ length: 30 }, (_, i) => i + 1);
  
  const filteredJuz = juzArray.filter(j => 
    `Juz ${j}`.toLowerCase().includes(search.toLowerCase()) ||
    JUZ_MAPPING[j].name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari Juz (contoh: Juz 30)..." 
          className="pl-10 h-11 bg-muted/50 border-none ring-offset-background text-sm font-medium" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {filteredJuz.map((j) => {
          const mapping = JUZ_MAPPING[j];
          // We link to the surah detail for that Juz's starting point
          return (
            <Link key={j} href={`${baseUrl}/${mapping.surah}`}>
              <Card 
                className="p-5 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer group border-none shadow-sm bg-card/50 hover:shadow-md rounded-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-[#800000] font-black text-lg group-hover:bg-[#800000] group-hover:text-white transition-all transform group-hover:scale-110">
                      {j}
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-black text-lg tracking-tight">Juz {j}</h4>
                      <p className="text-[10px] font-bold text-[#800000] uppercase tracking-widest opacity-70">
                        Dimulai: {mapping.name}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/30 px-3 py-1.5 rounded-full text-[10px] font-black text-muted-foreground group-hover:bg-[#800000]/10 group-hover:text-[#800000] transition-colors">
                    LIHAT SURAH
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
