'use client';

import { useCollection } from "@/supabase/db";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Search, 
  BookOpen, 
  TrendingUp, 
  Users, 
  Award, 
  Star, 
  MessageCircle, 
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Phone,
  ChevronRight,
  UserCog,
  ShieldCheck,
  GraduationCap
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { supabase } from "@/supabase";
import { useToast } from "@/hooks/use-toast";

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const TOTAL_QURAN_VERSES = 6236;
const WEEKLY_TARGET_VERSES = 15; // Roughly 1 page

const TIKRAR_LEVELS = [
  { id: "1", name: "Intensif" },
  { id: "2", name: "Reguler" },
  { id: "3", name: "Santai" },
  { id: "4", name: "Pemula" },
];

function MufradatMonitoringContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const gid = searchParams.get('groupId');
    if (gid) setSelectedGroupId(gid);
  }, [searchParams]);
  
  // Fetch groups, users and their quiz attempts
  const { data: groups } = useCollection("mufradat_groups", {
    orderBy: { column: 'name', ascending: true }
  });
  
  const userOptions = useMemo(() => {
    if (selectedGroupId === "all") return {};
    return { filters: [{ column: 'mufradat_group_id', operator: '==', value: selectedGroupId }] };
  }, [selectedGroupId]);

  const { data: users, isLoading: isUsersLoading, error: usersError } = useCollection("users", userOptions);
  
  const attemptOptions = useMemo(() => {
    const baseFilters = [{ column: 'is_passed', operator: '==', value: true }];
    if (selectedGroupId === "all") return { filters: baseFilters };
    return { filters: [...baseFilters, { column: 'group_id', operator: '==', value: selectedGroupId }] };
  }, [selectedGroupId]);

  const { data: attempts, isLoading: isAttemptsLoading, error: attemptsError } = useCollection("quiz_attempts", attemptOptions);
  const { data: registrations, isLoading: isRegLoading } = useCollection("halaqah_registrations", {
    filters: [{ column: 'status', operator: '==', value: 'verified' }],
    orderBy: { column: 'created_at', ascending: false }
  });

  // Process data to get per-user stats
  const userStats = useMemo(() => {
    if (!users) return [];
    // attempts can be empty array
    const safeAttempts = attempts || [];
    const safeRegs = registrations || [];

    const sevenDaysAgo = subDays(new Date(), 7);

    return users.map(user => {
      if (!user?.id) return null;

      // Find the latest registration for this user
      const userReg = safeRegs.find(r => r.user_id === user.id);
      const meta = userReg?.metadata || {};
      
      const targetStr = meta.target || "1-halaman";
      const schedule = meta.schedule || "harian";
      
      // Calculate dynamic target verses (1 page = 15 verses)
      let pages = 1;
      if (targetStr.includes("2")) pages = 2;
      else if (targetStr.includes("3")) pages = 3;
      else if (targetStr.includes("5")) pages = 5;
      else if (targetStr.includes("10")) pages = 10;
      
      const userTargetVerses = pages * 15;

      // Filter unique passed verses for this user
      const userPassedAttempts = safeAttempts.filter(a => a.user_id === user.id);
      
      // Weekly progress (last 7 days)
      const weeklyPassedAttempts = userPassedAttempts.filter(a => {
        if (!a.created_at) return false;
        try {
          return new Date(a.created_at) > sevenDaysAgo;
        } catch (e) {
          return false;
        }
      });
      
      const uniqueVersesWeekly = new Set(
        weeklyPassedAttempts.map(a => `${a.surah_id}:${a.verse_id}`)
      );
      
      const weeklyCount = uniqueVersesWeekly.size;
      const reachedWeeklyTarget = weeklyCount >= userTargetVerses;

      // Overall progress
      const uniqueVerses = new Set(
        userPassedAttempts.map(a => `${a.surah_id}:${a.verse_id}`)
      );
      
      const passedCount = uniqueVerses.size;
      const progressPercent = (passedCount / TOTAL_QURAN_VERSES) * 100;
      
      // Get last activity date
      const lastAttempt = [...userPassedAttempts].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0];

      return {
        ...user,
        passedCount,
        weeklyCount,
        reachedWeeklyTarget,
        userTargetVerses,
        targetStr,
        schedule,
        progressPercent,
        lastActivity: lastAttempt ? new Date(lastAttempt.created_at) : null,
        totalPoints: user.points || 0,
        groupName: groups?.find(g => g.id === user.mufradat_group_id)?.name || "Grup Tidak Diketahui"
      };
    }).filter(Boolean) as any[];
  }, [users, attempts, groups, registrations]);

  const filteredStats = useMemo(() => {
    const s = search.toLowerCase();
    return userStats.filter(u => 
      (u.username || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    );
  }, [userStats, search]);

  const sendWhatsAppReminder = (u: any) => {
    if (!u.phone) {
      alert(`Nomor WhatsApp ${u.username} belum terdaftar di database. Silakan isi di Manajemen User.`);
      return;
    }

    const targetDesc = u.targetStr?.replace('-', ' ') || '1 halaman';
    const message = `Assalamualaikum Ukhti ${u.username}, ini dari Admin Hi AQLI. Kami melihat progres Mufradat pekan ini (${u.weeklyCount} ayat) belum mencapai target Ukhti yaitu ${targetDesc} (${u.userTargetVerses} ayat). Yuk dicicil lagi hafalan kosa-katanya agar istiqomah! Jzk.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${u.phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleUpdateParticipant = async () => {
    if (!editingUser?.id) return;

    const oldGroupId = users?.find(u => u.id === editingUser.id)?.mufradat_group_id;
    const newGroupId = editingUser.mufradat_group_id;

    const updateData: any = {
      paid_juz: editingUser.paid_juz ? parseInt(editingUser.paid_juz) : null,
      tikrar_level: editingUser.tikrar_level ? parseInt(editingUser.tikrar_level) : null,
      is_tikrar_paid: editingUser.is_tikrar_paid || false,
      mufradat_group_id: newGroupId === "none" ? null : newGroupId,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('users').update(updateData).eq('id', editingUser.id);
      if (error) throw error;

      // Update member counts if group changed
      if (oldGroupId !== newGroupId) {
        if (oldGroupId) {
          const { data: members } = await supabase.from('users').select('id').eq('mufradat_group_id', oldGroupId);
          await supabase.from('mufradat_groups').update({ member_count: members?.length || 0 }).eq('id', oldGroupId);
        }
        if (newGroupId && newGroupId !== "none") {
          const { data: members } = await supabase.from('users').select('id').eq('mufradat_group_id', newGroupId);
          await supabase.from('mufradat_groups').update({ member_count: members?.length || 0 }).eq('id', newGroupId);
        }
      }

      toast({
        title: "Peserta Diperbarui",
        description: `Pengaturan program untuk ${editingUser.username} telah disimpan.`,
      });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal update", description: err.message });
    }
  };

  if (isUsersLoading || isAttemptsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Memuat Data Progress...</p>
      </div>
    );
  }

  if (usersError || attemptsError) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-[70vh] gap-4 p-12 text-center bg-rose-50/50 rounded-3xl border-2 border-dashed border-rose-200 m-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-2">
            <AlertCircle className="w-10 h-10 text-rose-600" />
        </div>
        <h2 className="text-2xl font-black text-rose-900 font-headline uppercase">Gagal Memuat Data Monitoring</h2>
        <p className="text-sm text-rose-700/80 max-w-md font-medium leading-relaxed">
          Supabase menolak permintaan data ini.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-6 bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 px-8 rounded-full shadow-lg transition-all active:scale-95">
            RETRY CONNECTION
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
        <Link href="/admin" className="hover:text-[#800000] transition-colors">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/admin/mufradat" className="hover:text-[#800000] transition-colors text-[#800000]">Hi Mufradat</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#800000]">Monitor Peserta</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black font-headline tracking-tighter text-[#800000]">PROGRESS & REMINDER</h1>
            <p className="text-muted-foreground font-medium text-sm">Monitor target 1 halaman sepekan dan kirim pengingat via WhatsApp.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest border-2 border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5 rounded-xl">
            <Link href="/admin/mufradat/groups">Kelola Grup</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest border-2 border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5 rounded-xl">
            <Link href="/admin/mufradat/reports">Laporan Kinerja</Link>
          </Button>
          <Button asChild variant="default" size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest bg-[#800000] hover:bg-[#800000]/90 text-white rounded-xl shadow-lg shadow-[#800000]/20">
            <Link href="/admin/mufradat/finance" className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Keuangan
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden group">
          <div className="h-1.5 bg-[#800000]" />
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-[#800000] transition-colors">Total Peserta Terdaftar</CardDescription>
            <CardTitle className="text-3xl font-black flex items-center justify-between">
              {users?.length || 0}
              <Users className="w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden group">
          <div className="h-1.5 bg-[#D4AF37]" />
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Di Bawah Target Pekanan</CardDescription>
            <CardTitle className="text-3xl font-black flex items-center justify-between text-rose-600">
              {userStats.filter(u => !u.reachedWeeklyTarget && u.lastActivity && u.lastActivity > subDays(new Date(), 30)).length}
              <AlertCircle className="w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden group">
          <div className="h-1.5 bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Total Progress Global</CardDescription>
            <CardTitle className="text-3xl font-black flex items-center justify-between">
              {Math.round((userStats.reduce((acc, curr) => acc + curr.progressPercent, 0) / (users?.length || 1)) * 10) / 10}%
              <Award className="w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Monitoring Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black font-headline text-[#800000]">DAFTAR PROGRESS & MANAJEMEN</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">Target: Minimal {WEEKLY_TARGET_VERSES} ayat / pekan</CardDescription>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-48">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="h-10 border-none bg-muted/50 rounded-lg text-xs font-bold font-sans">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#800000]" />
                      <SelectValue placeholder="Pilih Grup" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Grup</SelectItem>
                    {groups?.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari Peserta..." 
                  className="pl-10 h-10 border-none bg-muted/50 rounded-lg text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[280px] text-[10px] font-black uppercase tracking-widest py-4 pl-6">Peserta</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Kontrak Belajar</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status Pekanan</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest w-[160px]">Progres (%)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((u) => (
                <TableRow key={u.id} className="hover:bg-[#800000]/5 transition-colors group">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-[#D4AF37]/30 group-hover:border-[#800000]/30 transition-colors">
                        <AvatarImage src={u.photo_url || u.photoURL} />
                        <AvatarFallback className="bg-[#800000] text-white font-bold">{u.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-[#800000] group-hover:underline cursor-pointer">{u.username || 'Hamba Allah'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground lowercase">{u.email}</span>
                            {u.phone && <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5"><Phone className="w-2 h-2" /> WA Aktif</span>}
                          </div>
                          
                          {/* JUZ ACCESS LIST (DEPRECATED: ALL NOW AUTO-UNLOCKED) */}
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="bg-slate-50 font-black text-[9px] uppercase border-slate-200 text-slate-700 h-6 px-3">{u.targetStr?.replace('-',' ') || '1 Halaman'}</Badge>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase pl-1">{u.schedule || 'Harian'}</span>
                     </div>
                  </TableCell>
                  <TableCell>
                    {u.reachedWeeklyTarget ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 font-black text-[9px] gap-1 px-2">
                        <CheckCircle className="w-3 h-3" /> AMAN (TARGET)
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 font-black text-[9px] gap-1 px-2">
                        <AlertCircle className="w-3 h-3" /> DI BAWAH TARGET
                      </Badge>
                    )}
                    <div className="text-[8px] mt-1 font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <span className={cn(u.reachedWeeklyTarget ? "text-emerald-700" : "text-rose-700")}>{u.weeklyCount}</span>
                      <span className="opacity-50">/ {u.userTargetVerses} ayat pekan ini</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <Progress value={u.progressPercent} className="h-2 bg-muted transition-all" />
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{u.progressPercent.toFixed(2)}% Hafal</span>
                         <span className="text-[8px] font-bold opacity-30">{u.passedCount}/{TOTAL_QURAN_VERSES}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={isEditDialogOpen && editingUser?.id === u.id} onOpenChange={(open) => {
                        if (!open) setEditingUser(null);
                        setIsEditDialogOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#800000]/10 hover:text-[#800000]"
                            onClick={() => setEditingUser(u)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-[#800000]" />
                              Manajemen Peserta
                            </DialogTitle>
                            <DialogDescription>Atur grup dan progres program untuk {u.username}.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-6 py-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Pilih Grup / Batch</Label>
                                <Select
                                  value={editingUser?.mufradat_group_id || "none"}
                                  onValueChange={(val) => setEditingUser({ ...editingUser, mufradat_group_id: val })}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Belum ada grup" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Tanpa Grup (Keluar dari Grup)</SelectItem>
                                    {groups?.map(g => (
                                      <SelectItem key={g.id} value={g.id}>
                                         <div className="flex items-center gap-2">
                                            <span className="font-bold">{g.name}</span>
                                            <span className="text-[10px] opacity-50">({g.member_count || 0}/50)</span>
                                         </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4 space-y-4">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap className="w-3.5 h-3.5 text-[#800000]" /> Detail Khusus Tikrar (Jika Ada)
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-left">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Target Juz</Label>
                                  <Select
                                    value={editingUser?.paid_juz?.toString() || "none"}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, paid_juz: val === "none" ? null : val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Belum diatur</SelectItem>
                                      {Array.from({ length: 30 }, (_, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>Juz {i + 1}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2 text-left">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Level Tikrar</Label>
                                  <Select
                                    value={editingUser?.tikrar_level?.toString() || "none"}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, tikrar_level: val === "none" ? null : val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Belum diatur</SelectItem>
                                      {TIKRAR_LEVELS.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                <div className="space-y-0.5 text-left">
                                  <Label className="text-sm font-bold">Status Premium Tikrar</Label>
                                  <p className="text-[10px] text-muted-foreground">Aktifkan akses counter repetisi.</p>
                                </div>
                                <Button
                                  variant={editingUser?.is_tikrar_paid ? "default" : "outline"}
                                  className={cn("font-black text-[10px]", editingUser?.is_tikrar_paid ? "bg-emerald-600" : "text-rose-600 border-rose-600")}
                                  onClick={() => setEditingUser({ ...editingUser, is_tikrar_paid: !editingUser.is_tikrar_paid })}
                                >
                                  {editingUser?.is_tikrar_paid ? 'AKTIF' : 'NON-AKTIF'}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateParticipant} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2">
                              <CheckCircle2 className="w-4 h-4" /> SIMPAN PERUBAHAN
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button 
                        size="sm" 
                        className={cn(
                          "h-9 gap-2 font-black text-[10px] rounded-full transition-all active:scale-[0.9] shadow-md",
                          u.reachedWeeklyTarget 
                            ? "bg-muted text-muted-foreground" 
                            : "bg-[#25D366] hover:bg-[#128C7E] text-white"
                        )}
                        onClick={() => sendWhatsAppReminder(u)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        JAPRI WA
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium italic">
                    Tidak ada data peserta ditemukan...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="bg-[#800000]/5 p-6 rounded-2xl border-2 border-dashed border-[#800000]/20 max-w-2xl">
        <h4 className="flex items-center gap-2 font-black text-[#800000] mb-2 uppercase tracking-tight">
          <MessageCircle className="w-5 h-5" /> Isi Pesan Reminder:
        </h4>
        <p className="text-sm italic text-muted-foreground leading-relaxed">
          "Assalamualaikum Ukhti [Nama], ini dari Admin Hi AQLI. Kami melihat progres Mufradat pekan ini ([Jumlah] ayat) belum mencapai target minimal 1 halaman (15 ayat). Semangat ya, yuk dicicil lagi hafalan kosa-katanya agar istiqomah! Jzk."
        </p>
      </div>
    </div>
  );
}

export default function AdminMufradatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Monitoring...</p>
      </div>
    }>
      <MufradatMonitoringContent />
    </Suspense>
  );
}
