
"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Clock, User, ChevronRight, BookOpen, Zap, PlayCircle, Timer, CheckCircle2, Loader2, Library, Banknote } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";

// Special ID for Tikrar Premium logic
const TIKRAR_ID = 'tikrar-j30-b1';

export default function NgajiPage() {
  const [search, setSearch] = useState("");
  const { user } = useUser();
  const db = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);

  // Fetch all classes from Firestore
  const halaqahQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "halaqahs");
  }, [db]);

  const { data: dbHalaqahs, isLoading: isHalaqahsLoading } = useCollection(halaqahQuery);

  // Fetch all registrations across all users to calculate quota
  const allRegsGlobalQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "halaqah_registrations"),
      where("status", "in", ["active", "pending_verification"])
    );
  }, [db]);

  const { data: allRegsGlobal } = useCollection(allRegsGlobalQuery);

  // Check current user registrations
  const userRegQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "halaqah_registrations"),
      where("userId", "==", user.uid)
    );
  }, [db, user?.uid]);

  const { data: userRegs } = useCollection(userRegQuery);

  const filteredCircles = dbHalaqahs?.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.muallimah.toLowerCase().includes(search.toLowerCase())
  );

  const getHalaqahStatus = (id: string) => {
    const reg = userRegs?.find(r => r.halaqahId === id);
    if (!reg) {
      if (id === TIKRAR_ID && userData?.isTikrarPaid) return 'active';
      if (userData?.followedHalaqahs?.includes(id)) return 'active';
      return 'none';
    }
    return reg.status; // 'active', 'pending_verification', 'rejected'
  };

  const isHalaqahActive = (id: string) => getHalaqahStatus(id) === 'active';
  const isHalaqahPending = (id: string) => getHalaqahStatus(id) === 'pending_verification';

  const getSisaKuota = (halaqah: any) => {
    const totalReg = allRegsGlobal?.filter(r => r.halaqahId === halaqah.id).length || 0;
    return Math.max(0, (halaqah.quota || 0) - totalReg);
  };

  const renderCircleCard = (circle: any) => {
    const status = getHalaqahStatus(circle.id);
    const isActive = status === 'active';
    const isPending = status === 'pending_verification';
    const sisaKuota = getSisaKuota(circle);
    const isFull = sisaKuota <= 0 && !isActive && !isPending;
    
    let href = `/study-circles/registration?id=${circle.id}`;
    if (isActive) {
      href = circle.id === TIKRAR_ID ? '/hafal' : `/study-circles/${circle.id}`;
    }

    return (
      <Link key={circle.id} href={(isPending || isFull) ? "#" : href}>
        <Card 
          className={cn(
            "p-4 hover:bg-accent/5 transition-all cursor-pointer group border-none shadow-sm",
            isActive ? "bg-white border-l-4 border-[#D4AF37]" :
            isPending ? "bg-white border-l-4 border-amber-500" :
            circle.isPremium ? "bg-white border-l-4 border-[#800000]" : "bg-card/50",
            isFull && "opacity-60"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl font-bold group-hover:scale-105 transition-transform",
                isActive ? "bg-[#D4AF37] text-black" : 
                isPending ? "bg-amber-500 text-white" :
                circle.isPremium ? "bg-[#800000] text-white" : "bg-[#800000]/10 text-[#800000]"
              )}>
                {isActive ? <PlayCircle className="w-6 h-6" /> : 
                 isPending ? <Timer className="w-6 h-6 animate-pulse" /> :
                 circle.isPremium ? <Zap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={cn("font-black text-sm uppercase leading-tight", isActive ? "text-black" : "text-[#800000]")}>{circle.title}</h4>
                  {isActive ? (
                    <Badge className="bg-[#D4AF37] text-black border-none text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">AKTIF</Badge>
                  ) : isPending ? (
                    <Badge className="bg-amber-500 text-white border-none text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">VERIFIKASI</Badge>
                  ) : isFull ? (
                    <Badge variant="outline" className="text-destructive border-destructive text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">PENUH</Badge>
                  ) : (
                    circle.isPremium && <Badge className="bg-[#800000] text-white border-none text-[7px] h-4 px-1.5 font-black uppercase tracking-widest">PREMIUM</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground mt-1">
                  <User className="w-3 h-3 text-[#800000]" />
                  <span>Mu'allimah: {circle.muallimah}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-[#800000]" />
                    <span>{circle.schedule}</span>
                  </div>
                  <span className="text-[#800000]/40">•</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-2.5 h-2.5 text-[#800000]" />
                    <span>Sisa Kuota: {sisaKuota}</span>
                  </div>
                  {circle.isPremium && !isActive && !isPending && (
                    <>
                      <span className="text-[#800000]/40">•</span>
                      <div className="flex items-center gap-1 text-[#800000]">
                        <Banknote className="w-2.5 h-2.5" />
                        <span>Rp {circle.basePrice?.toLocaleString('id-ID')}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {!isPending && !isFull && <ChevronRight className={cn(
              "w-5 h-5 transition-colors", 
              isActive ? "text-[#D4AF37]" : "text-muted-foreground/30 group-hover:text-[#800000]"
            )} />}
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-32">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Ngaji • Pendaftaran Kelas</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Materi & Pendaftaran</h1>
        <p className="text-muted-foreground text-sm">
          Pilih program Tahsin, Tafsir, atau Tahfidz sesuai level Anda. Semua pendaftaran diverifikasi oleh Admin HI AQLI.
        </p>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari program atau mu'allimah..." 
          className="pl-11 h-12 bg-white border-2 border-[#800000]/5 focus-visible:ring-[#800000] text-sm font-medium" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1 rounded-xl mx-1">
          <TabsTrigger value="all" className="font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-[#800000] data-[state=active]:text-white">
            Semua
          </TabsTrigger>
          <TabsTrigger value="following" className="font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-[#800000] data-[state=active]:text-white">
            Diikuti
          </TabsTrigger>
          <TabsTrigger value="completed" className="font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-[#800000] data-[state=active]:text-white">
            Selesai
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col gap-3 px-1">
          {isHalaqahsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-[#800000] h-10 w-10" />
              <p className="text-[10px] font-black uppercase text-muted-foreground">Memuat Program...</p>
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-3 m-0">
                {filteredCircles?.map(renderCircleCard)}
                {(!filteredCircles || filteredCircles.length === 0) && (
                  <div className="py-20 text-center space-y-4">
                    <Library className="w-12 h-12 mx-auto text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Belum ada kelas yang tersedia</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="space-y-3 m-0">
                {dbHalaqahs
                  ?.filter(c => isHalaqahActive(c.id) || isHalaqahPending(c.id))
                  .map(renderCircleCard)}
                {dbHalaqahs?.filter(c => isHalaqahActive(c.id) || isHalaqahPending(c.id)).length === 0 && (
                  <div className="py-20 text-center space-y-4">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Belum ada kelas yang diikuti</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-3 m-0">
                <div className="py-20 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Belum ada materi yang selesai</p>
                </div>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
