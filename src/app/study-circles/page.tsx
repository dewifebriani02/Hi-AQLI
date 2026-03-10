
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Clock, User, ChevronRight, BookOpen, Star, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

const studyCircles = [
  {
    id: "tikrar-j30-b1",
    title: "TIKRAR DAILY JUZ 30 - BATCH 1",
    instructor: "Tim Asatizah AQLI",
    description: "Program hafalan terstruktur dengan metode Tikrar 40x. Infaq Rp 50rb/bulan termasuk bimbingan & ujian.",
    schedule: "Setiap Hari (Mandiri)",
    level: "All Levels",
    isPremium: true,
    tag: "PENDAFTARAN DIBUKA",
    regLink: "/study-circles/tikrar-registration"
  },
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
];

export default function StudyCirclesPage() {
  const [search, setSearch] = useState("");
  const { user } = useUser();
  const db = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "users", user.uid);
  }, [db, user]);

  const { data: userData } = useDoc(userDocRef);

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
        <h1 className="text-3xl font-bold font-headline tracking-tight">Materi & Pendaftaran</h1>
        <p className="text-muted-foreground text-sm">
          Daftar program unggulan Tikrar Daily atau pilih materi lingkar studi lainnya.
        </p>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari program, materi, atau instruktur..." 
          className="pl-11 h-12 bg-muted/50 border-none ring-offset-background text-sm" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 px-1">
        {filteredCircles.map((circle) => {
          // Check if this is the premium Tikrar program and if user is already paid
          const isTikrar = circle.id === 'tikrar-j30-b1';
          const isRegistered = isTikrar && userData?.isTikrarPaid;
          const userPaidJuz = userData?.paidJuz;

          // If registered, direct to the tool. If not registered but Tikrar, direct to registration.
          const href = isRegistered 
            ? '/tajweed' 
            : (isTikrar ? '/study-circles/tikrar-registration' : `/study-circles/${circle.id}`);

          return (
            <Link key={circle.id} href={href}>
              <Card 
                className={cn(
                  "p-4 hover:bg-accent/50 transition-all cursor-pointer group border-none shadow-sm",
                  circle.isPremium ? "bg-[#800000]/5 border-l-4 border-[#800000]" : "bg-card/50"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl font-bold group-hover:text-white transition-colors",
                      isRegistered ? "bg-blue-600 text-white" : 
                      circle.isPremium ? "bg-[#800000] text-white" : "bg-[#800000]/10 text-[#800000]"
                    )}>
                      {isRegistered ? <CheckCircle2 className="w-6 h-6" /> : circle.isPremium ? <Zap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base leading-tight">{circle.title}</h4>
                        {isRegistered ? (
                          <Badge className="bg-blue-600 text-white border-none text-[7px] h-4 px-1.5 font-black uppercase">AKTIF - JUZ {userPaidJuz}</Badge>
                        ) : (
                          circle.tag && (
                            <Badge className="bg-emerald-500 text-white border-none text-[6px] sm:text-[7px] h-4 px-1.5 font-black uppercase tracking-tighter whitespace-nowrap">
                              {circle.tag}
                            </Badge>
                          )
                        )}
                      </div>
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
          );
        })}
      </div>
    </div>
  );
}
