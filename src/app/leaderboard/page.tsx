
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, TrendingUp, ChevronRight, Crown } from "lucide-react";
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

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-24">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <Trophy className="w-5 h-5 fill-current" />
          <span className="text-xs font-bold uppercase tracking-widest">Papan Peringkat Sahabat</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Ksatria Al-Qur'an</h1>
        <p className="text-muted-foreground text-sm">
          Teruslah belajar dan raih posisi puncak bersama para pecinta Al-Qur'an lainnya.
        </p>
      </div>

      {/* Podium Section (Top 3) */}
      <div className="grid grid-cols-3 gap-2 items-end px-1 pt-8 pb-4">
        {/* Rank 2 */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar className="w-16 h-16 border-4 border-slate-300">
              <AvatarImage src={topUsers[1].avatar} />
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-slate-300 text-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">2</div>
          </div>
          <span className="text-[10px] font-bold text-center truncate w-full">{topUsers[1].name.split(' ')[0]}</span>
          <div className="bg-slate-300/20 w-full h-16 rounded-t-lg flex items-center justify-center">
             <Medal className="w-6 h-6 text-slate-400" />
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
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-[#D4AF37] text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">1</div>
          </div>
          <span className="text-xs font-bold text-center truncate w-full">{topUsers[0].name.split(' ')[0]}</span>
          <div className="bg-[#D4AF37]/20 w-full h-24 rounded-t-lg flex items-center justify-center">
             <Trophy className="w-8 h-8 text-[#B8860B]" />
          </div>
        </div>

        {/* Rank 3 */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar className="w-16 h-16 border-4 border-amber-600">
              <AvatarImage src={topUsers[2].avatar} />
              <AvatarFallback>Y</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white">3</div>
          </div>
          <span className="text-[10px] font-bold text-center truncate w-full">{topUsers[2].name.split(' ')[0]}</span>
          <div className="bg-amber-600/20 w-full h-12 rounded-t-lg flex items-center justify-center">
             <Medal className="w-6 h-6 text-amber-700" />
          </div>
        </div>
      </div>

      {/* Full List */}
      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-0">
          <div className="divide-y">
            {topUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 hover:bg-white/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground w-4">{user.rank}</span>
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{user.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[8px] h-4 font-bold uppercase tracking-tighter px-1.5 py-0">
                        {user.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">{user.points.toLocaleString()} Poin</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {user.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Rank Sticky Footer-like Card */}
      <Card className="border-2 border-[#800000]/10 bg-white shadow-lg sticky bottom-24 z-20 mx-1">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-sm">
              142
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Peringkat Anda</span>
              <span className="text-[10px] text-muted-foreground">Butuh 150 poin lagi untuk naik ke peringkat 141</span>
            </div>
          </div>
          <div className="text-right">
             <span className="text-sm font-bold block">1,250</span>
             <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Poin</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
