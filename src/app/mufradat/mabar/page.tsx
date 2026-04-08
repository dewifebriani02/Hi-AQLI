'use client';

import { useMemo, useState, useEffect } from "react";
import { useCollection } from "@/supabase/db";
import { useUser, supabase } from "@/supabase";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Clock, 
  Calendar, 
  Users, 
  ArrowRight, 
  Play, 
  Award,
  Zap,
  Globe,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { format, isAfter, isBefore, addMinutes } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { checkIsStudent } from "@/lib/access-control";

export default function MufradatMabarOverviewPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const registrationsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  }), [user?.id]);

  const { data: registrations, isLoading: isRegLoading } = useCollection(
    user ? "halaqah_registrations" : null, 
    registrationsOptions
  );

  const isStudent = useMemo(() => checkIsStudent(registrations || []), [registrations]);

  useEffect(() => {
    if (!isUserLoading && !isRegLoading && user && !isStudent) {
      // Redirect or show message? User requested content gating, Mabar is a premium feature.
    }
  }, [user, isStudent, isUserLoading, isRegLoading]);

  const sessionOptions = useMemo(() => ({
    orderBy: { column: 'scheduled_at', ascending: true },
    filters: [{ column: 'status', operator: '!=', value: 'finished' }]
  }), []);

  const { data: sessions, isLoading: isSessionsLoading } = useCollection("mufradat_mabar_sessions", sessionOptions);

  if (isSessionsLoading || isUserLoading || isRegLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin w-10 h-10 text-[#800000]" />
      <p className="text-sm font-bold uppercase tracking-widest text-[#800000]">Mencari Kompetisi...</p>
    </div>
  );

  if (user && !isStudent) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
          <Lock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black font-headline uppercase">Fitur Khusus Thalibah</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Mabar Al-Qur'an adalah fitur eksklusif untuk thalibah yang terdaftar dalam program Hi AQLI. Mari bergabung sekarang!</p>
        </div>
        <Button asChild className="bg-[#800000] hover:bg-[#800000]/90 h-14 px-10 rounded-2xl font-black uppercase shadow-xl">
          <Link href="/study-circles/registration">DAFTAR PROGRAM SEKARANG</Link>
        </Button>
      </div>
    );
  }

  const activeSessions = sessions?.filter(s => s.status === 'active') || [];
  const pendingSessions = sessions?.filter(s => s.status === 'pending') || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 sm:p-0">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#800000] via-[#A52A2A] to-[#8B4513] p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-6">
          <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest">
            Fitur Baru • Kompetisi Global
          </Badge>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black font-headline tracking-tighter uppercase leading-none">
              Mabar <span className="text-[#D4AF37]">Al-Qur'an</span>
            </h1>
            <p className="text-white/80 text-sm sm:text-lg max-w-lg font-medium leading-relaxed">
              Bismillah, kumpulkan setinggi-tingginya poin hafalan bersama thalibah lain di sesi hafalan serentak per Juz!
            </p>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
             <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-tight">Live Leaderboard</span>
             </div>
             <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
                <Zap className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-tight">Double Points*</span>
             </div>
          </div>
        </div>
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        <Trophy className="absolute -bottom-4 -right-4 w-48 h-48 text-white/5 rotate-12" />
      </div>

      {/* ACTIVE SESSIONS */}
      {activeSessions.length > 0 && (
         <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
               <h2 className="text-sm font-black uppercase tracking-widest text-emerald-600">Sesi Berlangsung</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
               {activeSessions.map(session => (
                 <Link key={session.id} href={`/mufradat/mabar/${session.id}`}>
                    <Card className="border-2 border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition-all cursor-pointer overflow-hidden group shadow-lg">
                       <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                             <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Trophy className="w-8 h-8" />
                             </div>
                             <div className="space-y-1">
                                <h3 className="text-xl font-black text-emerald-900 group-hover:text-emerald-700 transition-colors uppercase leading-tight">{session.title}</h3>
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] font-black uppercase tracking-tight bg-emerald-500 text-white px-2 py-0.5 rounded-full">JUZ {session.juz_id}</span>
                                   <span className="flex items-center gap-1.5 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                                      <Clock className="w-3.5 h-3.5" /> Sedang Berlangsung...
                                   </span>
                                </div>
                             </div>
                          </div>
                          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black h-12 px-8 rounded-xl shadow-md gap-2 active:scale-95 transition-all">
                             MASUK SEKARANG <ArrowRight className="w-5 h-5" />
                          </Button>
                       </CardContent>
                    </Card>
                 </Link>
               ))}
            </div>
         </div>
      )}

      {/* UPCOMING SESSIONS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
           <Calendar className="w-4 h-4 text-slate-500" />
           <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Jadwal Mendatang</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pendingSessions.length > 0 ? pendingSessions.map(session => {
            const startDate = new Date(session.scheduled_at);
            const isSoon = isBefore(startDate, addMinutes(new Date(), 30)); // Starts in < 30 mins

            return (
              <Card key={session.id} className="border-2 border-slate-100 hover:border-[#800000]/30 transition-all rounded-3xl overflow-hidden group">
                <CardHeader className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                  <div className="w-10 h-10 rounded-xl bg-[#800000]/10 flex items-center justify-center text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-all">
                    <Hash className="w-5 h-5 font-black text-xs" />
                  </div>
                  {isSoon ? (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse uppercase text-[8px] font-black tracking-widest">Dimulai Segera</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 uppercase text-[8px] font-black tracking-widest">Segera Datang</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-800 uppercase leading-tight group-hover:text-[#800000] transition-colors">{session.title}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TARGET: JUZ {session.juz_id}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(startDate, "d MMM", { locale: idLocale })}</div>
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(startDate, "HH:mm")}</div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                   <Button asChild variant="outline" className="w-full h-11 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest shadow-sm group-hover:bg-[#800000] group-hover:text-white group-hover:border-[#800000] transition-all">
                      <Link href={`/mufradat/mabar/${session.id}`}>LIHAT LOBBY</Link>
                   </Button>
                </CardFooter>
              </Card>
            );
          }) : (
            <div className="col-span-full py-20 bg-slate-50/50 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center text-center px-8">
               <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <Clock className="w-8 h-8" />
               </div>
               <h4 className="text-lg font-bold text-slate-800">Belum Ada Jadwal Mabar</h4>
               <p className="text-sm text-slate-500 max-w-xs mt-2 font-medium">Nantikan kompetisi berikutnya! Pantau terus pengumuman Musyrifah di grup WhatsApp.</p>
            </div>
          )}
        </div>
      </div>

      {/* MABAR RULES SECTION */}
      <div className="bg-[#800000]/5 p-8 rounded-[2.5rem] border-2 border-dashed border-[#800000]/20 space-y-6">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#800000] text-white flex items-center justify-center shadow-lg">
               <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[#800000]">Aturan Mabar Hi Mufradat</h3>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
               <div className="w-8 h-8 rounded-lg bg-[#800000]/10 flex items-center justify-center text-[#800000] font-black text-xs shadow-sm">1</div>
               <p className="text-[11px] font-bold text-slate-800 leading-relaxed uppercase tracking-tight">Kumpulkan poin sebanyak-banyaknya di Juz yang ditentukan.</p>
            </div>
            <div className="space-y-2">
               <div className="w-8 h-8 rounded-lg bg-[#800000]/10 flex items-center justify-center text-[#800000] font-black text-xs shadow-sm">2</div>
               <p className="text-[11px] font-bold text-slate-800 leading-relaxed uppercase tracking-tight">Gunakan mode Sprint untuk poin tambahan karena kecepatan dihitung.</p>
            </div>
            <div className="space-y-2">
               <div className="w-8 h-8 rounded-lg bg-[#800000]/10 flex items-center justify-center text-[#800000] font-black text-xs shadow-sm">3</div>
               <p className="text-[11px] font-bold text-slate-800 leading-relaxed uppercase tracking-tight">Top 3 di Leaderboard Live mendapatkan Lencana "Mabar Champ".</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function Hash({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="4" y1="9" x2="20" y2="9"></line>
      <line x1="4" y1="15" x2="20" y2="15"></line>
      <line x1="10" y1="3" x2="8" y2="21"></line>
      <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
  );
}
