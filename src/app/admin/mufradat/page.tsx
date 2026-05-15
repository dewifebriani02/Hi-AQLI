'use client';

import { useCollection } from "@/supabase/db";
import {
  Card,
  CardContent,
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
  ChevronRight,
  CalendarDays,
  Zap,
  Settings,
  RefreshCw,
  AlertCircle,
  BookOpen,
  MessageSquare,
  Sparkles,
  ClipboardList,
  Trash2
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense, Fragment } from "react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

const TOTAL_QURAN_VERSES = 6236;

function MufradatMonitoringContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const { toast } = useToast();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [newSchedule, setNewSchedule] = useState("0 14 * * 0");

  // Friendly schedule inputs
  const [scheduleDay, setScheduleDay] = useState("0");
  const [scheduleHour, setScheduleHour] = useState("14");
  const [scheduleMinute, setScheduleMinute] = useState("0");
  const [isInitialRender, setIsInitialRender] = useState(true);

  const [selectedTestUser, setSelectedTestUser] = useState("");
  const [testMessage, setTestMessage] = useState("");

  const [isMotivationDialogOpen, setIsMotivationDialogOpen] = useState(false);
  const [motivations, setMotivations] = useState<any[]>([]);
  const [newMotivation, setNewMotivation] = useState("");
  const [isLoadingMotivations, setIsLoadingMotivations] = useState(false);

  // New Management State
  const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [dbConfigs, setDbConfigs] = useState<any[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");

  const generateCron = (day: string, hour: string, minute: string) => {
    return `${minute} ${hour} * * ${day}`;
  };

  const parseCron = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length >= 5) {
      return {
        minute: parts[0],
        hour: parts[1],
        day: parts[4]
      };
    }
    return { minute: '0', hour: '14', day: '0' };
  };

  // Reset inputs when dialog opens
  useEffect(() => {
    if (isScheduleDialogOpen && isInitialRender) {
      const parsed = parseCron(newSchedule);
      setScheduleDay(parsed.day);
      setScheduleHour(parsed.hour);
      setScheduleMinute(parsed.minute);
      setIsInitialRender(false);
    }
  }, [isScheduleDialogOpen, newSchedule]);

  // Update cron when inputs change (only after initial render)
  useEffect(() => {
    if (!isInitialRender) {
      setNewSchedule(generateCron(scheduleDay, scheduleHour, scheduleMinute));
    }
  }, [scheduleDay, scheduleHour, scheduleMinute, isInitialRender]);

  useEffect(() => {
    const gid = searchParams.get('groupId');
    if (gid) setSelectedGroupId(gid);
  }, [searchParams]);
  
  const { data: groups } = useCollection("mufradat_groups", {
    orderBy: { column: 'name', ascending: true }
  });
  
  const { data: users, isLoading: isUsersLoading } = useCollection("users", {
    orderBy: { column: 'created_at', ascending: false }
  });

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
    orderBy: { column: 'created_at', ascending: false },
    limit: 100
  });

  const userStats = useMemo(() => {
    if (!users) return [];
    const safeAttempts = attempts || [];
    const safeRegs = registrations || [];
    const sevenDaysAgo = subDays(new Date(), 7);

    // Build a map of verses per page from all passed attempts
    // This helps estimate how many verses are on each page
    const globalVersesInPage = new Map<number, Set<string>>();
    safeAttempts.forEach(a => {
      if (a.is_passed && a.page_id) {
        if (!globalVersesInPage.has(a.page_id)) globalVersesInPage.set(a.page_id, new Set());
        globalVersesInPage.get(a.page_id)!.add(`${a.surah_id}:${a.verse_id}`);
      }
    });

    return users.map(user => {
      const userReg = safeRegs.find(r => r.user_id === user.id);
      const meta = userReg?.metadata || {};
      const targetStr = meta.target || "1-halaman";
      const schedule = meta.schedule || "harian";
      
      let pagesCount = 1;
      if (targetStr.includes("2")) pagesCount = 2;
      else if (targetStr.includes("3")) pagesCount = 3;
      else if (targetStr.includes("5")) pagesCount = 5;
      else if (targetStr.includes("10")) pagesCount = 10;
      
      const userTargetLines = pagesCount * 15;
      const userPassedAttempts = safeAttempts.filter(a => a.user_id === user.id && a.is_passed);
      
      // Weekly Progress (in Lines)
      const weeklyPassed = userPassedAttempts.filter(a => new Date(a.created_at) > sevenDaysAgo);
      const weeklyVersesByPage = new Map<number, Set<string>>();
      weeklyPassed.forEach(a => {
        if (a.page_id) {
          if (!weeklyVersesByPage.has(a.page_id)) weeklyVersesByPage.set(a.page_id, new Set());
          weeklyVersesByPage.get(a.page_id)!.add(`${a.surah_id}:${a.verse_id}`);
        }
      });

      let weeklyLines = 0;
      weeklyVersesByPage.forEach((verses, pageId) => {
        // Heuristic: Use the global max seen verses for this page, or fallback to a reasonable number
        const totalInPage = Math.max(globalVersesInPage.get(pageId)?.size || 12, verses.size);
        weeklyLines += (verses.size / totalInPage) * 15;
      });

      // Total Progress (ever)
      const uniqueVersesEver = new Set(userPassedAttempts.map(a => `${a.surah_id}:${a.verse_id}`));
      const passedCount = uniqueVersesEver.size;
      const progressPercent = (passedCount / TOTAL_QURAN_VERSES) * 100;
      
      // Total Pages Accessed (passed at least 1 quiz on that page)
      const totalPassedPages = new Set(userPassedAttempts.map(a => a.page_id)).size;
      
      const lastAttempt = [...userPassedAttempts].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        ...user,
        passedCount,
        totalPassedPages,
        weeklyCount: Math.round(weeklyLines * 10) / 10,
        reachedWeeklyTarget: weeklyLines >= userTargetLines,
        userTargetVerses: userTargetLines,
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
    const now = new Date();
    return userStats.filter(u => {
      // Filter by Group ID
      if (selectedGroupId !== "all" && u.mufradat_group_id !== selectedGroupId) return false;

      // Tampilkan peserta yang memiliki grup dan status bukan inactive
      if (!u.mufradat_group_id || u.mufradat_status === 'inactive') return false;

      // Search filter
      return (u.username || u.full_name || u.phone || u.email || '').toLowerCase().includes(s);
    });
  }, [userStats, search, selectedGroupId]);

  const groupedStats = useMemo(() => {
    const groupsMap: Record<string, any[]> = {};
    filteredStats.forEach(u => {
      const gName = u.groupName || "Grup Tidak Diketahui";
      if (!groupsMap[gName]) groupsMap[gName] = [];
      groupsMap[gName].push(u);
    });
    // Sort groups alphabetically
    return Object.entries(groupsMap).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredStats]);

  const sendWhatsAppReminder = (u: any) => {
    const waNumber = u.whatsapp || u.phone;
    if (!waNumber) {
      alert(`Nomor WA ${u.username || u.full_name} tidak ada.`);
      return;
    }
    const displayName = u.full_name || u.username;
    const salutationValue = u.salutation?.trim() || (displayName?.toLowerCase().includes('ummu') ? '' : 'Ukhti');
    const salutation = salutationValue ? salutationValue + ' ' : '';
    
    // Pick a manual template from DB
    const manualVariants = dbTemplates.filter(t => t.category === 'manual');
    let template = "Assalamualaikum {salutation}{name}, sekadar mengingatkan target Mufradat pekan ini ({targetStr}). Progres saat ini baru {weeklyCount} ayat. Semoga Allah mudahkan dalam menjaga hafalan. Semangat, bismillah! ✨";
    
    if (manualVariants.length > 0) {
      template = manualVariants[Math.floor(Math.random() * manualVariants.length)].content;
    }

    const message = template
      .replace(/\{salutation\}/g, salutation)
      .replace(/\{name\}/g, displayName)
      .replace(/\{targetStr\}/g, u.targetStr)
      .replace(/\{weeklyCount\}/g, String(u.weeklyCount))
      .replace(/  +/g, ' ')
      .trim() + "\n\n— Admin Hi AQLI";

    window.open(`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/reminders', { 
        method: 'POST', 
        body: JSON.stringify({ action: 'fetch_settings' }) 
      });
      const data = await res.json();
      if (data.success) {
        setDbTemplates(data.templates);
        setDbConfigs(data.configs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const saveTemplate = async (id: string | null, category: string, content: string) => {
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify({ action: 'save_template', id, category, content })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Template Disimpan" });
        fetchSettings();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan template" });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Hapus variasi pesan ini?")) return;
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_template', id })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Template Dihapus" });
        fetchSettings();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menghapus template" });
    }
  };

  const updateConfig = async (category: string, schedule: string) => {
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_schedule', category, schedule })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Jadwal ${category} Berhasil Diupdate` });
        fetchSettings();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal update jadwal" });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleUnblock = async (userId: string) => {
    if (!confirm("Buka blokir WhatsApp untuk peserta ini?")) return;
    setIsTriggering(true);
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify({ action: 'unblock', userId })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Blokir Dibuka", description: "Sistem akan mencoba mengirim WA lagi ke peserta ini." });
        // Refresh data manually if needed, but the collection hook should pick it up if real-time
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const fetchMotivations = async () => {
    setIsLoadingMotivations(true);
    try {
      const { data, error } = await supabase
        .from('mufradat_motivations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMotivations(data || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal memuat motivasi", description: e.message });
    } finally {
      setIsLoadingMotivations(false);
    }
  };

  const handleAddMotivation = async () => {
    if (!newMotivation.trim()) return;
    setIsLoadingMotivations(true);
    try {
      const { error } = await supabase
        .from('mufradat_motivations')
        .insert({ content: newMotivation.trim() });
      if (error) throw error;
      setNewMotivation("");
      fetchMotivations();
      toast({ title: "Motivasi Ditambahkan" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: e.message });
    } finally {
      setIsLoadingMotivations(false);
    }
  };

  const handleDeleteMotivation = async (id: string) => {
    try {
      const { error } = await supabase.from('mufradat_motivations').delete().eq('id', id);
      if (error) throw error;
      fetchMotivations();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus" });
    }
  };

  useEffect(() => {
    if (isMotivationDialogOpen) {
      fetchMotivations();
    }
  }, [isMotivationDialogOpen]);

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
            <p className="text-muted-foreground font-medium text-sm">Hanya peserta resmi Hi Mufradat (status aktif). Monitor target 1 halaman sepekan dan kirim pengingat via WhatsApp.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsManagementDialogOpen(true)} className="h-10 text-[10px] font-black uppercase tracking-widest border-2 border-emerald-500 text-emerald-600 rounded-xl bg-emerald-50">
             <MessageSquare className="w-3.5 h-3.5 mr-2" /> Kelola Pesan & Jadwal
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
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-full md:w-48 h-10 border-none bg-muted/50 rounded-lg text-xs font-bold text-[#800000]">
                  <SelectValue placeholder="Pilih Grup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Grup</SelectItem>
                  {groups?.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <TableHead>Jadwal</TableHead>
                <TableHead>Halaman</TableHead>
                <TableHead>Status Pekanan</TableHead>
                <TableHead>Progres (%)</TableHead>
                <TableHead>Status WA</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedStats.map(([groupName, members]) => (
                <Fragment key={groupName}>
                  <TableRow className="bg-muted/30 border-y-2 border-muted">
                    <TableCell colSpan={6} className="py-2 pl-6">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[10px] uppercase tracking-widest text-[#800000]">{groupName}</span>
                        <Badge variant="outline" className="bg-white text-[9px] h-5">{members.length} Peserta</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {members.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar><AvatarImage src={u.photo_url || u.photoURL} /><AvatarFallback className="bg-[#800000] text-white font-bold">{(u.full_name || u.username)?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#800000]">{u.full_name || u.username}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{u.targetStr}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 capitalize text-[10px] font-bold">
                          {u.schedule || 'harian'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-blue-500" />
                          <span className="font-bold text-xs">{u.totalPassedPages} hlm</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.reachedWeeklyTarget ? <Badge className="bg-emerald-500 text-white border-none">AMAN</Badge> : <Badge variant="destructive" className="border-none">DI BAWAH</Badge>}
                        <div className="text-[10px] mt-1 font-medium">{u.weeklyCount} / {u.userTargetVerses} baris</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Progress value={u.progressPercent} className="h-2 w-32" />
                          {u.lastWaReminder && (
                            <span className="text-[9px] font-bold text-emerald-600">Terakhir: {formatDistanceToNow(new Date(u.lastWaReminder.created_at), { addSuffix: true, locale: idLocale })}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.wa_blocked_at ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="destructive" className="text-[9px] px-1 h-5 animate-pulse">AUTO BLOCKED</Badge>
                            <span className="text-[8px] text-muted-foreground">{u.wa_failed_count}x gagal</span>
                          </div>
                        ) : u.mufradat_due_date && new Date(u.mufradat_due_date) < new Date() ? (
                          <Badge variant="destructive" className="text-[9px] px-1 h-5 bg-red-600">MASA AKTIF HABIS</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1 h-5 text-emerald-600 border-emerald-200 font-bold uppercase">NORMAL</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {u.wa_blocked_at && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 w-8 p-0 text-amber-600 border-amber-200 hover:bg-amber-50 rounded-full"
                              onClick={() => handleUnblock(u.id)}
                              disabled={isTriggering}
                              title="Buka Blokir Otomatis"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-full"
                            onClick={() => handleTriggerSingle(u.id)}
                            disabled={isTriggering || !!u.wa_blocked_at}
                            title={u.wa_blocked_at ? "User terblokir" : "Tes Kirim Otomatis Server"}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className={cn("rounded-full h-8 text-[10px] font-black uppercase tracking-tight", u.reachedWeeklyTarget ? "bg-muted text-muted-foreground" : "bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg shadow-emerald-200")} onClick={() => sendWhatsAppReminder(u)}>JAPRI WA</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {filteredStats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                    Tidak ada peserta yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-xl font-black text-[#800000]">LOG WHATSAPP TERAKHIR</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(waLogs || []).slice(0, 10).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: idLocale })}</TableCell>
                  <TableCell className="text-xs">{log.recipient}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {log.metadata?.provider || 'fonnte'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.type}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">
                    {log.metadata?.fonnte_response?.reason || JSON.stringify(log.metadata).substring(0, 100)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MANAGEMENT DIALOG: TEMPLATES & SCHEDULES */}
      <Dialog open={isManagementDialogOpen} onOpenChange={setIsManagementDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-emerald-600 text-white rounded-t-3xl">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Settings className="w-8 h-8" /> Manajemen Reminder WhatsApp
            </DialogTitle>
            <DialogDescription className="text-emerald-50 text-[11px] font-bold uppercase tracking-widest mt-1">
              Atur Variasi Pesan, Jadwal Pengiriman, dan Monitoring Server
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="templates" className="w-full">
            <div className="px-8 bg-emerald-600/5 border-b">
              <TabsList className="bg-transparent h-12 gap-6">
                <TabsTrigger value="templates" className="data-[state=active]:border-b-4 data-[state=active]:border-emerald-600 rounded-none h-full font-black text-[10px] uppercase tracking-widest text-muted-foreground data-[state=active]:text-emerald-700">Variasi Pesan</TabsTrigger>
                <TabsTrigger value="schedules" className="data-[state=active]:border-b-4 data-[state=active]:border-emerald-600 rounded-none h-full font-black text-[10px] uppercase tracking-widest text-muted-foreground data-[state=active]:text-emerald-700">Jadwal Otomatis</TabsTrigger>
                <TabsTrigger value="server" className="data-[state=active]:border-b-4 data-[state=active]:border-emerald-600 rounded-none h-full font-black text-[10px] uppercase tracking-widest text-muted-foreground data-[state=active]:text-emerald-700">Status & Test</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="templates" className="p-8 space-y-6">
              <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl text-[11px] text-blue-700 font-medium">
                <p>💡 <strong>Tips:</strong> Gunakan lebih dari 2 variasi pesan per kategori untuk menghindari deteksi spam oleh WhatsApp. Pesan akan dirotasi secara otomatis.</p>
                <p className="mt-2"><strong>Placeholder:</strong> <code className="bg-blue-200 px-1 rounded">{"{salutation}"}</code>, <code className="bg-blue-200 px-1 rounded">{"{name}"}</code>, <code className="bg-blue-200 px-1 rounded">{"{progress}"}</code> (untuk pekanan), <code className="bg-blue-200 px-1 rounded">{"{targetStr}"}</code> (untuk manual)</p>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-4">
                {['manual', 'harian', 'weekend', 'pekanan', 'monday_spirit'].map((cat) => (
                  <AccordionItem key={cat} value={cat} className="border rounded-2xl px-4 bg-white shadow-sm overflow-hidden">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px] uppercase px-3">
                          {cat.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {dbTemplates.filter(t => t.category === cat).length} Variasi
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6 space-y-4">
                      <div className="space-y-3">
                        {dbTemplates.filter(t => t.category === cat).map((tpl, idx) => (
                          <div key={tpl.id} className="group relative bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="absolute top-2 right-2 h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteTemplate(tpl.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-2">Variasi #{idx + 1}</label>
                            <Textarea 
                              className="text-xs font-medium leading-relaxed bg-white border-slate-200 focus:border-emerald-500 min-h-[80px]"
                              value={tpl.content}
                              onChange={(e) => {
                                const newTemplates = [...dbTemplates];
                                const target = newTemplates.find(t => t.id === tpl.id);
                                if (target) target.content = e.target.value;
                                setDbTemplates(newTemplates);
                              }}
                              onBlur={() => saveTemplate(tpl.id, cat, tpl.content)}
                            />
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full border-dashed border-2 py-8 rounded-xl text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 transition-all"
                          onClick={() => saveTemplate(null, cat, "Tulis pesan baru di sini...")}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Tambah Variasi Pesan
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="schedules" className="p-8 space-y-8">
              {['harian', 'weekend', 'pekanan', 'monday_spirit'].map((cat) => {
                const config = dbConfigs.find(c => c.category === cat);
                const cron = config?.schedule_cron || "0 14 * * 0";
                const parts = cron.split(' ');
                
                return (
                  <div key={cat} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-xs uppercase tracking-widest text-[#800000]">
                        Jadwal Reminder {cat.replace('_', ' ')}
                      </h3>
                      {config?.updated_at && (
                        <span className="text-[9px] text-muted-foreground">Terakhir diupdate: {new Date(config.updated_at).toLocaleString('id-ID')}</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Hari</label>
                        <Select 
                          value={parts[4]} 
                          onValueChange={(val) => {
                            const newCron = `${parts[0]} ${parts[1]} * * ${val}`;
                            updateConfig(cat, newCron);
                          }}
                        >
                          <SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Minggu</SelectItem>
                            <SelectItem value="1">Senin</SelectItem>
                            <SelectItem value="2">Selasa</SelectItem>
                            <SelectItem value="3">Rabu</SelectItem>
                            <SelectItem value="4">Kamis</SelectItem>
                            <SelectItem value="5">Jumat</SelectItem>
                            <SelectItem value="6">Sabtu</SelectItem>
                            <SelectItem value="*">Setiap Hari</SelectItem>
                            <SelectItem value="1-5">Senin - Jumat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Jam (WIB)</label>
                        <Select 
                          value={parts[1]} 
                          onValueChange={(val) => {
                            const newCron = `${parts[0]} ${val} * * ${parts[4]}`;
                            updateConfig(cat, newCron);
                          }}
                        >
                          <SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Menit</label>
                        <Select 
                          value={parts[0]} 
                          onValueChange={(val) => {
                            const newCron = `${val} ${parts[1]} * * ${parts[4]}`;
                            updateConfig(cat, newCron);
                          }}
                        >
                          <SelectTrigger className="h-10 text-xs font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['0', '15', '30', '45'].map(m => (
                              <SelectItem key={m} value={m}>{m} Menit</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-0.5">
                        <div className="bg-emerald-50 text-emerald-700 px-4 h-10 rounded-lg flex items-center justify-center w-full text-[10px] font-black uppercase tracking-tight border border-emerald-100">
                          Aktif
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="server" className="p-8 space-y-8">
              {/* Test Kirim ke User Spesifik */}
              <div className="space-y-4">
                <h3 className="font-black text-sm uppercase tracking-widest text-[#800000]">Test Kirim ke Peserta</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-1">Pilih Peserta</Label>
                    <Select value={selectedTestUser} onValueChange={setSelectedTestUser}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Cari peserta..." /></SelectTrigger>
                      <SelectContent>
                        {filteredStats.slice(0, 50).map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.username || u.full_name} ({u.whatsapp || u.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-1">Pesan Custom (Optional)</Label>
                    <Input
                      placeholder="Kosongkan untuk pakai template manual..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!selectedTestUser) return;
                    setIsTriggering(true);
                    try {
                      const res = await fetch('/api/admin/reminders', {
                        method: 'POST',
                        body: JSON.stringify({ action: 'trigger_now', userId: selectedTestUser, customMessage: testMessage })
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: "Pesan Test Terkirim!" });
                      } else {
                        toast({ variant: "destructive", title: "Gagal", description: data.error });
                      }
                    } catch (err: any) {
                      toast({ variant: "destructive", title: "Error", description: err.message });
                    } finally {
                      setIsTriggering(false);
                    }
                  }}
                  disabled={!selectedTestUser || isTriggering}
                  className="w-full h-12 bg-[#800000] text-white font-black uppercase tracking-widest rounded-xl"
                >
                  {isTriggering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Kirim Pesan Test Sekarang
                </Button>
              </div>

              {/* Status Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-black text-xs uppercase tracking-widest text-[#800000]">Status Device Fonnte</h3>
                  <div className="bg-muted/50 p-4 rounded-xl space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Dashboard Provider:</span>
                      <a href="https://fonnte.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold text-xs">
                        BUKA FONNTE →
                      </a>
                    </div>
                    <p className="text-[10px] leading-relaxed text-muted-foreground italic">
                      💡 Periksa status "Connected" di dashboard provider. Jika terputus, silakan scan ulang QR Code di sana.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-black text-xs uppercase tracking-widest text-[#800000]">Limit & Keamanan</h3>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                    <div className="bg-slate-50 p-3 rounded-lg border">
                      <div className="text-slate-400 mb-1">Daily Cap</div>
                      <div className="text-slate-800">200 Pesan</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border">
                      <div className="text-slate-400 mb-1">Delay</div>
                      <div className="text-slate-800">8 Detik</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-8 bg-slate-50 rounded-b-3xl border-t">
            <Button onClick={() => setIsManagementDialogOpen(false)} className="w-full h-12 bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-900">
              Selesai & Tutup
            </Button>
          </DialogFooter>
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
