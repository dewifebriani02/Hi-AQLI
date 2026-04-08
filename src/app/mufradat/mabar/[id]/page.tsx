'use client';

import { useParams, useRouter } from "next/navigation";
import { useDoc, useCollection } from "@/supabase/db";
import { useUser, supabase } from "@/supabase";
import { useState, useEffect, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Users, 
  Clock, 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Flame,
  Award,
  BookOpen,
  Play
} from "lucide-react";
import Link from "next/link";
import { format, differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MufradatMabarRoomPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // 1. Fetch Session Data
  const { data: session, isLoading: isSessionLoading } = useDoc("mufradat_mabar_sessions", id as string);
  
  // 2. Fetch Participants (Realtime enabled via useCollection if configured)
  const participantOptions = useMemo(() => ({
    filters: [{ column: 'session_id', operator: '==', value: id }],
    orderBy: { column: 'points_earned', ascending: false },
    limit: 50
  }), [id]);

  const { data: participants, refresh: refreshParticipants } = useCollection(
    "mufradat_mabar_participants", 
    participantOptions
  );

  const currentUserParticipant = participants?.find(p => p.user_id === user?.id);
  const isJoined = !!currentUserParticipant;

  // 3. Realtime is already handled by useCollection hook in @/supabase/db

  // 4. Timer Logic
  useEffect(() => {
    if (!session || session.status === 'finished') return;

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(session.scheduled_at);
      
      if (session.status === 'pending') {
        const diff = differenceInSeconds(target, now);
        setTimeLeft(diff > 0 ? diff : 0);
      } else if (session.status === 'active') {
        const endTime = new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60000);
        const diff = differenceInSeconds(endTime, now);
        setTimeLeft(diff > 0 ? diff : 0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleJoin = async () => {
    if (isJoined || isJoining || !user) return;
    
    setIsJoining(true);
    try {
      const { error } = await supabase
        .from('mufradat_mabar_participants')
        .insert({
          session_id: id,
          user_id: user.id,
          points_earned: 0
        });

      if (error) throw error;
      refreshParticipants();
    } catch (e) {
      console.error(e);
    } finally {
      setIsJoining(false);
    }
  };

  if (isSessionLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <Loader2 className="animate-spin w-10 h-10 text-[#800000]" />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menghubungkan ke Server...</p>
    </div>
  );

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-8">
       <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-2">
          <Zap className="w-10 h-10" />
       </div>
       <h1 className="text-2xl font-black uppercase">Ruangan Tidak Ditemukan</h1>
       <p className="text-sm text-muted-foreground max-w-xs font-medium">Maaf, sesi mabar ini mungkin telah dibatalkan atau berakhir.</p>
       <Button asChild className="bg-[#800000] rounded-xl h-12 px-8 mt-4"><Link href="/mufradat/mabar">KEMBALI KE JADWAL</Link></Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 p-2 sm:p-0">
      {/* ROOM HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
         <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm border">
               <Link href="/mufradat/mabar"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="space-y-1">
               <h1 className="text-2xl font-black uppercase tracking-tight font-headline">{session.title}</h1>
               <div className="flex items-center gap-2">
                  <Badge className="bg-[#800000] text-white border-none text-[8px] font-black tracking-widest px-2 group-hover:scale-110 transition-transform">JUZ {session.juz_id}</Badge>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                     {session.status === 'pending' ? 'Bismillah, Persiapan!' : session.status === 'active' ? 'SEDANG BERLANGSUNG' : 'SELESAI'}
                  </span>
               </div>
            </div>
         </div>
         {session.status === 'active' && (
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border-2 border-emerald-100 flex items-center gap-3 shadow-lg animate-pulse">
               <Clock className="w-6 h-6 text-emerald-600" />
               <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase text-emerald-800 tracking-widest leading-none">Sisa Waktu</span>
                  <span className="text-xl font-black text-emerald-900 leading-none tabular-nums">
                     {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                  </span>
               </div>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4">
         {/* LEFT CONTENT: Lobby or Summary */}
         <div className="lg:col-span-8 space-y-6">
            {session.status === 'pending' ? (
               <div className="relative overflow-hidden rounded-[2.5rem] bg-white border shadow-xl p-8 sm:p-12 text-center space-y-8">
                  <div className="relative z-10 space-y-4">
                     <div className="w-24 h-24 bg-[#800000]/10 text-[#800000] rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Clock className="w-12 h-12 animate-spin-slow" />
                     </div>
                     <div className="space-y-2">
                        <h2 className="text-3xl font-black uppercase tracking-tight">Kuis Dimulai Dalam</h2>
                        <p className="text-3xl font-black text-[#800000] font-mono tabular-nums leading-none">
                           {timeLeft !== null ? `${Math.floor(timeLeft / 3600).toString().padStart(2, '0')}:${Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                        </p>
                     </div>
                  </div>
                  
                  {!isJoined ? (
                     <Button 
                       onClick={handleJoin} 
                       disabled={isJoining}
                       className="h-16 px-12 bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-xl rounded-2xl shadow-xl w-full sm:w-auto active:scale-95 transition-all"
                     >
                        {isJoining ? <Loader2 className="animate-spin w-6 h-6" /> : "GABUNG MABAR SEKARANG"}
                     </Button>
                  ) : (
                     <div className="flex flex-col items-center gap-4">
                        <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border-2 border-emerald-200 flex items-center gap-3 font-black uppercase text-sm tracking-tight">
                           <CheckCircle2 className="w-6 h-6" /> Kamu Sudah Terdaftar!
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Persiapkan Al-Qur'an dan Hafalanmu. <br/>Kuis otomatis terbuka saat waktu tiba.</p>
                     </div>
                  )}

                  {/* INFO CARDS */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-dashed text-left">
                        <Zap className="w-5 h-5 text-amber-500 mb-2" />
                        <h4 className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Total Peserta</h4>
                        <p className="text-xl font-black text-slate-800">{participants?.length || 0}</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-dashed text-left">
                        <Award className="w-5 h-5 text-emerald-500 mb-2" />
                        <h4 className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Poin Dasar</h4>
                        <p className="text-xl font-black text-slate-800">10 Poin / Hal</p>
                     </div>
                  </div>
               </div>
            ) : session.status === 'active' ? (
               <div className="space-y-6">
                  <div className="rounded-[2.5rem] bg-[#800000] text-white p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden group">
                     {/* Background trophy */}
                     <Trophy className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                     
                     <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl">
                              <Play className="w-8 h-8 animate-pulse" />
                           </div>
                           <div className="space-y-1">
                              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Aksi Sedang Berlangsung!</h2>
                              <p className="text-white/60 text-xs font-black uppercase tracking-widest leading-relaxed">Kejar hafalanmu di Juz {session.juz_id} sekarang.</p>
                           </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                           <Button asChild size="lg" className="bg-white text-[#800000] hover:bg-[#D4AF37] hover:text-white font-black text-[12px] sm:text-lg h-16 px-6 sm:px-10 rounded-2xl shadow-xl transition-all active:scale-95 flex-1">
                              <Link href={`/mufradat?tab=juz&target_juz=${session.juz_id}`}>
                                 <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" /> MULAI HAFALAN JUZ {session.juz_id}
                              </Link>
                           </Button>
                           <div className="flex flex-col justify-center sm:w-48 bg-black/10 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                              <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Skor Kamu</span>
                              <div className="flex items-center justify-between">
                                 <span className="text-2xl font-black tracking-tight">{currentUserParticipant?.points_earned || 0}</span>
                                 <Zap className="w-5 h-5 text-amber-500" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-amber-50 p-6 rounded-3xl border-2 border-dashed border-amber-200">
                     <h3 className="flex items-center gap-2 font-black text-amber-800 uppercase tracking-tight mb-2">
                        <Flame className="w-5 h-5 text-amber-600" /> PETUNJUK MABAR:
                     </h3>
                     <p className="text-xs text-amber-900/70 leading-relaxed font-bold">
                        Buka Tab **Juz** atau **Halaman** dan pilih **Juz {session.juz_id}**. Setiap kali kamu menyelesaikan kuis dengan nilai 100 di Juz ini selama sesi aktif, poinmu akan otomatis bertambah di Leaderboard Mabar!
                     </p>
                  </div>
               </div>
            ) : (
               <div className="bg-white border rounded-[2.5rem] shadow-xl p-8 sm:p-12 text-center space-y-8">
                  <div className="space-y-4">
                     <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <Award className="w-12 h-12" />
                     </div>
                     <h2 className="text-3xl font-black uppercase tracking-tight">Sesi Telah Berakhir</h2>
                     <p className="text-muted-foreground font-medium max-w-sm mx-auto">Masyallah, Barakallahu fiikum thalibah yang telah berpartisipasi!</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                     {participants?.slice(0, 3).map((p, idx) => (
                        <div key={p.user_id} className={cn(
                           "p-6 rounded-3xl border-2 space-y-4 shadow-lg",
                           idx === 0 ? "bg-amber-50 border-amber-300 scale-110 relative z-10" : "bg-slate-50 border-slate-200"
                        )}>
                           <div className="relative mx-auto w-20 h-20">
                              <Avatar className="w-full h-full border-4 border-white shadow-md">
                                 <AvatarImage src={p.users?.avatar_url} />
                                 <AvatarFallback className="bg-slate-200 text-[#800000] font-black">{p.users?.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                 "absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white font-black",
                                 idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : "bg-orange-600"
                              )}>
                                 {idx + 1}
                              </div>
                           </div>
                           <div className="space-y-1">
                              <h4 className="text-sm font-black truncate">{p.users?.full_name || 'Hamba Allah'}</h4>
                              <p className="text-lg font-black text-[#800000]">{p.points_earned} Poin</p>
                           </div>
                        </div>
                     ))}
                  </div>

                  <Button asChild className="h-14 px-12 bg-slate-900 rounded-2xl font-black uppercase text-sm mt-8">
                     <Link href="/mufradat/mabar">KEMBALI KE JADWAL</Link>
                  </Button>
               </div>
            )}
         </div>

         {/* RIGHT CONTENT: Live Leaderboard */}
         <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#800000]">Live Standings</h3>
               <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Live Updates</span>
               </div>
            </div>
            
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
               <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto">
                     {participants?.length ? participants.map((p, idx) => (
                        <div 
                           key={p.user_id} 
                           className={cn(
                              "flex items-center gap-4 p-5 border-b border-slate-50 last:border-none transition-all group",
                              user?.id === p.user_id ? "bg-amber-50/50" : "hover:bg-slate-50"
                           )}
                        >
                           <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0",
                              idx === 0 ? "bg-amber-500 text-white" : 
                              idx === 1 ? "bg-slate-300 text-slate-700" :
                              idx === 2 ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"
                           )}>
                              {idx + 1}
                           </div>
                           <Avatar className="w-10 h-10 border-2 border-white shadow-sm shrink-0">
                              <AvatarImage src={p.users?.avatar_url} />
                              <AvatarFallback className="bg-slate-100 text-[#800000] font-black uppercase text-[10px]">{p.users?.full_name?.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate group-hover:text-[#800000] transition-colors">{p.users?.full_name || 'Hamba Allah'}</p>
                              <div className="flex items-center gap-2">
                                 <Badge variant="ghost" className="p-0 text-[8px] font-black uppercase tracking-widest text-[#800000]/50">{p.mufradat_groups?.name || 'UMUM'}</Badge>
                              </div>
                           </div>
                           <div className="text-right shrink-0">
                              <p className="text-sm font-black text-slate-800 tabular-nums">{p.points_earned}</p>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pts</p>
                           </div>
                        </div>
                     )) : (
                        <div className="py-20 text-center flex flex-col items-center gap-4 px-6">
                           <Users className="w-10 h-10 text-slate-200" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Belum Ada Peserta</p>
                        </div>
                     )}
                  </div>
               </CardContent>
            </Card>

            {/* TIPS CARD */}
            <div className="hidden lg:block bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
               <Zap className="absolute -top-4 -right-4 w-20 h-20 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Tips Menang</h4>
                  <p className="text-[10px] font-bold text-white/70 leading-relaxed uppercase tracking-tight">Selesaikan kuis tanpa salah satu harakat pun untuk mendapatkan skor maksimal!</p>
               </div>
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
