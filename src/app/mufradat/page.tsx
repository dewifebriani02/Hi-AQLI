'use client';
import { getCallSign } from "@/lib/utils";

import { SurahList } from "@/components/tilawah/surah-list";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Layers,
  Loader2,
  Headphones,
  Check,
  Music,
  ShieldAlert,
  CreditCard,
  Coffee,
  ArrowRight,
  Heart,
  Trophy,
  Zap as ZapIcon,
  Star,
  Users,
  Search,
  CheckCircle2,
  ArrowLeft,
  PartyPopper,
  ThumbsUp,
  Flame,
  Award,
  GraduationCap,
  RotateCcw,
  Gift,
  Sparkles as SparklesIcon,
  ShieldCheck,
  Target,
  X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JuzList } from "@/components/tilawah/juz-list";
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
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { getMufradatStatus } from "@/lib/mufradat-access";
import { checkIsStudent, checkIsVerifiedStudent } from "@/lib/access-control";
import { MufradatOnboarding } from "@/components/mufradat/onboarding-modal";


function MufradatPageContent() {
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("surah");
  const [rankMode, setRankMode] = useState<'ayat' | 'halaman'>('ayat');
  const [searchQuery, setSearchQuery] = useState("");
  const [showSeasonRecap, setShowSeasonRecap] = useState(false);
  const [previousLeague, setPreviousLeague] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminder, setShowReminder] = useState(true);

  // Fetch all passed attempts for the current user
  const progressOptions = useMemo(() => ({
    filters: [
      { column: 'user_id', operator: '==', value: user?.id },
      { column: 'is_passed', operator: '==', value: true }
    ]
  }), [user?.id]);

  const { data: progress, isLoading: isProgressLoading } = useCollection(
    user ? "quiz_attempts" : null, 
    progressOptions
  );

  const registrationsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  }), [user?.id]);

  const { data: registrations, isLoading: isRegLoading } = useCollection(
    user ? "halaqah_registrations" : null, 
    registrationsOptions
  );

  const redemptionsOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    select: "*, vouchers(*)"
  }), [user?.id]);

  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection(
    user ? "voucher_redemptions" : null, 
    redemptionsOptions
  );

  const { data: userData, isLoading: isUserDataLoading } = useDoc(user?.id ? "users" : null, user?.id);
  const [pageVerseCounts, setPageVerseCounts] = useState<Record<number, number>>({});

  // FETCH BADGES
  const badgesOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }]
  }), [user?.id]);

  const { data: userBadges, isLoading: isBadgesLoading } = useCollection(
    user ? "user_badges" : null, 
    badgesOptions
  );

  const isRankTab = activeTab === 'ranking';
  const group_id = userData?.mufradat_group_id;

  // GROUP LEADERBOARD DATA (Lazy load only when on rank tab)
  const groupUsersOptions = useMemo(() => ({
    filters: [{ column: 'mufradat_group_id', operator: '==', value: group_id }],
    limit: 50 // Limit to top 50 users in group to avoid over-fetching
  }), [group_id]);

  const { data: allGroupUsers, isLoading: isGroupUsersLoading } = useCollection(
    isRankTab && group_id ? "users" : null, 
    groupUsersOptions
  );

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(now.setDate(diff)).toISOString().split('T')[0] + 'T00:00:00Z';
  }, []);

  // Fetch verse counts for each page in weekly progress
  useEffect(() => {
    if (!progress) return;
    const uniquePageIds = [...new Set(progress.filter(a => a.created_at >= startOfWeek).map(a => a.page_id).filter(id => !!id))];
    
    uniquePageIds.forEach(async (pId) => {
      if (pageVerseCounts[pId]) return;
      try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${pId}?fields=id`);
        const data = await res.json();
        if (data.verses) {
          setPageVerseCounts(prev => ({ ...prev, [pId]: data.verses.length }));
        }
      } catch (e) {
        console.error(`Failed to fetch verse count for page ${pId}:`, e);
      }
    });
  }, [progress, startOfWeek]);

  const userWeeklyStats = useMemo(() => {
    if (!progress) return { weeklyVerses: 0, weeklyPages: 0, weeklyPageProgress: 0, activity7Days: [] };
    
    const currentWeekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const weeklyVerses = new Set();
    const weeklyPages = new Set();
    const totalPagesEver = new Set();
    const activeDates = new Set();
    const versesByPage = new Map<number, Set<string>>();
    const completedPagesInWeek = new Set<number>();

    progress.forEach(a => {
      const dateStr = a.created_at.split('T')[0];
      activeDates.add(dateStr);

      if (a.quiz_id?.startsWith('mufradat_page_')) {
        const pageId = a.page_id || a.quiz_id.replace('mufradat_page_', '');
        if (pageId) totalPagesEver.add(Number(pageId));
      }

      if (a.created_at >= startOfWeek) {
        if (a.quiz_id?.startsWith('mufradat_page_')) {
          const pageId = a.page_id || a.quiz_id.replace('mufradat_page_', '');
          if (pageId) {
            weeklyPages.add(Number(pageId));
            completedPagesInWeek.add(Number(pageId));
          }
        } else {
          weeklyVerses.add(`${a.surah_id}:${a.verse_id}`);
          if (a.page_id) {
            if (!versesByPage.has(a.page_id)) versesByPage.set(a.page_id, new Set());
            versesByPage.get(a.page_id)!.add(`${a.surah_id}:${a.verse_id}`);
          }
        }
      }
    });

    let weeklyPageProgress = 0;
    const allUniquePageIds = new Set([...versesByPage.keys(), ...completedPagesInWeek]);
    
    allUniquePageIds.forEach(pId => {
      if (completedPagesInWeek.has(pId)) {
        weeklyPageProgress += 1;
      } else {
        const verses = versesByPage.get(pId);
        const totalOnPage = pageVerseCounts[pId] || 15;
        weeklyPageProgress += Math.min((verses?.size || 0) / totalOnPage, 1);
      }
    });

    return {
      weeklyVerses: weeklyVerses.size,
      weeklyPages: weeklyPages.size,
      weeklyPageProgress: Math.round(weeklyPageProgress * 10) / 10,
      totalPagesEver: totalPagesEver.size,
      activity7Days: currentWeekDays.map(date => activeDates.has(date))
    };
  }, [progress, startOfWeek, pageVerseCounts]);

  const groupAttemptsOptions = useMemo(() => ({
    filters: [
      { column: 'group_id', operator: '==', value: group_id },
      { column: 'is_passed', operator: '==', value: true }
    ],
    orderBy: { column: 'created_at', ascending: false },
    limit: 4000 
  }), [group_id]);

  const { data: allGroupAttempts, isLoading: isGroupAttemptsLoading } = useCollection(
    isRankTab && group_id ? "quiz_attempts" : null, 
    groupAttemptsOptions
  );

  const reactionsOptions = useMemo(() => ({
    filters: [{ column: 'group_id', operator: '==', value: group_id }]
  }), [group_id]);

  const { data: allReactions, refresh: refreshReactions } = useCollection(
    isRankTab && group_id ? "mufradat_reactions" : null, 
    reactionsOptions
  );

  const groupRankings = useMemo(() => {
    if (!allGroupUsers || !isRankTab || !allGroupAttempts) return [];
    
    // O(M) Pre-processing attempts into Map for O(1) lookups
    const attemptsByUserId = new Map<string, { verses: Set<string>, pages: Set<number>, count: number }>();
    
    allGroupAttempts.forEach(a => {
      if (!attemptsByUserId.has(a.user_id)) {
        attemptsByUserId.set(a.user_id, { verses: new Set(), pages: new Set(), count: 0, weeklyVerses: new Set(), weeklyPages: new Set() });
      }
      const stats = attemptsByUserId.get(a.user_id)!;
      stats.count++;
      
      const isWeekly = a.created_at >= startOfWeek;

      if (a.quiz_id?.startsWith('mufradat_page_')) {
        if (a.page_id) {
          stats.pages.add(Number(a.page_id));
          if (isWeekly) stats.weeklyPages.add(Number(a.page_id));
        }
      } else {
        const verseKey = `${a.surah_id}:${a.verse_id}`;
        stats.verses.add(verseKey);
        if (isWeekly) stats.weeklyVerses.add(verseKey);
      }
    });

    // O(K) Pre-processing reactions into Map
    const reactionsByUserId = new Map<string, { mabruk: number, semangat: number, hebat: number, total: number }>();
    (allReactions || []).forEach(r => {
      if (!reactionsByUserId.has(r.to_user_id)) {
        reactionsByUserId.set(r.to_user_id, { mabruk: 0, semangat: 0, hebat: 0, total: 0 });
      }
      const counts = reactionsByUserId.get(r.to_user_id)!;
      counts.total++;
      if (r.reaction_type === 'mabruk') counts.mabruk++;
      else if (r.reaction_type === 'semangat') counts.semangat++;
      else if (r.reaction_type === 'hebat') counts.hebat++;
    });

    // O(N) processing users
    return allGroupUsers.map(u => {
      const stats = attemptsByUserId.get(u.id);
      const rx = reactionsByUserId.get(u.id) || { mabruk: 0, semangat: 0, hebat: 0, total: 0 };
      
      return {
        ...u,
        points: u.mufradat_weekly_points || 0,
        verseCount: stats?.weeklyVerses.size || 0,
        pageCount: stats?.weeklyPages.size || 0,
        totalVerseCount: stats?.verses.size || 0,
        totalPageCount: stats?.pages.size || 0,
        activityCount: stats?.count || 0,
        reactionSummary: rx
      };
    }).sort((a: any, b: any) => {
      if (rankMode === 'halaman') {
        return b.pageCount - a.pageCount || b.points - a.points;
      }
      return b.verseCount - a.verseCount || b.points - a.points;
    }).slice(0, 20); // Top 20
  }, [allGroupUsers, allGroupAttempts, allReactions, isRankTab, rankMode]);

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

  const isStudent = useMemo(() => checkIsStudent(registrations || []), [registrations]);
  const isVerifiedStudent = useMemo(() => checkIsVerifiedStudent(registrations || []), [registrations]);

  const access = useMemo(() => {
    return getMufradatStatus({
      user: userData, 
      registrations: registrations || [], 
      isStudent, 
      redemptions: redemptions || []
    });
  }, [userData, registrations, redemptions, isStudent]);

  const showPromoBanner = !isStudent || access.status === 'inactive' || access.status === 'blocked';

  const fullSalutation = userData?.salutation || "Ukhti";
  const callSign = getCallSign(fullSalutation);



  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'juz' || tab === 'surah' || tab === 'ranking') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', val);
    router.replace(`/mufradat?${params.toString()}`);
  };



  // WEEKLY LEAGUE RESET LOGIC (Every Monday 00:00)
  useEffect(() => {
    async function checkWeeklyReset() {
      if (!user || !userData) return;
      
      const now = new Date();
      const lastResetAt = userData.last_league_reset_at ? new Date(userData.last_league_reset_at) : null;
      
      // Calculate most recent Monday at 00:00
      const mostRecentMonday = new Date(now);
      const day = mostRecentMonday.getDay(); // 0 is Sunday, 1 is Monday
      const diff = mostRecentMonday.getDate() - day + (day === 0 ? -6 : 1); 
      mostRecentMonday.setDate(diff);
      mostRecentMonday.setHours(0, 0, 0, 0);

      // If last reset was before this week's Monday, reset!
      if (!lastResetAt || lastResetAt < mostRecentMonday) {
        // Capture previous league for the recap dialog
        setPreviousLeague(userData.mufradat_league || 'Perunggu');
        setShowSeasonRecap(true);

        await supabase
          .from('users')
          .update({
            mufradat_weekly_points: 0,
            mufradat_league: 'Perunggu',
            last_league_reset_at: now.toISOString()
          })
          .eq('id', user.id);
      }
    }
    checkWeeklyReset();
  }, [user, userData]);

  useEffect(() => {
    if (!isUserDataLoading && userData && !userData.metadata?.has_seen_mufradat_onboarding) {
      setShowOnboarding(true);
    }
  }, [userData, isUserDataLoading]);

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    // Optimistic close
    setShowOnboarding(false);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          metadata: {
            ...(userData?.metadata || {}),
            has_seen_mufradat_onboarding: true
          }
        })
        .eq('id', user.id);
      
      if (error) {
        console.error("Error updating onboarding status:", error);
        // We don't re-open it to avoid annoying the user if it's just a network glitch
      }
    } catch (err) {
      console.error("Error updating onboarding status:", err);
    }
  };

  const isInitialLoading = isUserLoading || (isRegLoading && registrations.length === 0) || (isUserDataLoading && !userData) || (isProgressLoading && (progress || []).length === 0);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Kurikulum...</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-6 pb-24 max-w-4xl mx-auto px-4 sm:px-0 transition-all duration-700",
      showOnboarding && "blur-xl grayscale pointer-events-none opacity-50"
    )}>
      <MufradatOnboarding 
        open={showOnboarding} 
        onComplete={handleCompleteOnboarding} 
        salutation={fullSalutation} 
      />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-4 px-1">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#800000] mb-1">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Mufradat • Hafalan Per Surat & Juz</span>
          </div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
          <p className="text-muted-foreground text-sm max-w-md">Pelajari setiap kata dan maknai setiap ayat dalam Mushaf HI AQLI.</p>
        </div>

        <div className={cn(
          "shrink-0 w-full sm:w-auto",
          activeTab === 'rank' ? "hidden" : "block"
        )}>
          {user && (
            <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:flex-row sm:gap-2 sm:w-auto sm:items-end">
              <Button asChild variant="outline" className="h-12 px-2 sm:px-5 rounded-2xl border-2 border-[#800000]/10 hover:bg-[#800000]/5 hover:border-[#800000]/20 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 group transition-all bg-white shadow-sm flex-1">
                <Link href="/mufradat/billing" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex flex-col items-center sm:items-start leading-none gap-0.5 sm:gap-1">
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-muted-foreground line-clamp-1">
                      {access.daysRemaining !== undefined ? `SISA ${access.daysRemaining} HARI` : 'LANGGANAN'}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase line-clamp-1">Status</span>
                  </div>
                </Link>
              </Button>

              {/* TARGET PEKANAN */}
              <div className={cn(
                "h-12 px-2 sm:px-5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 shadow-sm flex-1 transition-all",
                userWeeklyStats.weeklyPageProgress >= 1 ? "bg-emerald-50 border-emerald-500/20 text-emerald-700" : "bg-amber-50 border-amber-500/20 text-amber-700"
              )}>
                <div className={cn(
                  "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center",
                  userWeeklyStats.weeklyPageProgress >= 1 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                )}>
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="flex flex-col items-center sm:items-start leading-none gap-0.5 sm:gap-1">
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-tight opacity-70 line-clamp-1">Target Pekanan</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] sm:text-xs font-black uppercase line-clamp-1">{userWeeklyStats.weeklyPageProgress} / 1 HLM</span>
                    <span className="text-[7px] sm:text-[9px] font-bold text-muted-foreground uppercase opacity-60">Total: {userWeeklyStats.totalPagesEver}</span>
                  </div>
                </div>
              </div>

              <div className="h-12 px-2 sm:px-5 rounded-2xl border-2 border-orange-500/10 bg-orange-50/30 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3 shadow-sm flex-1 animate-in zoom-in duration-500">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                  <Flame className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current", (userData?.mufradat_streak_count || 0) > 0 ? "animate-pulse" : "opacity-30")} />
                </div>
                <div className="flex flex-col items-center sm:items-start leading-none gap-0.5 sm:gap-1 flex-1">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-orange-600/70 line-clamp-1">Streak</span>
                    <div className="flex gap-0.5">
                      {userWeeklyStats.activity7Days.map((active, i) => (
                        <div key={i} className={cn("w-1 h-1 rounded-full", active ? "bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]" : "bg-slate-200")} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-xs font-black text-orange-700 line-clamp-1 text-center sm:text-left">{userData?.mufradat_streak_count || 0} HARI</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ACHIEVEMENT BADGES SECTION */}
      {user && (userBadges || []).length > 0 && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                 <Award className="w-4 h-4 text-emerald-600" />
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lencana Terkumpul</h2>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{(userBadges || []).length} PENGHARGAAN</span>
           </div>
           <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              {userBadges?.map((b) => {
                 let icon = <Star className="w-4 h-4" />;
                 let label = b.badge_type;
                 let color = "bg-amber-100 text-amber-700 border-amber-200";

                 if (b.badge_type === 'streak_7') {
                   icon = <Flame className="w-4 h-4 fill-current" />;
                   label = "Konsisten 7 Hari";
                   color = "bg-orange-100 text-orange-700 border-orange-200";
                 } else if (b.badge_type === 'subuh_warrior') {
                   icon = <Coffee className="w-4 h-4" />;
                   label = "Bintang Subuh";
                   color = "bg-blue-100 text-blue-700 border-blue-200";
                 } else if (b.badge_type === 'hafidzah_100') {
                   icon = <GraduationCap className="w-4 h-4" />;
                   label = "Ahli Mufradat";
                   color = "bg-emerald-100 text-emerald-700 border-emerald-200";
                 }

                 return (
                   <div key={b.id} className={cn(
                     "flex items-center gap-2 px-3 py-2 rounded-xl border-2 shrink-0 transition-all hover:scale-105 shadow-sm",
                     color
                   )}>
                      {icon}
                      <span className="text-[11px] font-black uppercase tracking-tight">{label}</span>
                   </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* MABAR PROMO CARD */}
      <Link href="/mufradat/mabar">
        <div className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#800000] via-[#A52A2A] to-[#8B4513] p-8 text-white shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] mb-8 border-b-4 border-black/20">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform">
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tighter leading-none">Mabar Al-Qur'an</h3>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest leading-relaxed">Kompetisi Hafalan Serentak Per Juz • Live Leaderboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/20 px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 self-start sm:self-auto">
              <span className="text-xs font-black uppercase tracking-widest">KUBER GABUNG!</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
          <Trophy className="absolute -bottom-6 -right-6 w-48 h-48 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-700" />
        </div>
      </Link>
      
      {/* GLOBAL SEARCH FOR ALL TABS */}
      <div className="relative group px-1">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-[#800000] transition-colors" />
        </div>
        <Input
          type="text"
          placeholder="Cari surat, juz, atau tema hafalan..."
          className="h-14 pl-12 pr-4 bg-white border-none shadow-xl rounded-2xl text-base font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#800000]/20 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-[#800000]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="surah" className="font-bold gap-1 sm:gap-2 text-[10px] sm:text-xs data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Surat
          </TabsTrigger>
          <TabsTrigger value="juz" className="font-bold gap-1 sm:gap-2 text-[10px] sm:text-xs data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Juz
          </TabsTrigger>
          <TabsTrigger value="ranking" className="font-bold gap-1 sm:gap-2 text-[10px] sm:text-xs data-[state=active]:bg-[#800000] data-[state=active]:text-white rounded-lg transition-all">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Ranking
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="surah" className="space-y-6 focus-visible:outline-none">
          <div className="space-y-4">
            <SurahList 
              baseUrl="/mufradat" 
              userProgress={progress || []} 
              showAudio={false}
              isStudent={access.status === 'active' || access.status === 'trial' || access.status === 'grace_period'}
              externalSearch={searchQuery}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="juz" className="focus-visible:outline-none">
          <JuzList 
            userProgress={progress || []} 
            mode="exam"
            variant="mufradat"
            unlockedJuz={userData?.mufradat_accessible_juz || []}
            isStudent={access.status === 'active' || access.status === 'trial' || access.status === 'grace_period'}
            externalSearch={searchQuery}
          />
        </TabsContent>


        <TabsContent value="ranking" className="focus-visible:outline-none space-y-4">
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-white">
            <CardHeader className="bg-gradient-to-br from-[#800000] to-rose-900 text-white p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-400 fill-current" />
                    <CardTitle className="text-2xl font-black font-headline uppercase leading-none">Papan Juara Grup</CardTitle>
                  </div>
                  <CardDescription className="text-white/70 font-medium">
                    🏆 Papan Juara Pekanan (Reset Setiap Senin)
                  </CardDescription>
                </div>
                <div className="flex items-center bg-white/10 p-1 rounded-2xl backdrop-blur-sm border border-white/20">
                   <button 
                      onClick={() => setRankMode('ayat')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        rankMode === 'ayat' ? "bg-white text-[#800000] shadow-lg" : "text-white/70 hover:text-white"
                      )}
                   >
                      Ayat
                   </button>
                   <button 
                      onClick={() => setRankMode('halaman')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        rankMode === 'halaman' ? "bg-white text-amber-600 shadow-lg" : "text-white/70 hover:text-white"
                      )}
                   >
                      Halaman
                   </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               {!userData?.mufradat_group_id ? (
                 <div className="py-20 text-center flex flex-col items-center gap-4 bg-slate-50/50">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <ZapIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Belum Ada Grup</h3>
                      <p className="text-sm text-muted-foreground px-12">{fullSalutation} belum bergabung ke dalam grup manapun untuk melihat peringkat.</p>
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
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">
                              {String(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 leading-tight group-hover:text-[#800000] transition-colors">
                                {u.full_name || u.username || 'Ukhti'}
                              </span>
                              {user?.id === u.id && (
                                <span className="text-[9px] bg-[#800000]/10 text-[#800000] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Saya</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1 group/stat" title="Points">
                                <ZapIcon className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />
                                <span className="text-xs font-black text-amber-600">{u.points} <span className="text-[9px] font-medium text-slate-400">POIN PEKANAN</span></span>
                              </div>
                              <div className="flex items-center gap-1 group/stat" title="Hafalan">
                                <CheckCircle2 className={cn("w-3 h-3", rankMode === 'halaman' ? "text-amber-500" : "text-emerald-500")} />
                                <span className={cn("text-xs font-black", rankMode === 'halaman' ? "text-amber-600" : "text-emerald-600")}>
                                  {rankMode === 'halaman' ? u.pageCount : u.verseCount} <span className="text-[9px] font-medium text-slate-400 uppercase">{rankMode === 'halaman' ? 'Halaman' : 'Ayat'}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1 group/stat" title="Total Akumulasi">
                                <BookOpen className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-black text-slate-500">
                                  {rankMode === 'halaman' ? u.totalPageCount : u.totalVerseCount} <span className="text-[9px] font-medium text-slate-400 uppercase">Total</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1 group/stat" title="Repetisi">
                                <Layers className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-black text-slate-500">{u.activityCount} <span className="text-[9px] font-medium text-slate-400 uppercase">Repetisi</span></span>
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
                            <div className="flex flex-col items-end gap-1.5 mt-1">
                              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 opacity-50 group-hover:opacity-100 transition-opacity">Beri Selamat</span>
                              <div className="flex items-center gap-1.5 transition-all">
                                <button 
                                  onClick={() => sendReaction(u.id, 'mabruk')}
                                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-amber-100 border border-slate-200 hover:border-amber-200 flex items-center justify-center transition-all text-amber-600 hover:scale-110 active:scale-95 shadow-sm"
                                  title="Kirim Mabruk!"
                                >
                                  <PartyPopper className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => sendReaction(u.id, 'semangat')}
                                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-emerald-100 border border-slate-200 hover:border-emerald-200 flex items-center justify-center transition-all text-emerald-600 hover:scale-110 active:scale-95 shadow-sm"
                                  title="Kirim Semangat!"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => sendReaction(u.id, 'hebat')}
                                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-100 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-all text-rose-600 hover:scale-110 active:scale-95 shadow-sm"
                                  title="Kirim Hebat!"
                                >
                                  <Heart className="w-4 h-4" />
                                </button>
                              </div>
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

      {/* Access Blocked Overlay - Only show if user is registered but blocked, not for guests on the main index */}
      {user && isStudent && access.isBlocked && (
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
                   </p>
                </div>
                <div className="flex flex-col gap-3 px-4">
                   <Button asChild className={cn(
                     "w-full font-black h-14 rounded-2xl text-lg shadow-lg",
                     access.status === 'inactive' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#800000] hover:bg-[#800000]/90"
                   )}>
                      <Link href={access.redirectTo || "/mufradat/billing"}>
                         {access.status === 'inactive' ? <BookOpen className="mr-2 w-6 h-6" /> : <CreditCard className="mr-2 w-6 h-6" />} 
                         {access.buttonText || (access.status === 'on_leave' ? 'CEK STATUS CUTI' : access.status === 'inactive' ? 'DAFTAR PROGRAM SEKARANG' : 'KONFIRMASI PEMBAYARAN')}
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

      {/* Season Recap Dialog (Weekly Reset) */}
      <Dialog open={showSeasonRecap} onOpenChange={setShowSeasonRecap}>
        <DialogContent className="sm:max-w-md bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Musim Baru Dimulai!</DialogTitle>
              <DialogDescription>Informasi mengenai reset poin mingguan dan dimulainya musim baru di Hi Mufradat.</DialogDescription>
            </DialogHeader>
            <div className="bg-gradient-to-br from-[#800000] via-[#A52A2A] to-amber-600 p-8 text-center text-white relative">
              <PartyPopper className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-black font-headline uppercase tracking-tighter" aria-hidden="true">Musim Baru Dimulai!</h2>
              <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
                SENIN BERKAH
              </div>
           </div>
           <div className="p-8 text-center space-y-6">
              <div className="space-y-2">
                 <p className="text-lg font-bold text-slate-800 leading-tight">
                    Barakallah fiik! Musim lalu {fullSalutation} berhasil masuk <span className="text-[#800000] font-black">Liga {previousLeague}</span>.
                 </p>
                 <p className="text-sm text-muted-foreground font-medium italic">
                    Poin mingguan telah direset. Mari mulai dari awal dengan semangat Itqan!
                 </p>
              </div>
              <div className="pt-4">
                 <Button 
                    onClick={() => setShowSeasonRecap(false)}
                    className="w-full h-14 bg-[#800000] hover:bg-[#800000]/90 text-white font-black rounded-2xl shadow-xl uppercase tracking-[0.2em] text-xs"
                 >
                    PERTAHANKAN SEMANGAT!
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>
      {/* Multi-state Access Banner */}
      {user && (access.showSoftReminder || access.status === 'trial') && showReminder && (
        <div className={cn(
          "p-5 rounded-3xl flex flex-col gap-4 animate-in slide-in-from-top-4 border-2 shadow-sm my-8 relative",
          access.status === 'trial' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
        )}>
          <button 
            onClick={() => setShowReminder(false)}
            className={cn(
              "absolute top-3 right-3 p-1 rounded-full transition-colors",
              access.status === 'trial' ? "hover:bg-emerald-100 text-emerald-600" : "hover:bg-amber-100 text-amber-600"
            )}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-4 pr-6">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              access.status === 'trial' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            )}>
              {access.status === 'trial' ? <Gift className="w-5 h-5 animate-bounce" /> : <Heart className="w-5 h-5 fill-amber-500" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-tight",
                  access.status === 'trial' ? "text-emerald-800" : "text-amber-800"
                )}>
                  {access.status === 'trial' ? "Akses Trial Aktif" : "Support Hi AQLI"}
                </p>
                {access.status === 'trial' && <Badge className="bg-emerald-500 text-white text-[8px] h-4">24 JAM</Badge>}
              </div>
              <p className={cn(
                "text-[11px] font-medium leading-tight",
                access.status === 'trial' ? "text-emerald-900" : "text-amber-900"
              )}>
                {access.message}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className={cn(
            "w-full font-black text-[11px] h-11 rounded-xl shadow-lg transition-all active:scale-[0.98]",
            access.status === 'trial' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50" : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/50"
          )}>
            <Link href="/mufradat/billing">
              {access.status === 'trial' ? 'LIHAT STATUS' : 'INFAQ SEKARANG'}
            </Link>
          </Button>
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
