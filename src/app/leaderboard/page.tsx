
'use client';

import { useUser } from "@/supabase";
import { getCallSign } from "@/lib/utils";
import { useCollection, useDoc } from "@/supabase/db";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Medal,
  ChevronRight,
  Crown,
  Gift,
  Award,
  Clock,
  Sparkles,
  Zap,
  Loader2,
  TrendingUp,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import Link from "next/link";

const activeChallenges = [
  {
    id: 1,
    title: "Tantangan Khatam Ramadhan",
    description: "Selesaikan 100% kuis hafalan Juz 30.",
    prize: "Mushaf Al-Azhar Terjemah",
    progress: 65,
    icon: Gift,
    deadline: "15 Hari Lagi",
    color: "from-[#800000] via-[#b30000] to-[#800000]"
  },
  {
    id: 2,
    title: "Pejuang Itqan Mingguan",
    description: "Posisi 10 besar selama 7 hari berturut-turut.",
    prize: "E-Sertifikat & Voucher",
    progress: 40,
    icon: Award,
    deadline: "3 Hari Lagi",
    color: "from-[#800000] via-[#4d0000] to-[#800000]"
  }
];

export default function LeaderboardPage() {
  const { user } = useUser();

  const leaderboardOptions = useMemo(() => ({
    orderBy: { column: 'points', ascending: false },
    limit: 50
  }), []);

  const { data: allUsers, isLoading } = useCollection("users", leaderboardOptions);
  
  const users = useMemo(() => {
    return allUsers?.filter(u => (u.points || 0) > 0 || u.id === user?.id) || [];
  }, [allUsers, user?.id]);

  const userInTop50 = useMemo(() => allUsers?.find(u => u.id === user?.id), [allUsers, user?.id]);
  const { data: backupUserDoc } = useDoc(user && !userInTop50 ? "users" : null, user?.id);
  
  const currentUserData = userInTop50 || backupUserDoc;
  const fullSalutation = currentUserData?.salutation || "Ukhti";
  const callSign = getCallSign(fullSalutation);

  const currentUserRank = useMemo(() => {
    if (userInTop50) return allUsers.findIndex(u => u.id === user?.id) + 1;
    return 0; // Will be handled by the count-based rank if we want to be 100% precise, but for the sticky footer, 0/None is fine for now or we can use the Profile logic.
  }, [allUsers, user?.id, userInTop50]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="animate-spin text-[#800000] h-10 w-10" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memuat Papan Juara...</p>
      </div>
    );
  }

  const topThree = users?.slice(0, 3) || [];
  const restUsers = users?.slice(3) || [];

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-32">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <Trophy className="w-5 h-5 fill-current text-[#D4AF37]" />
          <span className="text-xs font-bold uppercase tracking-widest">Pusat Juara Sahabat</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-[#800000]">Ksatria Al-Qur'an</h1>
        <p className="text-muted-foreground text-sm">
          Berlomba-lomba dalam kebaikan, raih poin melalui kuis, dan menangkan hadiah menarik.
        </p>
      </div>

      {/* Podium Section */}
      <div className="space-y-4 px-1 mt-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-[#800000]">
          <Crown className="w-5 h-5 text-[#D4AF37] fill-current" /> Papan Peringkat Utama
        </h2>

        {topThree.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 items-end pt-8 pb-4">
            {/* Rank 2 */}
            <div className="flex flex-col items-center gap-2">
              {topThree[1] && (
                <>
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-4 border-[#800000]">
                      <AvatarImage src={topThree[1].photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(topThree[1].username || topThree[1].email || 'U')}&background=800000&color=fff`} />
                      <AvatarFallback className="bg-[#800000] text-white font-bold">{topThree[1].username?.[0] || topThree[1].email?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-[#800000] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white">2</div>
                  </div>
                  <span className="text-[10px] font-black text-center truncate w-full uppercase text-black">{topThree[1].username || 'Ukhti'}</span>
                  <div className="bg-[#800000]/5 w-full h-16 rounded-t-lg flex flex-col items-center justify-center">
                    <Medal className="w-6 h-6 text-[#800000]/20" />
                    <span className="text-[10px] font-black text-[#800000]">{topThree[1].points || 0}</span>
                  </div>
                </>
              )}
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Crown className="w-8 h-8 text-[#D4AF37] fill-current animate-bounce" />
                </div>
                <Avatar className="w-20 h-20 border-4 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20">
                  <AvatarImage src={topThree[0].photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(topThree[0].username || topThree[0].email || 'U')}&background=D4AF37&color=000`} />
                  <AvatarFallback className="bg-[#800000] text-white font-bold">{topThree[0].username?.[0] || topThree[0].email?.[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-[#D4AF37] text-black w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white">1</div>
              </div>
              <span className="text-xs font-black text-center truncate w-full uppercase text-[#800000]">{topThree[0].username || 'Ukhti'}</span>
              <div className="bg-[#D4AF37]/20 w-full h-24 rounded-t-lg flex flex-col items-center justify-center text-black">
                <Trophy className="w-8 h-8 text-[#800000] mb-1" />
                <span className="text-sm font-black">{topThree[0].points || 0}</span>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center gap-2">
              {topThree[2] && (
                <>
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-4 border-[#800000]/60">
                      <AvatarImage src={topThree[2].photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(topThree[2].username || topThree[2].email || 'U')}&background=800000&color=fff`} />
                      <AvatarFallback className="bg-[#800000]/60 text-white font-bold">{topThree[2].username?.[0] || topThree[2].email?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-[#800000]/60 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white">3</div>
                  </div>
                  <span className="text-[10px] font-black text-center truncate w-full uppercase text-black">{topThree[2].username || 'Ukhti'}</span>
                  <div className="bg-[#800000]/5 w-full h-12 rounded-t-lg flex flex-col items-center justify-center">
                    <Medal className="w-6 h-6 text-[#800000]/20" />
                    <span className="text-[10px] font-black text-[#800000]">{topThree[2].points || 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground italic text-sm">Belum ada thalibah terdaftar.</div>
        )}
      </div>

      {/* Full List */}
      <Card className="border-none shadow-sm bg-muted overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-[#800000]/5">
            {restUsers.length > 0 ? restUsers.map((u, idx) => (
              <div key={u.id} className="flex items-center justify-between p-4 hover:bg-white transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-muted-foreground w-4">{idx + 4}</span>
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username || u.email || 'H')}&background=800000&color=fff`} />
                    <AvatarFallback className="bg-[#800000] text-white font-bold">{u.username?.[0] || u.email?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-black uppercase">{u.username || 'Hamba Allah'}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-[#800000] text-white text-[8px] font-black uppercase px-1.5 py-0">
                        {u.role_id === 'learner' ? 'THALIBAH' : u.role_id?.toUpperCase() || 'SANTRI'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">{(u.points || 0).toLocaleString()} Poin</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
              </div>
            )) : restUsers.length === 0 && topThree.length > 3 && (
              <div className="p-10 text-center text-muted-foreground italic text-xs">Semua peserta tampil di podium.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Challenges Section */}
      <div className="space-y-4 px-1 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-[#800000]">
            <Zap className="w-5 h-5 text-[#D4AF37] fill-current" /> Tantangan Berhadiah
          </h2>
          <Badge variant="outline" className="text-[10px] font-bold text-[#D4AF37] border-[#D4AF37]">AKTIF</Badge>
        </div>

        <div className="grid gap-4">
          {activeChallenges.map((challenge) => (
            <Card key={challenge.id} className="overflow-hidden border-none shadow-md bg-white border-b-4 border-[#D4AF37]">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className={cn("sm:w-32 flex flex-col items-center justify-center p-6 text-white bg-[#800000]")}>
                    <challenge.icon className="w-10 h-10 mb-2 drop-shadow-md text-[#D4AF37]" />
                    <span className="text-[9px] font-black uppercase text-center leading-tight">Reward</span>
                  </div>
                  <div className="flex-1 p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm leading-tight text-[#800000]">{challenge.title}</h3>
                        <p className="text-[10px] text-muted-foreground">{challenge.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-black text-white uppercase bg-[#800000] px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 text-[#D4AF37]" /> {challenge.deadline}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-[#800000]">Progres</span>
                        <span className="text-black">{challenge.progress}%</span>
                      </div>
                      <Progress value={challenge.progress} className="h-1.5 bg-muted [&>div]:bg-[#D4AF37]" />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span className="text-[10px] font-bold text-[#800000] uppercase">{challenge.prize}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold text-[#800000] uppercase gap-1">
                        Detail <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Your Rank Sticky Footer */}
      {user && (
        <Card className="border-2 border-[#D4AF37] bg-[#800000] text-white shadow-lg sticky bottom-24 z-20 mx-1 border-b-4 rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-black text-sm">
                {currentUserRank || '-'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase text-[#D4AF37]">Peringkat {fullSalutation}</span>
                <span className="text-[9px] text-white/60 font-bold uppercase">
                  {currentUserRank === 1 ? `Pertahankan tahta ${fullSalutation}!` : 'Teruslah ber-Itqan!'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-black block text-white">{currentUserData?.points || 0}</span>
              <span className="text-[10px] text-[#D4AF37] uppercase font-black tracking-widest">Poin</span>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Guest Nudge Footer */}
      {!user && (
        <Card className="border-2 border-emerald-400 bg-emerald-600 text-white shadow-lg sticky bottom-24 z-20 mx-1 border-b-4 rounded-2xl animate-in slide-in-from-bottom-10 duration-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center">
                <Trophy className="w-6 h-6 fill-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase text-white tracking-tight">Ingin Ada di Sini?</span>
                <span className="text-[9px] text-emerald-100 font-bold uppercase">
                  Daftar sekarang & mulai kumpulkan poin Itqan!
                </span>
              </div>
            </div>
            <Button asChild size="sm" className="bg-white text-emerald-600 hover:bg-emerald-50 font-black rounded-xl px-6 uppercase text-[10px] tracking-widest shadow-lg">
              <Link href="/register">IKUT LOMBA</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
