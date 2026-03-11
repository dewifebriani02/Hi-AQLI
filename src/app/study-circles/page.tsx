
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Clock, User, ChevronRight, BookOpen, Zap, PlayCircle, Timer, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";

const studyCircles = [
  {
    id: "tikrar-j30-b1",
    title: "TIKRAR DAILY JUZ 30 - BATCH 1",
    instructor: "Tim Asatizah AQLI",
    description: "Program hafalan terstruktur dengan metode Tikrar 40x. Infaq pendaftaran sudah termasuk bimbingan & ujian.",
    schedule: "Setiap Hari (Mandiri)",
    level: "All Levels",
    isPremium: true,
    tag: "PENDAFTARAN DIBUKA"
  },
  {
    id: "tafsir-j30",
    title: "Tafsir Juz' Amma",
    instructor: "Dr. Fatima Ahmed",
    description: "Studi mendalam tentang makna dan konteks bagian terakhir Al-Qur'an, cocok untuk pemula.",
    schedule: "Sabtu, 10:00 WIB",
    level: "Pemula",
    isPremium: false
  },
  {
    id: "tajwid-adv",
    title: "Tajwid Lanjutan: Sifaat Al-Huroof",
    instructor: "Syekh Yusuf Ibrahim",
    description: "Eksplorasi rinci tentang karakteristik huruf Arab (Sifaat) untuk qari berpengalaman.",
    schedule: "Senin & Rabu, 19:00 WIB",
    level: "Lanjutan",
    isPremium: false
  },
  {
    id: "sirah-nabi",
    title: "Sirah Nabi (SAW)",
    instructor: "Ustadha Aisha Khan",
    description: "Perjalanan melalui kehidupan Nabi Muhammad (SAW) dan dapatkan pelajaran abadi untuk hari ini.",
    schedule: "Minggu, 14:00 WIB",
    level: "Semua Level",
    isPremium: false
  },
];

export default function StudyCirclesPage() {
  const [search, setSearch] = useState("");
  const { user } = useUser();
  const db = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);

  // Check all pending registrations
  const regQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "halaqah_registrations"),
      where("userId", "==", user.uid),
      where("status", "==", "pending_verification")
    );
  }, [db, user?.uid]);

  const { data: pendingRegs } = useCollection(regQuery);

  const filteredCircles = studyCircles.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.instructor.toLowerCase().includes(search.toLowerCase())
  );

  const isHalaqahActive = (id: string) => {
    return userData?.followedHalaqahs?.includes(id) || (id === 'tikrar-j30-b1' && userData?.isTikrarPaid);
  };

  const isHalaqahPending = (id: string) => {
    return pendingRegs?.some(reg => reg.halaqahId === id);
  };

  const getFollowingCount = () => {
    return studyCircles.filter(c => isHalaqahActive(c.id) || isHalaqahPending(c.id)).length;
  };

  const renderCircleCard = (circle: typeof studyCircles[0]) => {
    const isActive = isHalaqahActive(circle.id);
    const isPending = isHalaqahPending(circle.id);
    
    let href = `/study-circles/registration?id=${circle.id}`;
    if (isActive) {
      href = circle.id === 'tikrar-j30-b1' ? '/tajweed' : `/study-circles/${circle.id}`;
    }

    return (
      <Link key={circle.id} href={isPending ? "#" : href}>
        <Card 
          className={cn(
            "p-4 hover:bg-accent/50 transition-all cursor-pointer group border-none shadow-sm",
            isActive ? "bg-blue-50 border-l-4 border-blue-600" :
            isPending ? "bg-amber-50 border-l-4 border-amber-500" :
            circle.isPremium ? "bg-[#800000]/5 border-l-4 border-[#800000]" : "bg-card/50"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl font-bold group-hover:text-white transition-colors",
                isActive ? "bg-blue-600 text-white" : 
                isPending ? "bg-amber-500 text-white" :
                circle.isPremium ? "bg-[#800000] text-white" : "bg-[#800000]/10 text-[#800000]"
              )}>
                {isActive ? <PlayCircle className="w-6 h-6" /> : 
                 isPending ? <Timer className="w-6 h-6 animate-pulse" /> :
                 circle.isPremium ? <Zap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={cn("font-bold text-base leading-tight", isActive && "text-blue-900", isPending && "text-amber-900")}>{circle.title}</h4>
                  {isActive ? (
                    <Badge className="bg-blue-600 text-white border-none text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">AKTIF</Badge>
                  ) : isPending ? (
                    <Badge className="bg-amber-500 text-white border-none text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">VERIFIKASI ADMIN</Badge>
                  ) : (
                    circle.isPremium && <Badge className="bg-[#800000] text-white border-none text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">PREMIUM</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <User className="w-3 h-3" />
                  <span>{circle.instructor}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium">
                  {isActive ? (
                    <span className="text-blue-600 font-black uppercase tracking-widest flex items-center gap-1">
                      <PlayCircle className="w-3 h-3" /> MASUK KELAS
                    </span>
                  ) : isPending ? (
                    <span className="text-amber-600 font-black uppercase tracking-widest flex items-center gap-1">
                      <Timer className="w-3 h-3" /> MENUNGGU PERSETUJUAN
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{circle.schedule}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] h-4 font-bold px-1.5 py-0 border-[#800000]/20 text-[#800000] uppercase">
                        {circle.level}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            {!isPending && <ChevronRight className={cn(
              "w-5 h-5 transition-colors", 
              isActive ? "text-blue-400" : "text-muted-foreground/30 group-hover:text-[#800000]"
            )} />}
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-24">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Perpustakaan Halaqah</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Materi & Pendaftaran</h1>
        <p className="text-muted-foreground text-sm">
          Semua program Halaqah memerlukan verifikasi pendaftaran oleh Admin Sahabat AQLI.
        </p>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari program atau instruktur..." 
          className="pl-11 h-12 bg-muted/50 border-none ring-offset-background text-sm" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-xl mx-1">
          <TabsTrigger value="all" className="font-bold text-xs uppercase tracking-widest">
            Semua ({filteredCircles.length})
          </TabsTrigger>
          <TabsTrigger value="following" className="font-bold text-xs uppercase tracking-widest">
            Diikuti ({getFollowingCount()})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col gap-3 px-1">
          <TabsContent value="all" className="space-y-3 m-0">
            {filteredCircles.map(renderCircleCard)}
          </TabsContent>

          <TabsContent value="following" className="space-y-3 m-0">
            {studyCircles
              .filter(c => isHalaqahActive(c.id) || isHalaqahPending(c.id))
              .map(renderCircleCard)}
            {getFollowingCount() === 0 && (
              <div className="py-20 text-center space-y-4">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground italic">Anda belum memiliki pendaftaran aktif.</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
