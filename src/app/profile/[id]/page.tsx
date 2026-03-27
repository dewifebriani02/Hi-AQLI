"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Loader2,
  Trophy,
  Zap,
  CalendarDays,
  BookOpen,
  MessageSquare,
  Share2,
  Medal,
  Target,
  ShieldCheck,
  Crown
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDoc, useCollection } from "@/supabase/db";
import { cn } from "@/lib/utils";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data: profile, isLoading: isProfileLoading } = useDoc("users", userId);

  // Check roles for this user
  const { data: isAdmin } = useDoc("roles_admin", userId);
  const { data: isSuperAdmin } = useDoc("roles_superadmin", userId);
  
  const quizOptions = {
    filters: [{ column: 'user_id', operator: '==', value: userId }],
    orderBy: { column: 'created_at', ascending: false },
    limit: 10
  };
  const { data: recentQuizzes, isLoading: isQuizzesLoading } = useCollection("quiz_attempts", quizOptions);

  const allUsersOptions = { orderBy: { column: 'points', ascending: false } };
  const { data: allUsers } = useCollection("users", allUsersOptions);
  
  const rank = allUsers?.findIndex(u => u.id === userId) + 1 || '-';

  if (isProfileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-medium text-muted-foreground">Memuat Profil Sahabat...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold">Profil Tidak Ditemukan</h2>
        <Button asChild variant="outline"><Link href="/">Kembali ke Beranda</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-32 px-4 sm:px-0">
      <div className="flex items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-30 py-4 border-b">
        <Button onClick={() => router.back()} variant="ghost" size="icon">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-headline">Profil Sahabat</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => {
          navigator.share({
            title: `Profil Hi AQLI ${profile.username}`,
            url: window.location.href
          }).catch(() => {});
        }}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 py-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-[#800000]/10 shadow-xl">
            <AvatarImage src={profile.photoURL} />
            <AvatarFallback className="bg-[#800000] text-white text-2xl font-bold">
              {profile.username?.[0] || profile.email?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 bg-[#D4AF37] text-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <Medal className="w-4 h-4" />
          </div>
        </div>
        
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold font-headline">{profile.username || 'Hamba Allah'}</h2>
            {isSuperAdmin && (
              <Badge className="bg-[#800000] text-white font-black text-[10px] gap-1">
                <Crown className="w-3 h-3 fill-current" /> SUPER ADMIN
              </Badge>
            )}
            {isAdmin && !isSuperAdmin && (
              <Badge className="bg-amber-500 text-white font-black text-[10px] gap-1">
                <ShieldCheck className="w-3 h-3" /> ADMIN
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Bergabung {new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full">
          <Card className="border-none bg-muted/30 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <span className="text-xl font-black text-[#800000]">{profile.points || 0}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Poin</span>
            </CardContent>
          </Card>
          <Card className="border-none bg-[#800000] text-white shadow-lg">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <span className="text-xl font-black">#{rank}</span>
              <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Peringkat</span>
            </CardContent>
          </Card>
          <Card className="border-none bg-muted/30 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <span className="text-xl font-black text-[#D4AF37]">{recentQuizzes?.filter(q => q.is_passed).length || 0}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Itqan</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold font-headline uppercase tracking-widest flex items-center gap-2">
            <Target className="w-4 h-4 text-[#800000]" /> Aktivitas Terakhir
          </h3>
          <Badge variant="outline" className="text-[10px] font-bold border-[#800000]/20 text-[#800000]">10 Terakhir</Badge>
        </div>

        {isQuizzesLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : recentQuizzes?.length > 0 ? (
          <div className="space-y-3">
            {recentQuizzes.map((quiz, idx) => (
              <Card key={idx} className="border-none shadow-sm bg-card hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      quiz.is_passed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {quiz.is_passed ? <Trophy className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Surah {quiz.surah_id} : Ayat {quiz.verse_id}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Skor {quiz.score}/{quiz.total_questions} • {new Date(quiz.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  {quiz.is_passed && <Badge className="bg-[#D4AF37] text-black text-[9px] font-bold">ITQAN</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground italic text-sm bg-muted/10 rounded-xl">
            Belum ada aktivitas kuis terdeteksi.
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-bold h-12 gap-2 shadow-lg">
          <MessageSquare className="w-4 h-4" /> HUBUNGI SAHABAT (SEGERA)
        </Button>
        <p className="text-[10px] text-center text-muted-foreground mt-4 italic">
          Fitur interaksi sosial sedang dalam pengembangan untuk membangun ukhuwah Islamiyah.
        </p>
      </div>
    </div>
  );
}
