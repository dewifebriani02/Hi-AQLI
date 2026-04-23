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
  TrendingUp, 
  Users, 
  Award, 
  MessageCircle, 
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Phone,
  ChevronRight,
  UserCog,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
  Zap
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
const WEEKLY_TARGET_VERSES = 15;

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
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [newSchedule, setNewSchedule] = useState("0 21 * * 0");

  useEffect(() => {
    const gid = searchParams.get('groupId');
    if (gid) setSelectedGroupId(gid);
  }, [searchParams]);
  
  const { data: groups } = useCollection("mufradat_groups", {
    orderBy: { column: 'name', ascending: true }
  });
  
  const userOptions = useMemo(() => {
    if (selectedGroupId === "all") return {};
    return { filters: [{ column: 'mufradat_group_id', operator: '==', value: selectedGroupId }] };
  }, [selectedGroupId]);

  const { data: users, isLoading: isUsersLoading } = useCollection("users", userOptions);
  
  const attemptOptions = useMemo(() => {
    const baseFilters = [{ column: 'is_passed', operator: '==', value: true }];
    if (selectedGroupId === "all") return { filters: baseFilters };
    return { filters: [...baseFilters, { column: 'group_id', operator: '==', value: selectedGroupId }] };
  }, [selectedGroupId]);

  const { data: attempts, isLoading: isAttemptsLoading } = useCollection("quiz_attempts", attemptOptions);
  const { data: registrations } = useCollection("halaqah_registrations", {
    filters: [{ column: 'status', operator: '==', value: 'verified' }],
  });

  const { data: waLogs } = useCollection("whatsapp_logs", {
    filters: [{ column: 'type', operator: '==', value: 'weekly_reminder' }],
    orderBy: { column: 'created_at', ascending: false },
    limit: 100
  });

  const userStats = useMemo(() => {
    if (!users) return [];
    const safeAttempts = attempts || [];
    const safeRegs = registrations || [];
    const sevenDaysAgo = subDays(new Date(), 7);

    return users.map(user => {
      const userReg = safeRegs.find(r => r.user_id === user.id);
      const meta = userReg?.metadata || {};
      const targetStr = meta.target || "1-halaman";
      const schedule = meta.schedule || "harian";
      
      let pages = 1;
      if (targetStr.includes("2")) pages = 2;
      else if (targetStr.includes("3")) pages = 3;
      else if (targetStr.includes("5")) pages = 5;
      else if (targetStr.includes("10")) pages = 10;
      
      const userTargetVerses = pages * 15;
      const userPassedAttempts = safeAttempts.filter(a => a.user_id === user.id);
      const weeklyPassed = userPassedAttempts.filter(a => new Date(a.created_at) > sevenDaysAgo);
      const uniqueVersesWeekly = new Set(weeklyPassed.map(a => `${a.surah_id}:${a.verse_id}`));
      const weeklyCount = uniqueVersesWeekly.size;
      const reachedWeeklyTarget = weeklyCount >= userTargetVerses;

      const uniqueVerses = new Set(userPassedAttempts.map(a => `${a.surah_id}:${a.verse_id}`));
      const passedCount = uniqueVerses.size;
      const progressPercent = (passedCount / TOTAL_QURAN_VERSES) * 100;
      
      const lastAttempt = [...userPassedAttempts].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
        groupName: groups?.find(g => g.id === user.mufradat_group_id)?.name || "Grup Tidak Diketahui",
        lastWaReminder: waLogs?.find(l => l.user_id === user.id)
      };
    }).filter(Boolean);
  }, [users, attempts, groups, registrations, waLogs]);

  const filteredStats = useMemo(() => {
    const s = search.toLowerCase();
    return userStats.filter(u => 
      (u.username || u.full_name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s)
    );
  }, [userStats, search]);

  const sendWhatsAppReminder = (u: any) => {
    const waNumber = u.whatsapp || u.phone;
    if (!waNumber) {
      alert(`Nomor WA ${u.username || u.full_name} tidak ada.`);
      return;
    }
    const message = `Assalamualaikum Ukhti ${u.username || u.full_name}, progres Mufradat pekan ini (${u.weeklyCount} ayat) belum mencapai target (${u.targetStr}). Semangat ya!`;
    window.open(`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleUpdateParticipant = async () => {
    if (!editingUser?.id) return;
    try {
      const { error } = await supabase.from('users').update({
        paid_juz: editingUser.paid_juz ? parseInt(editingUser.paid_juz) : null,
        tikrar_level: editingUser.tikrar_level ? parseInt(editingUser.tikrar_level) : null,
        is_tikrar_paid: editingUser.is_tikrar_paid || false,
        mufradat_group_id: editingUser.mufradat_group_id === "none" ? null : editingUser.mufradat_group_id,
        updated_at: new Date().toISOString(),
      }).eq('id', editingUser.id);
      if (error) throw error;
      toast({ title: "Berhasil Update" });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Update", description: err.message });
    }
  };

  const handleTriggerAutomated = async () => {
    if (!confirm("Kirim pengingat otomatis sekarang?")) return;
    setIsTriggering(true);
    try {
      const res = await fetch('/api/admin/reminders', { method: 'POST', body: JSON.stringify({ action: 'trigger_now' }) });
      const data = await res.json();
      if (data.success) toast({ title: "Reminder Dipicu" });
      else throw new Error(data.error);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleTriggerSingle = async (userId: string) => {
    setIsTriggering(true);
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify({ action: 'trigger_now', userId })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Berhasil!", description: "Server sedang mengirim WA otomatis ke peserta ini." });
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Kirim", description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleUpdateSchedule = async () => {
    try {
      const res = await fetch('/api/admin/reminders', { method: 'POST', body: JSON.stringify({ action: 'update_schedule', schedule: newSchedule }) });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Jadwal Disimpan" });
        setIsScheduleDialogOpen(false);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal simpan jadwal", description: err.message });
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
          <Button variant="outline" size="sm" onClick={() => setIsScheduleDialogOpen(true)} className="h-10 text-[10px] font-black uppercase tracking-widest border-2 border-amber-500 text-amber-600 rounded-xl">
             <CalendarDays className="w-3.5 h-3.5 mr-2" /> Atur Jadwal
          </Button>
          <Button disabled={isTriggering} onClick={handleTriggerAutomated} size="sm" className="h-10 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xl">
            {isTriggering ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
            Test Kirim Pekanan Sekarang
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><CardTitle className="text-xl font-black text-[#800000]">DAFTAR PROGRESS</CardTitle></div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Input placeholder="Cari..." className="w-full md:w-64 h-10 border-none bg-muted/50 rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="pl-6">Peserta</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status Pekanan</TableHead>
                <TableHead>Progres (%)</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarImage src={u.photo_url || u.photoURL} /><AvatarFallback className="bg-[#800000] text-white font-bold">{u.username?.[0]}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#800000]">{u.username || u.full_name}</span>
                        <span className="text-[10px] text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{u.targetStr}</Badge></TableCell>
                  <TableCell>
                    {u.reachedWeeklyTarget ? <Badge className="bg-emerald-500">AMAN</Badge> : <Badge variant="destructive">DI BAWAH</Badge>}
                    <div className="text-[10px] mt-1">{u.weeklyCount} / {u.userTargetVerses} ayat</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Progress value={u.progressPercent} className="h-2 w-32" />
                      {u.lastWaReminder && (
                        <span className="text-[9px] font-bold text-emerald-600">WA Sent: {formatDistanceToNow(new Date(u.lastWaReminder.created_at), { addSuffix: true, locale: idLocale })}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-full"
                        onClick={() => handleTriggerSingle(u.id)}
                        disabled={isTriggering}
                        title="Tes Kirim Otomatis Server"
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className={cn("rounded-full h-8", u.reachedWeeklyTarget ? "bg-muted text-muted-foreground" : "bg-[#25D366] hover:bg-[#128C7E] text-white")} onClick={() => sendWhatsAppReminder(u)}>JAPRI WA</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogTitle>Atur Jadwal Japri Otomatis</DialogTitle>
          <div className="py-4 space-y-4">
             <Label>Format Cron (0 21 * * 0 = Minggu 21:00 UTC)</Label>
             <Input value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleUpdateSchedule}>Simpan Jadwal</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminMufradatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <MufradatMonitoringContent />
    </Suspense>
  );
}
