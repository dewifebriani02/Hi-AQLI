'use client';

import { SurahList } from "@/components/surah-list";
import { Button } from "@/components/ui/button";
import { BookOpen, Layers, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JuzList } from "@/components/juz-list";
import { useDoc, useCollection } from "@/supabase/db";
import { supabase, useUser } from "@/supabase";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Headphones, 
  Check, 
  Music, 
  ShieldAlert, 
  CreditCard, 
  Coffee, 
  ArrowRight, 
  Heart, 
  Trophy, 
  Zap, 
  Award, 
  Star,
  Users,
  Search,
  CheckCircle2,
  ArrowLeft,
  PartyPopper,
  ThumbsUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMufradatStatus } from "@/lib/mufradat-access";

const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy", style: "Murattal" },
  { id: 2, name: "AbdulBaset AbdulSamad", style: "Murattal" },
  { id: 3, name: "Abdur-Rahman as-Sudais", style: "Sura/Juz" },
  { id: 6, name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
  { id: 12, name: "Saud al-Shuraim", style: "Murattal" },
  { id: 1, name: "AbdulBaset AbdulSamad", style: "Mujawwad" },
];

function MufradatPageContent() {
  const { user, isUserLoading } = useUser();

  // Fetch all passed attempts for the current user
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id }
    ]
  }), [user?.id]);

  const { data: progress, isLoading: isProgressLoading } = useCollection(
    "quiz_attempts", 
    user ? progressOptions : undefined
  );

  const { data: registrations, isLoading: isRegLoading } = useCollection("halaqah_registrations", {
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  });

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);

  // GROUP LEADERBOARD DATA
  const { data: allGroupUsers, isLoading: isGroupUsersLoading } = useCollection(userData?.mufradat_group_id ? "users" : null, {
    filters: [{ column: 'mufradat_group_id', operator: '==', value: userData?.mufradat_group_id }]
  });

  const { data: allGroupAttempts, isLoading: isGroupAttemptsLoading } = useCollection(userData?.mufradat_group_id ? "quiz_attempts" : null, {
    filters: [
      { column: 'group_id', operator: '==', value: userData?.mufradat_group_id },
      { column: 'is_passed', operator: '==', value: true }
    ]
  });

  const { data: allReactions, refresh: refreshReactions } = useCollection("mufradat_reactions");

  const groupRankings = useMemo(() => {
    if (!allGroupUsers) return [];
    
    return allGroupUsers.map(u => {
      const userAttempts = (allGroupAttempts || []).filter(a => a.user_id === u.id);
      
      // UNIQUE VERSES (Hafalan)
      const uniqueVerses = new Set(userAttempts.map(a => `${a.surah_id}:${a.verse_id}`)).size;
      
      // TOTAL PASSED (Aktivitas/Repetisi)
      const totalPassed = userAttempts.length;
      
      // REACTION SUMMARY
      const userReactions = (allReactions || []).filter(r => r.to_user_id === u.id);
      const reactionSummary = {
        mabruk: userReactions.filter(r => r.reaction_type === 'mabruk').length,
        semangat: userReactions.filter(r => r.reaction_type === 'semangat').length,
        hebat: userReactions.filter(r => r.reaction_type === 'hebat').length,
        total: userReactions.length
      };
      
      return {
        ...u,
        points: u.points || 0,
        verseCount: uniqueVerses,
        activityCount: totalPassed,
        reactionSummary
      };
    }).sort((a: any, b: any) => b.verseCount - a.verseCount || b.points - a.points)
      .slice(0, 20); // Top 20
  }, [allGroupUsers, allGroupAttempts, allReactions]);

  const sendReaction = async (toUserId: string, type: string) => {
    if (!user) return;
    try {
      await supabase.from('mufradat_reactions').insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        reaction_type: type,
        group_id: userData?.mufradat_group_id
      });
      refreshReactions();
    } catch (err) {
      console.error("Error sending reaction:", err);
    }
  };

  const access = useMemo(() => {
    return getMufradatStatus(userData, registrations || []);
  }, [userData, registrations]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("surah");
  const [selectedReciterId, setSelectedReciterId] = useState<number>(7);
  const [isReciterDialogOpen, setIsReciterDialogOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'juz' || tab === 'surah') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', val);
    router.replace(`/mufradat?${params.toString()}`);
  };

  useEffect(() => {
    const saved = localStorage.getItem('aqli_reciter_id');
    if (saved) setSelectedReciterId(parseInt(saved));
  }, []);

  const selectReciter = (id: number) => {
    setSelectedReciterId(id);
    localStorage.setItem('aqli_reciter_id', id.toString());
    setIsReciterDialogOpen(false);
  };

  const selectedReciterName = RECITERS.find(r => r.id === selectedReciterId)?.name || "Pilih Qari";

  if (isUserLoading || isRegLoading || isUserDataLoading || isProgressLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Kurikulum...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-4xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4 px-1">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Mufradat • Per Ayat & Per Halaman</span>
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
          <p className="text-muted-foreground text-sm max-w-md">Pelajari setiap kata dan maknai setiap ayat dalam Mushaf HI AQLI.</p>
        </div>

        <div className={cn(
          "grid gap-2 shrink-0 w-full sm:w-auto",
          activeTab === 'rank' ? "grid-cols-1" : "grid-cols-2 sm:flex sm:flex-row"
        )}>
          <Button asChild variant="outline" className="h-12 px-6 rounded-2xl border-2 border-[#800000]/10 hover:bg-[#800000]/5 hover:border-[#800000]/20 flex items-center gap-3 group transition-all bg-white shadow-sm w-full sm:w-auto">
            <Link href="/mufradat/billing" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start leading-none gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Langganan</span>
                <span className="text-xs font-bold text-slate-800">STATUS & INFAQ</span>
              </div>
            </Link>
          </Button>

          {activeTab !== 'rank' && (
            <Dialog open={isReciterDialogOpen} onOpenChange={setIsReciterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-2 border-[#800000]/10 hover:bg-[#800000]/5 hover:border-[#800000]/20 flex items-center gap-3 group transition-all shrink-0 bg-white shadow-sm w-full sm:w-auto">
                  <div className="w-8 h-8 rounded-full bg-[#800000]/10 flex items-center justify-center text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-colors">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start leading-none gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pilihan Qari</span>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[80px] sm:max-w-none">{selectedReciterName}</span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-6 bg-gradient-to-br from-[#800000] to-[#b91c1c] text-white">
                  <DialogTitle className="text-xl font-black font-headline flex items-center gap-3">
                    <Music className="w-6 h-6 text-[#D4AF37]" />
                    PILIH QARI FAVORIT
                  </DialogTitle>
                  <p className="text-white/70 text-xs font-medium">Suara Tilawah akan menyesuaikan Qari yang Anda pilih.</p>
                </DialogHeader>
                <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto bg-slate-50">
                  {RECITERS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectReciter(r.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                        selectedReciterId === r.id 
                          ? "bg-white border-[#800000] shadow-md scale-[1.02]" 
                          : "bg-white/50 border-transparent hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm",
                          selectedReciterId === r.id ? "bg-[#800000] text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {r.name[0]}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className={cn("text-sm font-bold", selectedReciterId === r.id ? "text-[#800000]" : "text-slate-700")}>{r.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{r.style}</span>
                        </div>
                      </div>
                      {selectedReciterId === r.id && (
                        <div className="w-6 h-6 rounded-full bg-[#800000] flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Soft Reminder Banner */}
      {access.showSoftReminder && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Heart className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-tight text-amber-800">Support Hi AQLI</p>
              <p className="text-[11px] font-medium text-amber-900 leading-tight">
                {access.message}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] h-9 px-4 rounded-xl shrink-0">
            <Link href="/mufradat/billing">INFAQ SEKARANG</Link>
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="surah" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <Layers className="w-4 h-4" /> Ayat
          </TabsTrigger>
          <TabsTrigger value="juz" className="font-bold gap-2 data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <BookOpen className="w-4 h-4" /> Halaman
          </TabsTrigger>
          <TabsTrigger value="rank" className="font-bold gap-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg transition-all">
            <Trophy className="w-4 h-4" /> Juara
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <SurahList 
              baseUrl="/mufradat" 
              userProgress={progress} 
              selectedReciterId={selectedReciterId} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="juz" className="focus-visible:outline-none">
          <JuzList 
            userProgress={progress} 
            selectedReciterId={selectedReciterId} 
          />
        </TabsContent>

        <TabsContent value="rank" className="focus-visible:outline-none space-y-4">
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
            <CardHeader className="bg-gradient-to-br from-[#800000] to-rose-900 text-white p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-400 fill-current" />
                    <CardTitle className="text-2xl font-black font-headline uppercase leading-none">Papan Juara Grup</CardTitle>
                  </div>
                  <CardDescription className="text-white/70 font-medium">Berdasarkan Total Poin & Kapasitas Hafalan.</CardDescription>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {!userData?.mufradat_group_id ? (
                 <div className="py-20 text-center flex flex-col items-center gap-4 bg-slate-50/50">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Zap className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Belum Ada Grup</h3>
                      <p className="text-sm text-muted-foreground px-12">Ukhti belum bergabung ke dalam grup manapun untuk melihat peringkat.</p>
                    </div>
                 </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {groupRankings.map((u: any, idx: number) => (
                      <div key={u.id} className="group p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-100">
                        <div className="flex items-center gap-4">
                          {/* Rank Display */}
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all",
                            idx === 0 ? "bg-amber-400 text-white shadow-md shadow-amber-200 scale-110" : 
                            idx === 1 ? "bg-slate-300 text-slate-700" : 
                            idx === 2 ? "bg-amber-700/30 text-amber-900" : 
                            "text-slate-400 bg-slate-50"
                          )}>
                            {idx + 1}
                          </div>
                          
                          {/* User Profile Info */}
                          <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-2 ring-slate-50 group-hover:ring-[#800000]/10 transition-all">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">{u.full_name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 leading-tight group-hover:text-[#800000] transition-colors">{u.full_name || 'Ukhti'}</span>
                              {user?.id === u.id && (
                                <span className="text-[9px] bg-[#800000]/10 text-[#800000] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Saya</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1 group/stat" title="Points">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
                                <span className="text-xs font-black text-amber-600">{u.points} <span className="text-[9px] font-medium text-slate-400">POIN</span></span>
                              </div>
                              <div className="flex items-center gap-1 group/stat" title="Hafalan">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="text-xs font-black text-emerald-600">{u.verseCount} <span className="text-[9px] font-medium text-slate-400">HAFALAN</span></span>
                              </div>
                              <div className="flex items-center gap-1 group/stat" title="Repetisi">
                                <Layers className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-black text-slate-500">{u.activityCount} <span className="text-[9px] font-medium text-slate-400">REPETISI</span></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                             {u.reactionSummary.total > 0 && (
                               <div className="flex items-center -space-x-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shadow-sm animate-in fade-in zoom-in">
                                 {u.reactionSummary.mabruk > 0 && <span title="Mabruk!" className="text-[10px]">🌟</span>}
                                 {u.reactionSummary.semangat > 0 && <span title="Semangat!" className="text-[10px]">💪</span>}
                                 {u.reactionSummary.hebat > 0 && <span title="Hebat!" className="text-[10px]">🙌</span>}
                                 <span className="text-[9px] font-black text-amber-700 ml-1.5">{u.reactionSummary.total}</span>
                               </div>
                             )}
                             {idx < 3 && <Star className={cn("w-5 h-5 fill-current transition-transform hover:scale-125", idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : "text-amber-700/30")} />}
                          </div>
                          
                          {user?.id !== u.id && (
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                              <button 
                                onClick={() => sendReaction(u.id, 'mabruk')}
                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-amber-100 border border-slate-200 hover:border-amber-200 flex items-center justify-center transition-all text-amber-600 hover:scale-110 active:scale-95"
                                title="Kirim Mabruk!"
                              >
                                <PartyPopper className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => sendReaction(u.id, 'semangat')}
                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-emerald-100 border border-slate-200 hover:border-emerald-200 flex items-center justify-center transition-all text-emerald-600 hover:scale-110 active:scale-95"
                                title="Kirim Semangat!"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => sendReaction(u.id, 'hebat')}
                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-100 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-all text-rose-600 hover:scale-110 active:scale-95"
                                title="Kirim Hebat!"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </CardContent>
            {userData?.mufradat_group_id && (
              <CardFooter className="bg-slate-50 p-6 flex flex-col items-center gap-2 border-t border-slate-100 italic">
                <p className="text-[10px] font-medium text-slate-400 text-center leading-relaxed">
                  Papan Juara diperbarui secara otomatis ketika thalibah berhasil melewati kuis ayat, halaman, atau murajaah.
                </p>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Access Blocked Overlay */}
      {access.isBlocked && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-md flex items-center justify-center p-6 sm:p-4">
          <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden animate-in zoom-in duration-300">
             <div className="bg-rose-600 py-10 flex flex-col items-center gap-3 text-white">
                <ShieldAlert className="h-16 w-16" />
                <h2 className="text-2xl font-black font-headline uppercase tracking-widest">Akses Tertutup</h2>
             </div>
             <CardContent className="pt-8 pb-10 space-y-6 text-center">
                <div className="space-y-3">
                   <p className="text-sm font-bold text-slate-800 leading-relaxed px-4">
                      {access.message}
                   </p>
                   <p className="text-[11px] text-muted-foreground italic px-6">
                      Hi AQLI membutuhkan dana untuk biaya operasional agar terus dapat menemani perjuangan Ukhti dalam mendalami kalam-Nya.
                   </p>
                </div>
                <div className="flex flex-col gap-3 px-4">
                   <Button asChild className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black h-14 rounded-2xl text-lg shadow-lg">
                      <Link href="/mufradat/billing">
                         <CreditCard className="mr-2 w-6 h-6" /> 
                         {access.status === 'on_leave' ? 'CEK STATUS CUTI' : 'KONFIRMASI PEMBAYARAN'}
                      </Link>
                   </Button>
                   <Button asChild variant="ghost" className="text-muted-foreground font-bold">
                      <Link href="/">Kembali ke Dasbor</Link>
                   </Button>
                </div>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MufradatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Kurikulum...</p>
      </div>
    }>
      <MufradatPageContent />
    </Suspense>
  );
}
