
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Clock, User, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";

const studyCircles = [
  {
    id: "1",
    title: "Tafsir Juz' Amma",
    instructor: "Dr. Fatima Ahmed",
    description: "Studi mendalam tentang makna dan konteks bagian terakhir Al-Qur'an, cocok untuk pemula.",
    schedule: "Sabtu, 10:00 WIB",
    level: "Pemula",
  },
  {
    id: "2",
    title: "Tajwid Lanjutan: Sifaat Al-Huroof",
    instructor: "Syekh Yusuf Ibrahim",
    description: "Eksplorasi rinci tentang karakteristik huruf Arab (Sifaat) untuk qari berpengalaman.",
    schedule: "Senin & Rabu, 19:00 WIB",
    level: "Lanjutan",
  },
  {
    id: "3",
    title: "Sirah Nabi (SAW)",
    instructor: "Ustadha Aisha Khan",
    description: "Perjalanan melalui kehidupan Nabi Muhammad (SAW) dan dapatkan pelajaran abadi untuk hari ini.",
    schedule: "Minggu, 14:00 WIB",
    level: "Semua Level",
  },
  {
    id: "4",
    title: "Fikih Ibadah",
    instructor: "Imam Omar Farooq",
    description: "Pahami hukum dan hikmah di balik ibadah inti, termasuk Salat, Zakat, dan Puasa.",
    schedule: "Kamis, 20:00 WIB",
    level: "Menengah",
  },
];

export default function StudyCirclesPage() {
  const [search, setSearch] = useState("");

  const filteredCircles = studyCircles.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.instructor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Perpustakaan Halaqah</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Materi Belajar</h1>
        <p className="text-muted-foreground text-sm">
          Pilih materi atau lingkar studi untuk mulai belajar dan lihat peringkat Anda di dalam grup.
        </p>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari buku, materi, atau instruktur..." 
          className="pl-11 h-12 bg-muted/50 border-none ring-offset-background text-sm" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 px-1">
        {filteredCircles.map((circle) => (
          <Link key={circle.id} href={`/study-circles/${circle.id}`}>
            <Card 
              className="p-4 hover:bg-accent/50 transition-all cursor-pointer group border-none shadow-sm bg-card/50"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#800000]/10 text-[#800000] font-bold group-hover:bg-[#800000] group-hover:text-white transition-colors">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-bold text-base leading-tight">{circle.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{circle.instructor}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{circle.schedule}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] h-4 font-bold px-1.5 py-0 border-[#800000]/20 text-[#800000] uppercase">
                        {circle.level}
                      </Badge>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-[#800000] transition-colors" />
              </div>
            </Card>
          </Link>
        ))}
        {filteredCircles.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Materi tidak ditemukan. Silakan coba kata kunci lain.
          </div>
        )}
      </div>
    </div>
  );
}
