"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Surah {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
  translated_name: {
    name: string;
  };
}

export function SurahList() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSurahs() {
      try {
        const response = await fetch("https://api.quran.com/api/v4/chapters?language=id");
        const data = await response.json();
        setSurahs(data.chapters);
      } catch (error) {
        console.error("Gagal mengambil daftar surat:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSurahs();
  }, []);

  const filteredSurahs = surahs.filter((s) =>
    s.name_simple.toLowerCase().includes(search.toLowerCase()) ||
    s.translated_name.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari surat..." 
          className="pl-10 h-11 bg-muted/50 border-none ring-offset-background" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
        {filteredSurahs.map((surah) => (
          <Link key={surah.id} href={`/tilawah/${surah.id}`}>
            <Card 
              className="p-4 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer group border-none shadow-sm bg-card/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors rotate-45">
                    <span className="-rotate-45">{surah.id}</span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-bold text-base">{surah.name_simple}</h4>
                    <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">
                      {surah.translated_name.name} • {surah.verses_count} Ayat
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-arabic leading-none mb-1">{surah.name_arabic}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-accent-foreground/80 font-semibold">
                    {surah.revelation_place === "makkah" ? "Makkiyah" : "Madaniyah"}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}