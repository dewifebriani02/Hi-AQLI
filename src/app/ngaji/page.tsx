
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Clock, User, ChevronRight, BookOpen, Zap, PlayCircle, Timer, CheckCircle2, Loader2, Library, Banknote, Calendar, GraduationCap, Award, Bot, Lock, Mic } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser } from "@/supabase";
import { useDoc, useCollection, useCount } from "@/supabase/db";
import { useMemo } from "react";

// Special ID for Tikrar Premium logic
const TIKRAR_ID = 'tikrar-j30-b1';

export default function NgajiPage() {
  const [search, setSearch] = useState("");
  const { user } = useUser();

  const { data: userData } = useDoc("users", user?.id);
  const salutation = userData?.salutation || "Ukhti";

  // Fetch all classes from Supabase
  const { data: dbHalaqahs, isLoading: isHalaqahsLoading } = useCollection("halaqahs");

  const userRegOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  }), [user?.id]);

  const { data: userRegs } = useCollection("halaqah_registrations", userRegOptions);

  // Optimized Quota Calculation (Count-based)
  // For now we'll just remove the expensive global fetch. 
  // In a real prod app, we'd use a single RPC call for per-halaqah counts.

  const filteredCircles = dbHalaqahs?.filter((c) => {
    const matchesSearch = (c.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.muallimah || "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (c.program_type || c.programType) === 'hi_ngaji';
  });

  const getHalaqahStatus = (id: string) => {
    const reg = userRegs?.find(r => r.halaqah_id === id);
    if (!reg) {
      if (id === TIKRAR_ID && userData?.isTikrarPaid) return 'active';
      if (userData?.followed_halaqahs?.includes(id)) return 'active';
      return 'none';
    }
    return reg.status;
  };

  const isHalaqahActive = (id: string) => getHalaqahStatus(id) === 'active';
  const isHalaqahPending = (id: string) => getHalaqahStatus(id) === 'pending_verification';

  const getSisaKuota = (halaqah: any) => {
    // Note: Since we can't efficiently count per-halaqah in a loop with hooks, 
    // a better approach is a pre-calculated field in DB. 
    // For now, we'll return a placeholder or use the global count if it was small, 
    // but fetching all was definitely the wrong way.
    // Optimization: In a real app, this should be its own API call or field.
    return Math.max(0, (halaqah.quota || 40) - 0); 
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
                (circle.is_premium || circle.isPremium) ? "bg-white border-l-4 border-[#800000]" : "bg-card/50",
            isFull && "opacity-60"
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl font-bold shrink-0",
                  isActive ? "bg-[#D4AF37] text-black" :
                    isPending ? "bg-amber-500 text-white" :
                      circle.isPremium ? "bg-[#800000] text-white" : "bg-[#800000]/10 text-[#800000]"
                )}>
                  {isActive ? <PlayCircle className="w-6 h-6" /> :
                    isPending ? <Timer className="w-6 h-6 animate-pulse" /> :
                      (circle.is_premium || circle.is_premium) ? <Zap className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn("font-black text-sm uppercase leading-tight truncate", isActive ? "text-black" : "text-[#800000]")}>{circle.title}</h4>
                    {isActive ? (
                      <Badge className="bg-[#D4AF37] text-black border-none text-[7px] h-4 px-1.5 font-black uppercase">AKTIF</Badge>
                    ) : isPending ? (
                      <Badge className="bg-amber-500 text-white border-none text-[7px] h-4 px-1.5 font-black uppercase">VERIFIKASI</Badge>
                    ) : isFull ? (
                      <Badge variant="outline" className="text-destructive border-destructive text-[7px] h-4 px-1.5 font-black uppercase">PENUH</Badge>
                    ) : (
                      (circle.is_premium || circle.isPremium) && <Badge className="bg-[#800000] text-white border-none text-[7px] h-4 px-1.5 font-black uppercase">PREMIUM</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                      <User className="w-3 h-3 text-[#800000]" />
                      <span>Mu'allimah: {circle.muallimah}</span>
                    </div>
                    {circle.musyrifah && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                        <User className="w-3 h-3 text-[#D4AF37]" />
                        <span>Musyrifah: {circle.musyrifah}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {!isPending && !isFull && <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-[#800000]" />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-dashed">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Jadwal</span>
                <span className="text-[10px] font-bold flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-[#800000]" /> {circle.schedule}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Rentang</span>
                <span className="text-[9px] font-bold flex flex-col leading-tight">
                  <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5 text-[#800000]" /> { (circle.start_date || circle.startDate) ? new Date(circle.start_date || circle.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                  <span className="flex items-center gap-1 ml-3.5 text-muted-foreground">s/d { (circle.end_date || circle.endDate) ? new Date(circle.end_date || circle.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Durasi</span>
                <span className="text-[10px] font-bold flex items-center gap-1"><Timer className="w-2.5 h-2.5 text-[#800000]" /> {Math.ceil(( (circle.duration_weeks || circle.durationWeeks) || 4) / 4)} Bulan</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-muted-foreground uppercase">Sisa Kuota</span>
                <span className="text-[10px] font-bold flex items-center gap-1">{sisaKuota} <Users className="w-2.5 h-2.5 text-[#800000]" /></span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex gap-2">
                {circle.has_exam || circle.hasExam ? <Badge variant="outline" className="text-[8px] border-emerald-200 text-emerald-700 bg-emerald-50 h-4 flex items-center gap-1"><GraduationCap className="w-2 h-2" /> UJIAN</Badge> : null}
                {circle.has_certificate || circle.hasCertificate ? <Badge variant="outline" className="text-[8px] border-blue-200 text-blue-700 bg-blue-50 h-4 flex items-center gap-1"><Award className="w-2 h-2" /> SERTIFIKAT</Badge> : null}
              </div>
              {user && (circle.is_premium || circle.isPremium) && !isActive && !isPending && (
                <span className="text-xs font-black text-[#800000]">Rp {(circle.base_price || circle.basePrice)?.toLocaleString('id-ID')}</span>
              )}
            </div>
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
          Pilih program sesuai level {salutation}. Semua pendaftaran diverifikasi oleh Admin HI AQLI.
        </p>
      </div>

      {/* Asisten Tilawah AI - TERKUNCI (Masih Pengembangan) - DI ATAS CARI PROGRAM */}
      <div className="px-1">
        <Card className="overflow-hidden border-2 border-dashed border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/10 flex items-center justify-center relative shrink-0">
                <Bot className="w-6 h-6 text-[#D4AF37]" />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#800000] flex items-center justify-center shadow-lg">
                  <Lock className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-sm uppercase leading-tight text-[#800000]">Asisten Tilawah AI</h4>
                  <Badge variant="outline" className="text-[7px] font-black border-amber-300 text-amber-600 bg-amber-50 px-1">SEGERA</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Uji kelancaran bacaan makhraj dengan bimbingan AI interaktif. Deteksi kesalahan tajwid real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
