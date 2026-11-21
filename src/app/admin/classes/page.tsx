'use client';

import { useState, useMemo } from "react";
import { useUser, db } from "@/db";
import { useCollection } from "@/db";
import { useUserPermissions } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Plus, 
  Library, 
  Edit, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Users, 
  GraduationCap, 
  Award, 
  UserPlus, 
  Info, 
  ArrowRightLeft, 
  Video,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  BookOpen,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const INITIAL_FORM = {
  programType: "hi_ngaji",
  title: "",
  description: "",
  muallimah: "Admin / Menunggu Assignment",
  musyrifah: "",
  scheduleType: "preset" as "preset" | "custom",
  day: "Senin",
  time: "19:00",
  customSchedule: "Senin - Jumat, 05:30 - 06:30 WIB",
  zoomLink: "",
  zoomPasscode: "",
  whatsappGroupLink: "",
  startDate: "",
  durationWeeks: 4,
  juz: "1",
  level: "Semua Level",
  isPremium: false,
  paymentType: "fixed",
  hasExam: true,
  hasCertificate: true,
  tag: "",
  basePrice: 0,
  quota: 20,
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const PROGRAM_LABELS: Record<string, { label: string; color: string }> = {
  hi_ngaji: { label: "Hi Ngaji", color: "bg-indigo-100 text-indigo-800" },
  tikrar_daily: { label: "Hi Tikrar", color: "bg-blue-100 text-blue-800" },
  hi_mufradat: { label: "Hi Mufradat", color: "bg-emerald-100 text-emerald-800" },
  study_circle: { label: "Study Circle", color: "bg-purple-100 text-purple-800" },
};

export default function AdminClassesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { canDelete } = useUserPermissions(user?.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHalaqah, setEditingHalaqah] = useState<any>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Participant Management State
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [selectedHalaqah, setSelectedHalaqah] = useState<any>(null);
  const [newParticipantId, setNewParticipantId] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  // Participant Transfer State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetParticipant, setTransferTargetParticipant] = useState<any>(null);
  const [transferDestinationHalaqahId, setTransferDestinationHalaqahId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Delete confirmations
  const [deleteHalaqahTarget, setDeleteHalaqahTarget] = useState<any | null>(null);
  const [isDeletingHalaqah, setIsDeletingHalaqah] = useState(false);

  const [removeParticipantTarget, setRemoveParticipantTarget] = useState<{ regId: string; userId: string; name: string } | null>(null);
  const [isRemovingParticipant, setIsRemovingParticipant] = useState(false);

  // Fetch Classes
  const { data: halaqahs, isLoading, refresh: refreshHalaqahs } = useCollection("halaqahs");

  // Fetch ALL active registrations for quota calculations
  const allRegOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: 'in', value: ["active", "pending_verification"] }]
  }), []);
  const { data: allRegistrations, refresh: refreshRegistrations } = useCollection("halaqah_registrations", allRegOptions);

  // Fetch Users for Muallimah & Musyrifah selection
  const { data: allUsers } = useCollection("users");

  const muallimahList = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .filter(u => u.role_id === 'muallimah')
      .map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.full_name || u.username
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers]);

  const musyrifahList = useMemo(() => {
    if (!allUsers) return [];
    return allUsers
      .filter(u => u.role_id === 'musyrifah')
      .map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.full_name || u.username
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers]);

  // Fetch Registrations for Selected Halaqah
  const participantOptions = useMemo(() => ({
    filters: [
      { column: 'halaqah_id', operator: '==', value: selectedHalaqah?.id },
      { column: 'status', operator: '==', value: 'active' }
    ]
  }), [selectedHalaqah?.id]);

  const { data: participants, isLoading: isParticipantsLoading, refresh: refreshCurrentParticipants } = useCollection(
    selectedHalaqah?.id ? "halaqah_registrations" : null, 
    participantOptions
  );

  // Refresh All
  const refreshAll = () => {
    refreshHalaqahs();
    refreshRegistrations();
  };

  // Helper sisa kuota
  const getRegCount = (halaqahId: string) => {
    return allRegistrations?.filter(r => r.halaqah_id === halaqahId).length || 0;
  };

  const getSisaKuota = (halaqah: any) => {
    const regCount = getRegCount(halaqah.id);
    return Math.max(0, (halaqah.quota || 0) - regCount);
  };

  // KPI Calculations
  const kpiStats = useMemo(() => {
    if (!halaqahs) return { total: 0, totalQuota: 0, totalReg: 0, fullCount: 0 };
    const total = halaqahs.length;
    let totalQuota = 0;
    let fullCount = 0;

    halaqahs.forEach(h => {
      totalQuota += (h.quota || 0);
      const regCount = getRegCount(h.id);
      if (h.quota && regCount >= h.quota) fullCount++;
    });

    const totalReg = allRegistrations?.length || 0;

    return { total, totalQuota, totalReg, fullCount };
  }, [halaqahs, allRegistrations]);

  // Filtered halaqahs
  const filteredHalaqahs = useMemo(() => {
    if (!halaqahs) return [];
    return halaqahs.filter(h => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        h.title?.toLowerCase().includes(q) ||
        h.muallimah?.toLowerCase().includes(q) ||
        h.musyrifah?.toLowerCase().includes(q) ||
        h.schedule?.toLowerCase().includes(q) ||
        h.level?.toLowerCase().includes(q);

      const progType = h.program_type || h.programType;
      const matchProgram = filterProgram === 'all' || progType === filterProgram;

      return matchSearch && matchProgram;
    });
  }, [halaqahs, searchQuery, filterProgram]);

  // Calculate End Date
  const calculatedEndDate = useMemo(() => {
    if (!form.startDate || !form.durationWeeks) return null;
    const start = new Date(form.startDate);
    const end = new Date(start.getTime() + (form.durationWeeks * 7 * 24 * 60 * 60 * 1000));
    return end.toISOString().split('T')[0];
  }, [form.startDate, form.durationWeeks]);

  const handleOpenAdd = () => {
    setEditingHalaqah(null);
    setForm(INITIAL_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (h: any) => {
    setEditingHalaqah(h);
    const rawSched = h.schedule || "";
    const isCustom = !DAYS.some(d => rawSched.startsWith(d + ","));
    
    let day = "Senin";
    let time = "19:00";
    if (!isCustom) {
      const parts = rawSched.split(", ");
      day = parts[0] || "Senin";
      time = parts[1] || "19:00";
    }

    setForm({
      programType: h.program_type || h.programType || "hi_ngaji",
      title: h.title,
      description: h.description || "",
      muallimah: h.muallimah || "Admin / Menunggu Assignment",
      musyrifah: h.musyrifah || "",
      scheduleType: isCustom ? "custom" : "preset",
      day: DAYS.includes(day) ? day : "Senin",
      time: time,
      customSchedule: rawSched || "Senin - Jumat, 05:30 - 06:30 WIB",
      zoomLink: h.zoom_link || "",
      zoomPasscode: h.zoom_passcode || "",
      whatsappGroupLink: h.whatsapp_group_link || "",
      startDate: h.start_date ? String(h.start_date).slice(0, 10) : (h.startDate || ""),
      durationWeeks: h.duration_weeks || h.durationWeeks || 4,
      juz: h.juz ? String(h.juz) : "1",
      level: h.level || "Semua Level",
      isPremium: h.is_premium || h.isPremium || false,
      paymentType: h.payment_type || "fixed",
      hasExam: h.has_exam ?? h.hasExam ?? true,
      hasCertificate: h.has_certificate ?? h.hasCertificate ?? true,
      tag: h.tag || "",
      basePrice: h.base_price || h.basePrice || 0,
      quota: h.quota || 20,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.startDate) {
      toast({ variant: "destructive", title: "Mohon lengkapi judul dan tanggal mulai." });
      return;
    }

    let finalSchedule = form.scheduleType === 'custom' 
      ? form.customSchedule.trim() 
      : `${form.day}, ${form.time}`;

    if (form.programType === 'hi_mufradat' && form.scheduleType === 'preset') {
      finalSchedule = "Senin - Jumat (Toleransi sd Ahad)";
    }

    const finalData = {
      program_type: form.programType,
      title: form.title.trim(),
      muallimah: form.muallimah,
      musyrifah: form.musyrifah.trim(),
      description: form.description.trim(),
      schedule: finalSchedule,
      zoom_link: form.zoomLink.trim() || null,
      zoom_passcode: form.zoomPasscode.trim() || null,
      whatsapp_group_link: form.whatsappGroupLink.trim() || null,
      start_date: form.startDate,
      end_date: calculatedEndDate,
      duration_weeks: Number(form.durationWeeks) || 4,
      juz: form.programType === 'hi_ngaji' ? null : form.juz,
      level: form.level,
      is_premium: form.isPremium,
      has_exam: form.hasExam,
      has_certificate: form.hasCertificate,
      tag: form.tag.trim(),
      base_price: Number(form.basePrice) || 0,
      quota: Number(form.quota) || 20,
      updated_at: new Date().toISOString()
    };

    setIsSaving(true);
    try {
      if (editingHalaqah) {
        const { error } = await db.from("halaqahs").update(finalData).eq('id', editingHalaqah.id);
        if (error) throw error;
        toast({ title: "Kelas Diperbarui! ✅" });
      } else {
        const { error } = await db.from("halaqahs").insert({
          ...finalData,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        toast({ title: "Kelas Berhasil Ditambahkan! 🎉" });
      }
      await refreshHalaqahs();
      setIsDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Gagal menyimpan data",
        description: e.message || "Pastikan Ukhti memiliki izin akses Admin/SuperAdmin."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantId || !selectedHalaqah) return;

    const userToAdd = allUsers?.find(u => u.id === newParticipantId);
    if (!userToAdd) return;

    if (participants?.find(p => p.user_id === newParticipantId)) {
      toast({ variant: "destructive", title: "Thalibah sudah terdaftar di kelas ini." });
      return;
    }

    setIsAddingParticipant(true);
    try {
      const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Create Registration Record
      const { error: regError } = await db.from("halaqah_registrations").insert({
        id: regId,
        user_id: newParticipantId,
        user_name: userToAdd.full_name || userToAdd.username || userToAdd.email,
        user_email: userToAdd.email,
        whatsapp: userToAdd.whatsapp || userToAdd.phone || "",
        halaqah_id: selectedHalaqah.id,
        halaqah_title: selectedHalaqah.title,
        status: "active",
        is_paid: false,
        created_at: new Date().toISOString(),
        verified_at: new Date().toISOString()
      });

      if (regError) throw regError;

      // 2. Update User Profile followed_halaqahs
      const currentFollowed = userToAdd.followed_halaqahs || [];
      if (!currentFollowed.includes(selectedHalaqah.id)) {
        await db.from("users").update({
          followed_halaqahs: [...currentFollowed, selectedHalaqah.id],
          updated_at: new Date().toISOString()
        }).eq('id', newParticipantId);
      }

      toast({ title: "Peserta Berhasil Ditambahkan! ✅" });
      setNewParticipantId("");
      refreshRegistrations();
      if (refreshCurrentParticipants) refreshCurrentParticipants();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menambah peserta", description: e.message });
    } finally {
      setIsAddingParticipant(false);
    }
  };

  const handleConfirmRemoveParticipant = async () => {
    if (!removeParticipantTarget || !selectedHalaqah) return;

    setIsRemovingParticipant(true);
    try {
      // 1. Delete from registrations
      const { error: regError } = await db
        .from("halaqah_registrations")
        .delete()
        .eq('id', removeParticipantTarget.regId);

      if (regError) throw regError;

      // 2. Remove class from followed_halaqahs in users table (BUG FIX)
      if (removeParticipantTarget.userId) {
        const { data: uData } = await db
          .from("users")
          .select("followed_halaqahs")
          .eq('id', removeParticipantTarget.userId)
          .maybeSingle();

        if (uData && Array.isArray(uData.followed_halaqahs)) {
          const updatedFollowed = uData.followed_halaqahs.filter((id: string) => id !== selectedHalaqah.id);
          await db.from("users").update({
            followed_halaqahs: updatedFollowed,
            updated_at: new Date().toISOString()
          }).eq('id', removeParticipantTarget.userId);
        }
      }

      toast({ 
        title: "Peserta Dikeluarkan", 
        description: `${removeParticipantTarget.name} telah dikeluarkan dari ${selectedHalaqah.title}.` 
      });
      setRemoveParticipantTarget(null);
      refreshRegistrations();
      if (refreshCurrentParticipants) refreshCurrentParticipants();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal mengeluarkan peserta", description: e.message });
    } finally {
      setIsRemovingParticipant(false);
    }
  };

  const handleTransferParticipant = async () => {
    if (!transferTargetParticipant || !transferDestinationHalaqahId || !selectedHalaqah) return;

    const destHalaqah = halaqahs?.find(h => h.id === transferDestinationHalaqahId);
    if (!destHalaqah) return;

    // Quota Check
    const totalRegDest = getRegCount(destHalaqah.id);
    const sisa = Math.max(0, (destHalaqah.quota || 0) - totalRegDest);
    
    if (sisa <= 0) {
      toast({ variant: "destructive", title: "Gagal Pindah", description: "Kuota kelas tujuan sudah penuh." });
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Update Registration Record
      const { error: regError } = await db
        .from("halaqah_registrations")
        .update({
          halaqah_id: destHalaqah.id,
          halaqah_title: destHalaqah.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferTargetParticipant.id);

      if (regError) throw regError;

      // 2. Update User Profile followed_halaqahs
      const { data: userToUpdate } = await db
        .from("users")
        .select("followed_halaqahs")
        .eq('id', transferTargetParticipant.user_id)
        .maybeSingle();

      if (userToUpdate) {
        const currentFollowed = userToUpdate.followed_halaqahs || [];
        const updatedFollowed = currentFollowed.filter((id: string) => id !== selectedHalaqah.id);
        if (!updatedFollowed.includes(destHalaqah.id)) {
          updatedFollowed.push(destHalaqah.id);
        }

        await db
          .from("users")
          .update({
            followed_halaqahs: updatedFollowed,
            updated_at: new Date().toISOString()
          })
          .eq('id', transferTargetParticipant.user_id);
      }

      toast({ 
        title: "Peserta Berhasil Dipindahkan! 🔄", 
        description: `${transferTargetParticipant.user_name} pindah ke ${destHalaqah.title}.` 
      });
      setIsTransferOpen(false);
      setTransferTargetParticipant(null);
      setTransferDestinationHalaqahId("");
      refreshRegistrations();
      if (refreshCurrentParticipants) refreshCurrentParticipants();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal memindahkan peserta", description: e.message });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleConfirmDeleteHalaqah = async () => {
    if (!deleteHalaqahTarget) return;

    setIsDeletingHalaqah(true);
    try {
      const { error } = await db.from("halaqahs").delete().eq('id', deleteHalaqahTarget.id);
      if (error) throw error;
      toast({ title: "Kelas Dihapus", description: `Kelas ${deleteHalaqahTarget.title} telah dihapus.` });
      setDeleteHalaqahTarget(null);
      await refreshHalaqahs();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus kelas", description: e.message });
    } finally {
      setIsDeletingHalaqah(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin!", description: `${label} berhasil disalin ke clipboard.` });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Katalog Kelas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-28">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/admin" className="hover:text-[#6D123F] font-bold">Dashboard Admin</Link>
            <span>/</span>
            <span className="text-[#6D123F] font-bold">Katalog Kelas & Halaqah</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-slate-900 flex items-center gap-2.5">
            <Library className="w-7 h-7 text-[#6D123F]" />
            Katalog Kelas & Halaqah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola jadwal sesi belajar, pengajar (Mu&apos;allimah / Musyrifah), kuota, link Zoom, dan anggota peserta.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button 
            onClick={refreshAll} 
            variant="outline" 
            size="sm" 
            className="rounded-xl gap-1.5 font-bold text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Segarkan
          </Button>

          <Button 
            onClick={handleOpenAdd}
            className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold gap-2 rounded-xl text-xs h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Buat Kelas Baru
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border bg-white border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Kelas</span>
            <Library className="w-4 h-4 text-[#6D123F]" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{kpiStats.total}</p>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Total Kuota</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-900 mt-1">{kpiStats.totalQuota} <span className="text-xs font-normal text-slate-400">kursi</span></p>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Thalibah Terdaftar</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 mt-1">{kpiStats.totalReg}</p>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Kelas Penuh</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">{kpiStats.fullCount} <span className="text-xs font-normal text-slate-400">kelas</span></p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari kelas (judul, pengajar, jadwal, level)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select 
            value={filterProgram} 
            onValueChange={setFilterProgram}
          >
            <SelectTrigger className="w-[180px] h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="hi_ngaji">Hi Ngaji</SelectItem>
              <SelectItem value="tikrar_daily">Hi Tikrar</SelectItem>
              <SelectItem value="hi_mufradat">Hi Mufradat</SelectItem>
              <SelectItem value="study_circle">Study Circle</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || filterProgram !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(''); setFilterProgram('all'); }}
              className="text-xs text-rose-600 font-bold h-10 px-2.5 rounded-xl hover:bg-rose-50"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      {filteredHalaqahs.length === 0 ? (
        <Card className="border-2 border-dashed rounded-3xl py-16 bg-white">
          <CardContent className="flex flex-col items-center justify-center text-center gap-2">
            <Library className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-700">Tidak ada kelas ditemukan</p>
            <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau tambahkan kelas baru.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHalaqahs.map((halaqah) => {
            const regCount = getRegCount(halaqah.id);
            const sisa = Math.max(0, (halaqah.quota || 0) - regCount);
            const isFull = (halaqah.quota || 0) > 0 && sisa === 0;
            const progInfo = PROGRAM_LABELS[halaqah.program_type || halaqah.programType] || { label: "Halaqah", color: "bg-slate-100 text-slate-800" };

            return (
              <Card key={halaqah.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                <div className="p-5 space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={cn("text-[9px] font-black border-none uppercase px-2 py-0.5", progInfo.color)}>
                      {progInfo.label}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {halaqah.is_premium ? (
                        <Badge className="bg-amber-100 text-amber-800 text-[9px] font-black border-none">
                          BERBAYAR
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-black border-none">
                          GRATIS
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold",
                        isFull ? "border-rose-300 text-rose-600 bg-rose-50" : "border-slate-200 text-slate-600"
                      )}>
                        {regCount}/{halaqah.quota || 20} Peserta
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{halaqah.title}</h3>
                    {halaqah.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{halaqah.description}</p>
                    )}
                  </div>

                  {/* Info List */}
                  <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate"><strong>Pengajar:</strong> {halaqah.muallimah || "Belum ditugaskan"}</span>
                    </div>
                    {halaqah.musyrifah && (
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate"><strong>Musyrifah:</strong> {halaqah.musyrifah}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate"><strong>Jadwal:</strong> {halaqah.schedule || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span><strong>Mulai:</strong> {halaqah.start_date ? format(new Date(halaqah.start_date), 'dd MMM yyyy') : "-"}</span>
                    </div>
                  </div>

                  {/* Links Quick Actions */}
                  {(halaqah.whatsapp_group_link || halaqah.zoom_link) && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                      {halaqah.whatsapp_group_link && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(halaqah.whatsapp_group_link, "Link Grup WA")}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> Link WA
                        </button>
                      )}
                      {halaqah.zoom_link && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(halaqah.zoom_link, "Link Zoom")}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Video className="w-3 h-3" /> Link Zoom
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-white gap-1.5"
                    onClick={() => { setSelectedHalaqah(halaqah); setIsParticipantsOpen(true); }}
                  >
                    <Users className="w-3.5 h-3.5 text-[#6D123F]" />
                    Peserta ({regCount})
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200 rounded-lg"
                      onClick={() => handleOpenEdit(halaqah)}
                      title="Edit Kelas"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>

                    {canDelete() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                        onClick={() => setDeleteHalaqahTarget(halaqah)}
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CLASS DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Library className="w-5 h-5 text-[#6D123F]" />
              {editingHalaqah ? "Edit Data Kelas" : "Tambah Kelas Baru"}
            </DialogTitle>
            <DialogDescription>
              Atur detail program, mu&apos;allimah, jadwal belajar, dan kuota penerimaan santriwati.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Row 1: Program & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Kategori Program</Label>
                <Select 
                  value={form.programType} 
                  onValueChange={(val) => setForm({ ...form, programType: val })}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hi_ngaji">Hi Ngaji</SelectItem>
                    <SelectItem value="tikrar_daily">Hi Tikrar</SelectItem>
                    <SelectItem value="hi_mufradat">Hi Mufradat</SelectItem>
                    <SelectItem value="study_circle">Study Circle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Judul Kelas *</Label>
                <Input
                  placeholder="Contoh: Tahsin & Tajwid Juz 30 - Angkatan 1"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-600">Deskripsi Singkat</Label>
              <Textarea
                placeholder="Penjelasan ringkas target capaian, kurikulum, atau panduan belajar..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            {/* Row 3: Muallimah & Musyrifah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Mu&apos;allimah (Pengajar Utama)</Label>
                <Select 
                  value={form.muallimah} 
                  onValueChange={(val) => setForm({ ...form, muallimah: val })}
                >
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih Mu'allimah" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin / Menunggu Assignment">Admin / Menunggu Assignment</SelectItem>
                    {muallimahList.map((m) => (
                      <SelectItem key={m.id} value={m.displayName}>{m.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Musyrifah (Pendamping)</Label>
                <Input
                  placeholder="Nama musyrifah pendamping..."
                  value={form.musyrifah}
                  onChange={(e) => setForm({ ...form, musyrifah: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Row 4: Schedule */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-700">Format Jadwal</Label>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[11px] font-bold", form.scheduleType === 'preset' ? "text-[#6D123F]" : "text-slate-400")}>Pilihan Hari</span>
                  <Switch
                    checked={form.scheduleType === 'custom'}
                    onCheckedChange={(checked) => setForm({ ...form, scheduleType: checked ? 'custom' : 'preset' })}
                  />
                  <span className={cn("text-[11px] font-bold", form.scheduleType === 'custom' ? "text-[#6D123F]" : "text-slate-400")}>Jadwal Khusus</span>
                </div>
              </div>

              {form.scheduleType === 'preset' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Hari Pertemuan</Label>
                    <Select value={form.day} onValueChange={(val) => setForm({ ...form, day: val })}>
                      <SelectTrigger className="rounded-xl bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Waktu (WIB)</Label>
                    <Input
                      placeholder="19:00"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="rounded-xl bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Teks Jadwal Lengkap</Label>
                  <Input
                    placeholder="Contoh: Senin - Jumat, 05:30 - 06:30 WIB"
                    value={form.customSchedule}
                    onChange={(e) => setForm({ ...form, customSchedule: e.target.value })}
                    className="rounded-xl bg-white"
                  />
                </div>
              )}
            </div>

            {/* Row 5: Start Date, Duration & Quota */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Durasi (Pekan)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.durationWeeks}
                  onChange={(e) => setForm({ ...form, durationWeeks: parseInt(e.target.value) || 4 })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Maks Kuota</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quota}
                  onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 20 })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Row 6: Online Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Link Zoom / Google Meet</Label>
                <Input
                  placeholder="https://zoom.us/j/..."
                  value={form.zoomLink}
                  onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Link Grup WhatsApp</Label>
                <Input
                  placeholder="https://chat.whatsapp.com/..."
                  value={form.whatsappGroupLink}
                  onChange={(e) => setForm({ ...form, whatsappGroupLink: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Row 7: Pricing & Flags */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-800">Kelas Berbayar (Infaq Masuk)</Label>
                <p className="text-[10px] text-slate-500">Aktifkan jika pendaftar perlu transfer infaq pendaftaran.</p>
              </div>
              <Switch
                checked={form.isPremium}
                onCheckedChange={(checked) => setForm({ ...form, isPremium: checked })}
              />
            </div>

            {form.isPremium && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Nominal Infaq Dasar (Rp)</Label>
                <Input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: parseInt(e.target.value) || 0 })}
                  className="rounded-xl font-bold text-[#6D123F]"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold gap-2 h-11 rounded-xl"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {editingHalaqah ? "Simpan Perubahan Kelas" : "Buat Kelas Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PARTICIPANTS MANAGEMENT MODAL */}
      <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-[#6D123F]" />
              Daftar Peserta: {selectedHalaqah?.title}
            </DialogTitle>
            <DialogDescription>
              Kelola thalibah yang aktif dalam kelas ini, tambah peserta manual, atau pindahkan ke kelas lain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Add Participant Manual Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-700">Tambah Thalibah Manual</Label>
              <div className="flex gap-2">
                <Select value={newParticipantId} onValueChange={setNewParticipantId}>
                  <SelectTrigger className="flex-1 bg-white rounded-xl text-xs">
                    <SelectValue placeholder="Pilih thalibah dari database..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allUsers?.filter(u => u.role_id === 'learner' || !u.role_id).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.username} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleAddParticipant}
                  disabled={!newParticipantId || isAddingParticipant}
                  className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold text-xs rounded-xl px-4"
                >
                  {isAddingParticipant ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                  Tambah
                </Button>
              </div>
            </div>

            {/* Participants List */}
            {isParticipantsLoading ? (
              <div className="py-12 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-[#6D123F]" /></div>
            ) : (!participants || participants.length === 0) ? (
              <div className="py-12 text-center text-slate-400 text-xs italic border-2 border-dashed rounded-xl">
                Belum ada thalibah yang terdaftar di kelas ini.
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{p.user_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.user_email} • {p.whatsapp || '-'}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-[11px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50 rounded-lg gap-1"
                        onClick={() => {
                          setTransferTargetParticipant(p);
                          setIsTransferOpen(true);
                        }}
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Pindah Kelas
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                        onClick={() => setRemoveParticipantTarget({ regId: p.id, userId: p.user_id, name: p.user_name })}
                        title="Keluarkan dari kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full text-xs font-bold rounded-xl" onClick={() => setIsParticipantsOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRANSFER PARTICIPANT MODAL */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Pindahkan Peserta ke Kelas Lain
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pindahkan <strong>{transferTargetParticipant?.user_name}</strong> dari {selectedHalaqah?.title}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label className="text-xs font-bold text-slate-700">Pilih Kelas Tujuan</Label>
            <Select 
              value={transferDestinationHalaqahId} 
              onValueChange={setTransferDestinationHalaqahId}
            >
              <SelectTrigger className="rounded-xl text-xs"><SelectValue placeholder="Pilih kelas tujuan..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {halaqahs?.filter(h => h.id !== selectedHalaqah?.id).map((h) => {
                  const sisa = getSisaKuota(h);
                  return (
                    <SelectItem key={h.id} value={h.id} disabled={sisa <= 0}>
                      {h.title} (Sisa {sisa} kuota)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" className="flex-1 text-xs font-bold rounded-xl" onClick={() => setIsTransferOpen(false)}>
              Batal
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
              onClick={handleTransferParticipant}
              disabled={!transferDestinationHalaqahId || isTransferring}
            >
              {isTransferring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Konfirmasi Pindah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE HALAQAH */}
      <AlertDialog open={!!deleteHalaqahTarget} onOpenChange={(open) => !open && setDeleteHalaqahTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> Hapus Kelas?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kelas <strong>{deleteHalaqahTarget?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingHalaqah}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteHalaqah}
              disabled={isDeletingHalaqah}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeletingHalaqah ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Hapus Kelas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRM REMOVE PARTICIPANT */}
      <AlertDialog open={!!removeParticipantTarget} onOpenChange={(open) => !open && setRemoveParticipantTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> Keluarkan Thalibah dari Kelas?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hapus hak akses kelas untuk <strong>{removeParticipantTarget?.name}</strong> dari <strong>{selectedHalaqah?.title}</strong>? Kelas ini akan dihilangkan dari profil thalibah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingParticipant}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveParticipant}
              disabled={isRemovingParticipant}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isRemovingParticipant ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Keluarkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
