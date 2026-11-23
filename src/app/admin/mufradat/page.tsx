'use client';

import { useCollection, authFetch } from "@/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Zap,
  Settings,
  RefreshCw,
  AlertCircle,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Users,
  Search,
  Plus,
  X,
  History,
  ExternalLink,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense, Fragment } from "react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
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
  SelectValue,
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

const TOTAL_QURAN_VERSES = 6236;

function normalizeWaPhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

type StatusFilter = "all" | "below" | "safe" | "blocked";

function MufradatMonitoringContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [mainTab, setMainTab] = useState<"participants" | "logs">("participants");
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isTriggering, setIsTriggering] = useState(false);

  // Reminder Management Dialog state
  const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [dbConfigs, setDbConfigs] = useState<any[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [waStatus, setWaStatus] = useState<any>(null);
  const [selectedTestUser, setSelectedTestUser] = useState("");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    const gid = searchParams.get("groupId");
    if (gid) setSelectedGroupId(gid);
  }, [searchParams]);

  const groupsOptions = useMemo(
    () => ({ orderBy: { column: "name", ascending: true } }),
    []
  );
  const usersOptions = useMemo(
    () => ({ orderBy: { column: "created_at", ascending: false } }),
    []
  );
  const attemptOptions = useMemo(() => {
    const baseFilters = [{ column: "is_passed", operator: "==", value: true }];
    if (selectedGroupId === "all") return { filters: baseFilters };
    return {
      filters: [
        ...baseFilters,
        { column: "group_id", operator: "==", value: selectedGroupId },
      ],
    };
  }, [selectedGroupId]);
  const regOptions = useMemo(
    () => ({
      filters: [{ column: "status", operator: "==", value: "verified" }],
    }),
    []
  );
  const waLogsOptions = useMemo(
    () => ({
      orderBy: { column: "created_at", ascending: false },
      limit: 100,
    }),
    []
  );

  const { data: groups } = useCollection("mufradat_groups", groupsOptions);
  const {
    data: users,
    isLoading: isUsersLoading,
    refresh: refreshUsers,
  } = useCollection("users", usersOptions);
  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(
    "quiz_attempts",
    attemptOptions
  );
  const { data: registrations } = useCollection("halaqah_registrations", regOptions);
  const { data: waLogs, refresh: refreshWaLogs } = useCollection(
    "whatsapp_logs",
    waLogsOptions
  );

  const userStats = useMemo(() => {
    if (!users) return [];
    const safeAttempts = attempts || [];
    const safeRegs = registrations || [];
    const sevenDaysAgo = subDays(new Date(), 7);

    const globalVersesInPage = new Map<number, Set<string>>();
    safeAttempts.forEach((a) => {
      if (a.is_passed && a.page_id) {
        if (!globalVersesInPage.has(a.page_id))
          globalVersesInPage.set(a.page_id, new Set());
        globalVersesInPage.get(a.page_id)!.add(`${a.surah_id}:${a.verse_id}`);
      }
    });

    return users
      .filter((u) => Boolean(u.mufradat_group_id) && u.mufradat_status !== "inactive")
      .map((u) => {
        const userReg = safeRegs.find((r) => r.user_id === u.id);
        const meta = userReg?.metadata || {};
        const targetStr = meta.target || "1-halaman";
        const schedule = meta.schedule || "harian";

        let pagesCount = 1;
        if (targetStr.includes("2")) pagesCount = 2;
        else if (targetStr.includes("3")) pagesCount = 3;
        else if (targetStr.includes("5")) pagesCount = 5;
        else if (targetStr.includes("10")) pagesCount = 10;

        const userTargetLines = pagesCount * 15;
        const userPassedAttempts = safeAttempts.filter(
          (a) => a.user_id === u.id && a.is_passed
        );

        const weeklyPassed = userPassedAttempts.filter(
          (a) => new Date(a.created_at) > sevenDaysAgo
        );
        const weeklyVersesByPage = new Map<number, Set<string>>();
        weeklyPassed.forEach((a) => {
          if (a.page_id) {
            if (!weeklyVersesByPage.has(a.page_id))
              weeklyVersesByPage.set(a.page_id, new Set());
            weeklyVersesByPage.get(a.page_id)!.add(`${a.surah_id}:${a.verse_id}`);
          }
        });

        let weeklyLines = 0;
        weeklyVersesByPage.forEach((verses, pageId) => {
          const totalInPage = Math.max(
            globalVersesInPage.get(pageId)?.size || 12,
            verses.size
          );
          weeklyLines += (verses.size / totalInPage) * 15;
        });

        const uniqueVersesEver = new Set(
          userPassedAttempts.map((a) => `${a.surah_id}:${a.verse_id}`)
        );
        const passedCount = uniqueVersesEver.size;
        const progressPercent = (passedCount / TOTAL_QURAN_VERSES) * 100;
        const totalPassedPages = new Set(userPassedAttempts.map((a) => a.page_id)).size;

        const lastAttempt = [...userPassedAttempts].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          ...u,
          passedCount,
          totalPassedPages,
          weeklyCount: Math.round(weeklyLines * 10) / 10,
          reachedWeeklyTarget: weeklyLines >= userTargetLines,
          userTargetVerses: userTargetLines,
          targetStr,
          schedule,
          progressPercent,
          lastActivity: lastAttempt ? new Date(lastAttempt.created_at) : null,
          totalPoints: u.points || 0,
          groupName:
            groups?.find((g) => g.id === u.mufradat_group_id)?.name ||
            "Grup Tidak Diketahui",
          lastWaReminder: waLogs?.find((l) => l.user_id === u.id),
        };
      });
  }, [users, attempts, groups, registrations, waLogs]);

  // Stats scoped by selectedGroupId for KPI strip
  const groupScopedStats = useMemo(() => {
    if (selectedGroupId === "all") return userStats;
    return userStats.filter((u) => u.mufradat_group_id === selectedGroupId);
  }, [userStats, selectedGroupId]);

  const kpis = useMemo(() => {
    const total = groupScopedStats.length;
    const safe = groupScopedStats.filter((u) => u.reachedWeeklyTarget).length;
    const below = total - safe;
    const blocked = groupScopedStats.filter((u) => Boolean(u.wa_blocked_at)).length;
    return { total, safe, below, blocked };
  }, [groupScopedStats]);

  const filteredStats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupScopedStats.filter((u) => {
      if (statusFilter === "below" && u.reachedWeeklyTarget) return false;
      if (statusFilter === "safe" && !u.reachedWeeklyTarget) return false;
      if (statusFilter === "blocked" && !u.wa_blocked_at) return false;

      if (!q) return true;
      const fields = [u.full_name, u.username, u.phone, u.whatsapp, u.email, u.groupName];
      return fields.some((val) => String(val || "").toLowerCase().includes(q));
    });
  }, [groupScopedStats, search, statusFilter]);

  const groupedStats = useMemo(() => {
    const groupsMap: Record<string, any[]> = {};
    filteredStats.forEach((u) => {
      const gName = u.groupName || "Grup Tidak Diketahui";
      if (!groupsMap[gName]) groupsMap[gName] = [];
      groupsMap[gName].push(u);
    });
    return Object.entries(groupsMap).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredStats]);

  const sendWhatsAppReminder = (u: any) => {
    const waNumber = normalizeWaPhone(u.whatsapp || u.phone);
    if (!waNumber) {
      toast({
        variant: "destructive",
        title: "Nomor WA Belum Tersedia",
        description: `${u.full_name || u.username} belum mencantumkan nomor WhatsApp.`,
      });
      return;
    }
    const displayName = u.full_name || u.username;
    const salutationValue =
      u.salutation?.trim() ||
      (displayName?.toLowerCase().includes("ummu") ? "" : "Ukhti");
    const salutation = salutationValue ? salutationValue + " " : "";

    const manualVariants = dbTemplates.filter((t) => t.category === "manual");
    let template =
      "Assalamualaikum {salutation}{name}, sekadar mengingatkan target Mufradat pekan ini ({targetStr}). Progres saat ini baru {weeklyCount} baris. Semoga Allah mudahkan dalam menjaga hafalan. Semangat, bismillah! ✨";

    if (manualVariants.length > 0) {
      template =
        manualVariants[Math.floor(Math.random() * manualVariants.length)].content;
    }

    const message =
      template
        .replace(/\{salutation\}/g, salutation)
        .replace(/\{name\}/g, displayName)
        .replace(/\{targetStr\}/g, u.targetStr)
        .replace(/\{weeklyCount\}/g, String(u.weeklyCount))
        .replace(/  +/g, " ")
        .trim() + "\n\n— Admin Hi AQLI";

    window.open(
      `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "fetch_settings" }),
      });
      const data = await res.json();
      if (data.success) {
        setDbTemplates(data.templates || []);
        setDbConfigs(data.configs || []);
      }

      try {
        const sRes = await authFetch("/api/admin/reminders", {
          method: "POST",
          body: JSON.stringify({ action: "fetch_status" }),
        });
        const sData = await sRes.json();
        if (sData.success) {
          setWaStatus(sData.data);
        }
      } catch (err) {
        console.warn("Gagal ambil status WhatsApp:", err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveTemplate = async (id: string | null, category: string, content: string) => {
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "save_template", id, category, content }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Template Disimpan" });
        fetchSettings();
      } else {
        throw new Error(data.error || "Gagal menyimpan template");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan template", description: e.message });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Hapus variasi pesan ini?")) return;
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "delete_template", id }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Template Dihapus" });
        fetchSettings();
      } else {
        throw new Error(data.error || "Gagal menghapus template");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus template", description: e.message });
    }
  };

  const updateConfig = async (category: string, schedule: string) => {
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "update_schedule", category, schedule }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Jadwal ${category} Berhasil Diperbarui` });
        fetchSettings();
      } else {
        throw new Error(data.error || "Gagal update jadwal");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal update jadwal", description: e.message });
    }
  };

  const handleTriggerAutomated = async () => {
    if (!confirm("Kirim pengingat otomatis pekanan sekarang ke peserta yang belum mencapai target?")) return;
    setIsTriggering(true);
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "trigger_now" }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Reminder Dipicu", description: "Pengingat otomatis sedang dikirim oleh server." });
        refreshWaLogs();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleTriggerSingle = async (userId: string) => {
    setIsTriggering(true);
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "trigger_now", userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Pesan WA Terkirim!",
          description: "Server telah mengirim pengingat otomatis ke peserta ini.",
        });
        refreshWaLogs();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Kirim", description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!confirm("Buka blokir WhatsApp untuk peserta ini?")) return;
    setIsTriggering(true);
    try {
      const res = await authFetch("/api/admin/reminders", {
        method: "POST",
        body: JSON.stringify({ action: "unblock", userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Blokir Dibuka",
          description: "Sistem akan kembali mengirim pengingat WA ke peserta ini.",
        });
        await refreshUsers();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  if (isUsersLoading || isAttemptsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Memuat Data Progress Hi Mufradat...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-20">
      {/* Header + Clickable KPI Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              Portal Monitoring &amp; Reminder Hi Mufradat
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Monitor Progress Pekanan &amp; Pengingat WhatsApp
          </h1>
          <p className="text-xs text-muted-foreground">
            Pantau ketercapaian target 1 halaman/pekan per batch, kelola variasi pesan robot WA, dan japri peserta yang tertinggal.
          </p>
        </div>

        {/* Clickable KPI Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMainTab("participants");
              setStatusFilter("all");
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "all" && mainTab === "participants"
                ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-white/10 hover:border-primary/40"
            )}
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                Peserta Aktif
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-0.5">
                {kpis.total}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab("participants");
              setStatusFilter("below");
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "below" && mainTab === "participants"
                ? "bg-rose-50 border-rose-400 ring-1 ring-rose-300"
                : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 hover:border-rose-400"
            )}
          >
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-800">
                Di Bawah Target
              </p>
              <p className="text-lg font-black text-rose-700 leading-none mt-0.5">
                {kpis.below}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab("participants");
              setStatusFilter("safe");
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "safe" && mainTab === "participants"
                ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 hover:border-emerald-400"
            )}
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
                Target Aman
              </p>
              <p className="text-lg font-black text-emerald-700 leading-none mt-0.5">
                {kpis.safe}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab("participants");
              setStatusFilter("blocked");
            }}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border text-left transition-all",
              statusFilter === "blocked" && mainTab === "participants"
                ? "bg-amber-50 border-amber-400 ring-1 ring-amber-300"
                : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 hover:border-amber-400"
            )}
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-800">
                WA Terblokir
              </p>
              <p className="text-lg font-black text-amber-700 leading-none mt-0.5">
                {kpis.blocked}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs + Global Reminder Actions */}
      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as "participants" | "logs")}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1 w-full sm:w-fit shadow-sm">
            <TabsTrigger
              value="participants"
              className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2 gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Monitor Peserta ({filteredStats.length})
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-xl font-black text-xs data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2 gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              Log Pengiriman WA ({waLogs?.length || 0})
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManagementDialogOpen(true)}
              className="h-9 text-xs font-bold border-emerald-300 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Atur Template &amp; Jadwal WA
            </Button>
            <Button
              disabled={isTriggering}
              onClick={handleTriggerAutomated}
              size="sm"
              className="h-9 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
            >
              {isTriggering ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Zap className="w-3.5 h-3.5 mr-1.5" />
              )}
              Kirim Pengingat Pekanan
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bold text-xs border-slate-200"
            >
              <Link href="/mufradat">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Halaman Peserta
              </Link>
            </Button>
          </div>
        </div>

        {/* TAB 1: MONITOR PESERTA */}
        <TabsContent value="participants" className="space-y-4 outline-none">
          {/* Filter Panel */}
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all", label: `Semua (${kpis.total})` },
                    { key: "below", label: `Di Bawah Target (${kpis.below})` },
                    { key: "safe", label: `Target Aman (${kpis.safe})` },
                    { key: "blocked", label: `WA Terblokir (${kpis.blocked})` },
                  ] as const
                ).map((st) => (
                  <Button
                    key={st.key}
                    size="sm"
                    variant={statusFilter === st.key ? "default" : "outline"}
                    onClick={() => setStatusFilter(st.key)}
                    className={cn(
                      "text-[11px] font-black rounded-xl h-8",
                      statusFilter === st.key &&
                        "bg-primary hover:bg-[#580e33] text-white"
                    )}
                  >
                    {st.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="w-full sm:w-48 h-9 border-slate-200 bg-slate-50 rounded-xl text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Pilih Batch/Grup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Batch ({groups?.length || 0})</SelectItem>
                    {groups?.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Cari nama, WA, atau email..."
                    className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants Table */}
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableRow>
                      <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">
                        Peserta
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider">
                        Target &amp; Jadwal
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider">
                        Halaman
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider">
                        Status Pekanan
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider">
                        Progres Total
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider">
                        Status WA
                      </TableHead>
                      <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedStats.map(([groupName, members]) => (
                      <Fragment key={groupName}>
                        <TableRow className="bg-slate-50/90 dark:bg-slate-800/40 border-y border-slate-200/70">
                          <TableCell colSpan={7} className="py-2 pl-6">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[11px] uppercase tracking-wider text-primary">
                                {groupName}
                              </span>
                              <Badge variant="outline" className="bg-white text-[10px] h-5 font-bold">
                                {members.length} Peserta
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {members.map((u: any) => (
                          <TableRow key={u.id} className="hover:bg-slate-50/70">
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-slate-200">
                                  <AvatarImage src={u.photo_url || u.photoURL} />
                                  <AvatarFallback className="bg-primary text-white text-xs font-black">
                                    {(u.full_name || u.username || "U")?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {u.full_name || u.username}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {u.whatsapp || u.phone || u.email || "-"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit text-[10px] font-bold">
                                  {u.targetStr}
                                </Badge>
                                <span className="text-[10px] text-slate-500 capitalize font-semibold">
                                  {u.schedule || "harian"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-bold text-xs">{u.totalPassedPages} hlm</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {u.reachedWeeklyTarget ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] font-black">
                                  AMAN
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none text-[10px] font-black">
                                  DI BAWAH
                                </Badge>
                              )}
                              <div className="text-[10px] mt-1 font-semibold text-slate-600">
                                {u.weeklyCount} / {u.userTargetVerses} baris
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Progress value={u.progressPercent} className="h-2 w-24" />
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {u.progressPercent.toFixed(1)}%
                                  </span>
                                </div>
                                {u.lastWaReminder && (
                                  <span className="text-[10px] font-semibold text-emerald-700">
                                    WA:{" "}
                                    {formatDistanceToNow(
                                      new Date(u.lastWaReminder.created_at),
                                      { addSuffix: true, locale: idLocale }
                                    )}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {u.wa_blocked_at ? (
                                <div className="flex flex-col gap-0.5">
                                  <Badge variant="destructive" className="text-[9px] px-1.5 h-5 w-fit">
                                    AUTO BLOCKED
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground">
                                    {u.wa_failed_count}x gagal
                                  </span>
                                </div>
                              ) : u.mufradat_due_date &&
                                new Date(u.mufradat_due_date) < new Date() ? (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] px-1.5 h-5 bg-red-600"
                                >
                                  MASA AKTIF HABIS
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 h-5 text-emerald-700 border-emerald-200 bg-emerald-50/50 font-bold uppercase"
                                >
                                  NORMAL
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {u.wa_blocked_at && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-amber-600 border-amber-200 hover:bg-amber-50 rounded-xl"
                                    onClick={() => handleUnblock(u.id)}
                                    disabled={isTriggering}
                                    title="Buka Blokir WA Otomatis"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                  onClick={() => handleTriggerSingle(u.id)}
                                  disabled={isTriggering || Boolean(u.wa_blocked_at)}
                                  title={
                                    u.wa_blocked_at
                                      ? "User terblokir"
                                      : "Kirim Pengingat Otomatis via Server"
                                  }
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  className={cn(
                                    "rounded-xl h-8 text-[10px] font-black uppercase tracking-tight px-3",
                                    u.reachedWeeklyTarget
                                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      : "bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm"
                                  )}
                                  onClick={() => sendWhatsAppReminder(u)}
                                >
                                  Japri WA
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                    {filteredStats.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-muted-foreground text-xs font-semibold"
                        >
                          Tidak ada peserta yang cocok dengan filter ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LOG PENGIRIMAN WA */}
        <TabsContent value="logs" className="outline-none">
          <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b bg-slate-50/70 flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                  Riwayat Pengiriman WhatsApp Terakhir
                </CardTitle>
                <CardDescription className="text-xs">
                  100 catatan pengiriman terbaru dari tabel <code>whatsapp_logs</code>.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshWaLogs()}
                className="rounded-xl text-xs font-bold h-8"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Muat Ulang
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 text-[10px] font-black uppercase">Waktu</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Penerima</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Provider</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Tipe</TableHead>
                      <TableHead className="pr-6 text-[10px] font-black uppercase">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(waLogs || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                          Belum ada riwayat pengiriman WhatsApp.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (waLogs || []).slice(0, 50).map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="pl-6 text-xs whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.created_at), {
                              addSuffix: true,
                              locale: idLocale,
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{log.recipient}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {log.metadata?.provider || "watzap"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] font-black uppercase",
                                log.status === "sent"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                  : "bg-rose-100 text-rose-800 hover:bg-rose-100"
                              )}
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{log.type}</TableCell>
                          <TableCell className="pr-6 text-xs max-w-xs truncate text-slate-500">
                            {log.metadata?.watzap_response?.message ||
                              log.metadata?.fonnte_response?.reason ||
                              (log.metadata ? JSON.stringify(log.metadata).substring(0, 100) : "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MANAGEMENT DIALOG: TEMPLATES, SCHEDULES & SERVER STATUS */}
      <Dialog open={isManagementDialogOpen} onOpenChange={setIsManagementDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 sm:p-8 bg-emerald-700 text-white rounded-t-3xl">
            <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Settings className="w-6 h-6" /> Manajemen Reminder WhatsApp
            </DialogTitle>
            <DialogDescription className="text-emerald-100 text-xs font-medium mt-1">
              Atur Variasi Pesan, Jadwal Pengiriman Otomatis, dan Uji Kirim WatZap Gateway
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="templates" className="w-full">
            <div className="px-6 sm:px-8 bg-emerald-600/5 border-b">
              <TabsList className="bg-transparent h-12 gap-6">
                <TabsTrigger
                  value="templates"
                  className="data-[state=active]:border-b-4 data-[state=active]:border-emerald-600 rounded-none h-full font-black text-[11px] uppercase tracking-wider text-muted-foreground data-[state=active]:text-emerald-700"
                >
                  Variasi Pesan
                </TabsTrigger>
                <TabsTrigger
                  value="schedules"
                  className="data-[state=active]:border-b-4 data-[state=active]:border-emerald-600 rounded-none h-full font-black text-[11px] uppercase tracking-wider text-muted-foreground data-[state=active]:text-emerald-700"
                >
                  Jadwal Otomatis
                </TabsTrigger>
                <TabsTrigger
                  value="server"
                  className="data-[state=active]:border-b-4 data-[state=active]:border-emerald-600 rounded-none h-full font-black text-[11px] uppercase tracking-wider text-muted-foreground data-[state=active]:text-emerald-700"
                >
                  Status &amp; Test
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="templates" className="p-6 sm:p-8 space-y-5">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-800">
                <p>
                  <strong>Tips:</strong> Gunakan lebih dari 2 variasi pesan per kategori agar pesan dirotasi otomatis dan lebih aman dari deteksi spam WhatsApp.
                </p>
                <p className="mt-1.5">
                  <strong>Placeholder:</strong>{" "}
                  <code className="bg-blue-100 px-1 rounded">{"{salutation}"}</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">{"{name}"}</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">{"{progress}"}</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">{"{targetStr}"}</code>
                </p>
              </div>

              {isLoadingSettings ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {["manual", "harian", "weekend", "pekanan", "monday_spirit"].map((cat) => (
                    <AccordionItem
                      key={cat}
                      value={cat}
                      className="border rounded-2xl px-4 bg-white shadow-sm overflow-hidden"
                    >
                      <AccordionTrigger className="hover:no-underline py-3.5">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-emerald-100 text-emerald-800 border-none font-black text-[10px] uppercase px-3">
                            {cat.replace("_", " ")}
                          </Badge>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            {dbTemplates.filter((t) => t.category === cat).length} Variasi
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 space-y-3">
                        {dbTemplates
                          .filter((t) => t.category === cat)
                          .map((tpl, idx) => (
                            <div
                              key={tpl.id}
                              className="group relative bg-slate-50 p-3.5 rounded-xl border border-slate-200"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => deleteTemplate(tpl.id)}
                                title="Hapus variasi"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                                Variasi #{idx + 1}
                              </label>
                              <Textarea
                                className="text-xs font-medium leading-relaxed bg-white border-slate-200 focus:border-emerald-500 min-h-[80px]"
                                value={tpl.content}
                                onChange={(e) => {
                                  const next = dbTemplates.map((item) =>
                                    item.id === tpl.id
                                      ? { ...item, content: e.target.value }
                                      : item
                                  );
                                  setDbTemplates(next);
                                }}
                                onBlur={() => saveTemplate(tpl.id, cat, tpl.content)}
                              />
                            </div>
                          ))}
                        <Button
                          variant="outline"
                          className="w-full border-dashed border-2 py-5 rounded-xl text-muted-foreground hover:text-emerald-700 hover:border-emerald-300"
                          onClick={() =>
                            saveTemplate(null, cat, "Tulis pesan baru di sini...")
                          }
                        >
                          <Plus className="w-4 h-4 mr-2" /> Tambah Variasi Pesan
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="schedules" className="p-6 sm:p-8 space-y-6">
              {["harian", "weekend", "pekanan", "monday_spirit"].map((cat) => {
                const config = dbConfigs.find((c) => c.category === cat);
                const cron = config?.schedule_cron || "0 14 * * 0";
                const parts = cron.split(" ");

                return (
                  <div key={cat} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-xs uppercase tracking-wider text-primary">
                        Jadwal Reminder {cat.replace("_", " ")}
                      </h3>
                      {config?.updated_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Diupdate: {new Date(config.updated_at).toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">
                          Hari
                        </label>
                        <Select
                          value={parts[4]}
                          onValueChange={(val) =>
                            updateConfig(cat, `${parts[0]} ${parts[1]} * * ${val}`)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs font-bold bg-white">
                            <SelectValue />
                          </SelectTrigger>
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
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">
                          Jam (WIB)
                        </label>
                        <Select
                          value={parts[1]}
                          onValueChange={(val) =>
                            updateConfig(cat, `${parts[0]} ${val} * * ${parts[4]}`)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs font-bold bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, "0")}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">
                          Menit
                        </label>
                        <Select
                          value={parts[0]}
                          onValueChange={(val) =>
                            updateConfig(cat, `${val} ${parts[1]} * * ${parts[4]}`)
                          }
                        >
                          <SelectTrigger className="h-9 text-xs font-bold bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["0", "15", "30", "45"].map((m) => (
                              <SelectItem key={m} value={m}>
                                {m} Menit
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <div className="bg-emerald-50 text-emerald-700 px-3 h-9 rounded-lg flex items-center justify-center w-full text-[10px] font-black uppercase border border-emerald-200">
                          Aktif
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="server" className="p-6 sm:p-8 space-y-6">
              <div className="space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-primary">
                  Test Kirim ke Peserta
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase">Pilih Peserta</Label>
                    <Select value={selectedTestUser} onValueChange={setSelectedTestUser}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Pilih peserta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {userStats.slice(0, 60).map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.username} ({u.whatsapp || u.phone || "-"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase">
                      Pesan Custom (Opsional)
                    </Label>
                    <Input
                      placeholder="Kosongkan untuk pakai template manual..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!selectedTestUser) return;
                    setIsTriggering(true);
                    try {
                      const res = await authFetch("/api/admin/reminders", {
                        method: "POST",
                        body: JSON.stringify({
                          action: "trigger_now",
                          userId: selectedTestUser,
                          customMessage: testMessage,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast({ title: "Pesan Test Terkirim!" });
                        refreshWaLogs();
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Gagal",
                          description: data.error,
                        });
                      }
                    } catch (err: any) {
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: err.message,
                      });
                    } finally {
                      setIsTriggering(false);
                    }
                  }}
                  disabled={!selectedTestUser || isTriggering}
                  className="w-full h-11 bg-primary hover:bg-[#580e33] text-white font-black text-xs uppercase tracking-wider rounded-xl"
                >
                  {isTriggering ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Kirim Pesan Test Sekarang
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-wider text-primary">
                      Status WatZap Gateway
                    </h3>
                    <Badge
                      variant={waStatus?.watzap?.isConnected ? "default" : "outline"}
                      className={cn(
                        "text-[9px] font-black uppercase",
                        waStatus?.watzap?.isConnected
                          ? "bg-emerald-600"
                          : "text-amber-600 border-amber-300"
                      )}
                    >
                      {waStatus?.watzap?.isConnected
                        ? "TERHUBUNG (ONLINE)"
                        : "OFFLINE / BELUM AKTIF"}
                    </Badge>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pengirim:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {waStatus?.watzap?.displayPhoneNumber ||
                          waStatus?.watzap?.senderNumber ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Akun / Paket:</span>
                      <span className="font-bold text-slate-800">
                        {waStatus?.watzap?.accountName || "WatZap User"} (
                        {waStatus?.watzap?.plan || "WatZap Plus"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t">
                      <span className="text-muted-foreground">Dashboard Provider:</span>
                      <a
                        href="https://watzap.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-bold text-xs"
                      >
                        Buka WatZap →
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200">
                  <h3 className="font-black text-xs uppercase tracking-wider text-primary">
                    Limit &amp; Keamanan
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                    <div className="bg-slate-50 p-3.5 rounded-xl border">
                      <div className="text-[10px] text-slate-400 uppercase mb-1">Daily Cap</div>
                      <div className="text-slate-800">200 Pesan</div>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-xl border">
                      <div className="text-[10px] text-slate-400 uppercase mb-1">Delay</div>
                      <div className="text-slate-800">8 Detik / Pesan</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-5 bg-slate-50 rounded-b-3xl border-t">
            <Button
              onClick={() => setIsManagementDialogOpen(false)}
              className="w-full h-11 bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900"
            >
              Selesai &amp; Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminMufradatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <MufradatMonitoringContent />
    </Suspense>
  );
}
