'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  ChevronRight, 
  Crown, 
  Gift, 
  Award, 
  Clock,
  Sparkles,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const topUsers = [
  { id: 1, name: "Abdullah Mansur", points: 12450, rank: 1, avatar: "https://picsum.photos/seed/user1/100/100", trend: "up", level: "Hafiz" },
  { id: 2, name: "Siti Aminah", points: 11200, rank: 2, avatar: "https://picsum.photos/seed/user2/100/100", trend: "up", level: "Alim" },
  { id: 3, name: "Yusuf Ibrahim", points: 10850, rank: 3, avatar: "https://picsum.photos/seed/user3/100/100", trend: "down", level: "Alim" },
  { id: 4, name: "Fatimah Az-Zahra", points: 9500, rank: 4, avatar: "https://picsum.photos/seed/user4/100/100", trend: "stable", level: "Murid" },
  { id: 5, name: "Ahmad Fauzi", points: 8900, rank: 5, avatar: "https://picsum.photos/seed/user5/100/100", trend: "up", level: "Murid" },
  { id: 6, name: "Zainab", points: 8200, rank: 6, avatar: "https://picsum.photos/seed/user6/100/100", trend: "down", level: "Murid" },
];

const activeChallenges = [
  {
    id: 1,
    title: "Tantangan Khatam Ramadhan",
    description: "Selesaikan 100% kuis hafalan Juz 30.",
    prize: "Mushaf Al-Azhar Terjemah",
    progress: 65,
    icon: Gift,
    deadline: "15 Hari Lagi",
    color: "from-black via-[#800000] to-black"
  },
  {
    id: 2,
    title: "Pejuang Itqan Mingguan",
    description: "Posisi 10 besar selama 7 hari berturut-turut.",
    prize: "E-Sertifikat & Voucher",
    progress: 40,
    icon: Award,
    deadline: "3 Hari Lagi",
    color: "from-[#800000] via-black to-[#800000]"
  }
];

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-32">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <Trophy className="w-5 h-5 fill-current text-[#D4AF37]" />
          <span className="text-xs font-bold uppercase tracking-widest">Pusat Juara Sahabat</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Ksatria Al-Qur'an</h1>
        <p className="text-muted-foreground text-sm">
          Berlomba-lomba dalam kebaikan, raih poin, dan menangkan hadiah menarik.
        </p>
      </div>

      {/* Challenges Section */}
      <div className="space-y-4 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-black">
            <Zap className="w-5 h-5 text-[#D4AF37] fill-current" /> Tantangan Berhadiah
          </h2>
          <Badge variant="outline" className="text-[10px] font-bold text-[#D4AF37] border-[#D4AF37]">AKTIF</Badge>
        </div>
        
        <div className="grid gap-4">
          {activeChallenges.map((challenge) => (
            <Card key={challenge.id} className="overflow-hidden border-none shadow-md bg-white border-b-4 border-[#D4AF37]">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className={cn("sm:w-32 flex flex-col items-center justify-center p-6 text-[#D4AF37] bg-black")}>
                    <challenge.icon className="w-10 h-10 mb-2 drop-shadow-md" />
                    <span className="text-[9px] font-black uppercase text-center leading-tight">Reward</span>
                  </div>
                  <div className="flex-1 p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm leading-tight text-black">{challenge.title}</h3>
                        <p className="text-[10px] text-muted-foreground">{challenge.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-black text-[#800000] uppercase bg-[#800000]/5 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> {challenge.deadline}
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
                        <span className="text-[10px] font-bold text-black uppercase">{challenge.prize}</span>
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

      {/* Podium Section */}
      <div className="space-y-4 px-1 mt-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-black">
          <Crown className="w-5 h-5 text-[#D4AF37] fill-current" /> Papan Peringkat Global
        </h2>
        <div className="grid grid-cols-3 gap-2 items-end pt-8 pb-4">
          {/* Rank 2 */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-16 h-16 border-4 border-black">
                <AvatarImage src={topUsers[1].avatar} />
                <AvatarFallback className="bg-[#800000] text-white">S</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white">2</div>
            </div>
            <span className="text-[10px] font-black text-center truncate w-full uppercase">{topUsers[1].name.split(' ')[0]}</span>
            <div className="bg-black/5 w-full h-16 rounded-t-lg flex items-center justify-center">
               <Medal className="w-6 h-6 text-black/20" />
            </div>
          </div>

          {/* Rank 1 */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <Crown className="w-8 h-8 text-[#D4AF37] fill-current animate-bounce" />
              </div>
              <Avatar className="w-20 h-20 border-4 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20">
                <AvatarImage src={topUsers[0].avatar} />
                <AvatarFallback className="bg-black text-[#D4AF37]">A</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-[#D4AF37] text-black w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white">1</div>
            </div>
            <span className="text-xs font-black text-center truncate w-full uppercase text-[#800000]">{topUsers[0].name.split(' ')[0]}</span>
            <div className="bg-[#D4AF37]/20 w-full h-24 rounded-t-lg flex items-center justify-center">
               <Trophy className="w-8 h-8 text-[#800000]" />
            </div>
          </div>

          {/* Rank 3 */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-16 h-16 border-4 border-[#800000]">
                <AvatarImage src={topUsers[2].avatar} />
                <AvatarFallback className="bg-black text-white">Y</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-[#800000] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 border-white">3</div>
            </div>
            <span className="text-[10px] font-black text-center truncate w-full uppercase">{topUsers[2].name.split(' ')[0]}</span>
            <div className="bg-[#800000]/5 w-full h-12 rounded-t-lg flex items-center justify-center">
               <Medal className="w-6 h-6 text-[#800000]/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Full List */}
      <Card className="border-none shadow-sm bg-muted overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-black/5">
            {topUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 hover:bg-white transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-muted-foreground w-4">{user.rank}</span>
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-black text-[#D4AF37]">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-black uppercase">{user.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-[#800000] text-white text-[8px] font-black uppercase px-1.5 py-0">
                        {user.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">{user.points.toLocaleString()} Poin</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {user.trend === "up" && <TrendingUp className="w-3 h-3 text-[#D4AF37]" />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Rank Sticky Footer */}
      <Card className="border-2 border-black bg-black text-white shadow-lg sticky bottom-24 z-20 mx-1 border-b-4 border-[#D4AF37] rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-black text-sm">
              142
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase text-[#D4AF37]">Peringkat Anda</span>
              <span className="text-[9px] text-white/60 font-bold uppercase">Butuh 150 poin lagi</span>
            </div>
          </div>
          <div className="text-right">
             <span className="text-sm font-black block">1,250</span>
             <span className="text-[10px] text-[#D4AF37] uppercase font-black tracking-widest">Poin</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}