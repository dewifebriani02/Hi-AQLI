
'use client';

import { useState, useMemo } from "react";
import { useUser, supabase } from "@/supabase";
import { useCollection, useDoc } from "@/supabase/db";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/supabase/non-blocking-updates";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Plus, Library, Edit, Trash2, ArrowLeft, Loader2, CheckCircle2, User, Calendar, Clock, Users, Timer, GraduationCap, Award, UserPlus, X, Info, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INITIAL_FORM = {
  programType: "hi_ngaji",
  title: "",
  description: "",
  muallimah: "Admin / Menunggu Assignment",
  musyrifah: "",
  day: "Senin",
  time: "19:00",
  startDate: "",
  durationWeeks: 4,
  juz: "1",
  level: "Semua Level",
  isPremium: false,
  paymentType: "fixed", // 'fixed' or 'selectable' 
  hasExam: true,
  hasCertificate: true,
  tag: "",
  basePrice: 0,
  quota: 20,
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function AdminClassesPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHalaqah, setEditingHalaqah] = useState<any>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Participant Management State
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [selectedHalaqah, setSelectedHalaqah] = useState<any>(null);
  const [newParticipantId, setNewParticipantId] = useState("");

  // Participant Transfer State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetParticipant, setTransferTargetParticipant] = useState<any>(null);
  const [transferDestinationHalaqahId, setTransferDestinationHalaqahId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);


  // Fetch Classes
  const { data: halaqahs, isLoading } = useCollection("halaqahs");

  // Fetch ALL registrations to calculate remaining quota for each card
  const allRegOptions = useMemo(() => ({
    filters: [{ column: 'status', operator: 'in', value: ["active", "pending_verification"] }]
  }), []);

  const { data: allRegistrations } = useCollection("halaqah_registrations", allRegOptions);

  // Fetch Users for Selection
  const { data: allUsers } = useCollection("users");

  // Fetch Registrations for Selected Halaqah (Detailed view in Dialog)
  const participantOptions = useMemo(() => ({
    filters: [
      { column: 'halaqah_id', operator: '==', value: selectedHalaqah?.id },
      { column: 'status', operator: '==', value: 'active' }
    ]
  }), [selectedHalaqah?.id]);

  const { data: participants, isLoading: isParticipantsLoading } = useCollection(
    selectedHalaqah?.id ? "halaqah_registrations" : null, 
    participantOptions
  );

  // Helper to get sisa kuota for a specific class
  const getSisaKuota = (halaqah: any) => {
    const totalReg = allRegistrations?.filter(r => r.halaqah_id === halaqah.id).length || 0;
    return Math.max(0, (halaqah.quota || 0) - totalReg);
  };

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
    const [day, time] = (h.schedule || "Senin, 19:00").split(", ");
    setForm({
      programType: h.program_type || h.programType || "hi_ngaji",
      title: h.title,
      description: h.description || "",
      muallimah: h.muallimah || "Admin / Menunggu Assignment",
      musyrifah: h.musyrifah || "",
      day: day || "Senin",
      time: time || "19:00",
      startDate: h.start_date || h.startDate || "",
      durationWeeks: h.duration_weeks || h.durationWeeks || 4,
      juz: h.juz || "1",
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

    let finalSchedule = `${form.day}, ${form.time}`;
    if (form.programType === 'hi_mufradat' || form.programType === 'tikrar_daily') {
      finalSchedule = "Senin - Jumat (Toleransi sd Ahad)";
    }

    const finalData = {
      program_type: form.programType,
      title: form.title,
      muallimah: form.muallimah,
      musyrifah: form.musyrifah,
      description: form.description,
      schedule: finalSchedule,
      start_date: form.startDate,
      end_date: calculatedEndDate,
      duration_weeks: form.durationWeeks,
      juz: form.programType === 'hi_ngaji' ? null : form.juz,
      level: form.level,
      is_premium: form.isPremium,
      has_exam: form.hasExam,
      has_certificate: form.hasCertificate,
      tag: form.tag,
      base_price: form.basePrice,
      quota: form.quota
    };

    setIsSaving(true);
    try {
      if (editingHalaqah) {
        const { error } = await supabase.from("halaqahs").update(finalData).eq('id', editingHalaqah.id);
        if (error) throw error;
        toast({ title: "Kelas Diperbarui" });
      } else {
        const { error } = await supabase.from("halaqahs").insert({
          ...finalData,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        toast({ title: "Kelas Berhasil Ditambahkan" });
      }
      setIsDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Gagal menyimpan data",
        description: e.message || "Pastikan Ukhti memiliki izin akses (Admin/SuperAdmin)."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantId || !selectedHalaqah) return;

    const userToAdd = allUsers?.find(u => u.id === newParticipantId);
    if (!userToAdd) return;

    // Check if already in class
    if (participants?.find(p => p.user_id === newParticipantId)) {
      toast({ variant: "destructive", title: "User sudah ada di kelas ini." });
      return;
    }

    try {
      const regId = `manual_${selectedHalaqah.id}_${newParticipantId}`;

      // 1. Create Registration Record
      const { error: regError } = await supabase.from("halaqah_registrations").upsert({
        id: regId,
        user_id: newParticipantId,
        user_name: userToAdd.username || userToAdd.email,
        user_email: userToAdd.email,
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
        const { error: userError } = await supabase.from("users").update({
          followed_halaqahs: [...currentFollowed, selectedHalaqah.id],
          updated_at: new Date().toISOString()
        }).eq('id', newParticipantId);

        if (userError) throw userError;
      }

      toast({ title: "Peserta Berhasil Ditambahkan" });
      setNewParticipantId("");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menambahkan peserta." });
    }
  };

  const handleRemoveParticipant = async (regId: string, userId: string) => {
    if (!confirm("Hapus akses kelas Thalibah ini?")) return;
    try {
      const { error } = await supabase.from("halaqah_registrations").delete().eq('id', regId);
      if (error) throw error;
      toast({ title: "Peserta Dihapus dari Kelas" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menghapus peserta." });
    }
  };

  const handleTransferParticipant = async () => {
    if (!transferTargetParticipant || !transferDestinationHalaqahId || !selectedHalaqah) return;

    const destHalaqah = halaqahs?.find(h => h.id === transferDestinationHalaqahId);
    if (!destHalaqah) return;

    // Quota Check
    const totalRegDest = allRegistrations?.filter(r => r.halaqah_id === destHalaqah.id).length || 0;
    const sisa = Math.max(0, (destHalaqah.quota || 0) - totalRegDest);
    
    if (sisa <= 0) {
      toast({ variant: "destructive", title: "Gagal Pindah", description: "Kuota kelas tujuan sudah penuh." });
      return;
    }

    setIsTransferring(true);
    try {
      // 1. Update Registration Record
      const { error: regError } = await supabase
        .from("halaqah_registrations")
        .update({
          halaqah_id: destHalaqah.id,
          halaqah_title: destHalaqah.title,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferTargetParticipant.id);

      if (regError) throw regError;

      // 2. Update User Profile followed_halaqahs
      const { data: userToUpdate, error: fetchErr } = await supabase
        .from("users")
        .select("followed_halaqahs")
        .eq('id', transferTargetParticipant.user_id)
        .single();

      if (fetchErr) throw fetchErr;

      if (userToUpdate) {
        const currentFollowed = userToUpdate.followed_halaqahs || [];
        // Remove old ID, add new ID
        const updatedFollowed = currentFollowed.filter((id: string) => id !== selectedHalaqah.id);
        if (!updatedFollowed.includes(destHalaqah.id)) {
          updatedFollowed.push(destHalaqah.id);
        }

        const { error: userError } = await supabase
          .from("users")
          .update({
            followed_halaqahs: updatedFollowed,
            updated_at: new Date().toISOString()
          })
          .eq('id', transferTargetParticipant.user_id);

        if (userError) throw userError;
      }

      toast({ 
        title: "Peserta Berhasil Dipindahkan", 
        description: `${transferTargetParticipant.user_name} pindah ke ${destHalaqah.title}` 
      });
      setIsTransferOpen(false);
      setTransferTargetParticipant(null);
      setTransferDestinationHalaqahId("");
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal memindahkan peserta", description: e.message });
    } finally {
      setIsTransferring(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kelas ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const { error } = await supabase.from("halaqahs").delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Kelas Dihapus" });
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menghapus kelas." });
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Katalog...</p></div>;

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-32 px-1">
      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Katalog Kelas</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Manajemen Program HI AQLI</p>
          </div>
        </div>
        <Button onClick={handleOpenAdd} className="bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
          <Plus className="w-4 h-4" /> TAMBAH KELAS
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!halaqahs || halaqahs.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl bg-muted/5">
            <Library className="w-12 h-12 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground italic">Belum ada kelas yang terdaftar.</p>
          </div>
        ) : (
          halaqahs.map((h) => {
            const sisa = getSisaKuota(h);
            const total = h.quota || 0;
            return (
              <Card key={h.id} className={cn("border-none shadow-sm group overflow-hidden border-l-4", h.isPremium ? "border-l-[#800000]" : "border-l-blue-500")}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm uppercase text-[#800000]">{h.title}</h3>
                        <Badge className="bg-slate-800 text-white text-[7px] font-black h-4 uppercase">{ (h.program_type || h.programType) === 'hi_mufradat' ? 'HI MUFRADAT' : (h.program_type || h.programType) === 'tikrar_daily' ? 'TIKRAR DAILY' : 'HI NGAJI'}</Badge>
                        {(h.is_premium || h.isPremium) && <Badge className="bg-[#800000] text-white text-[7px] font-black h-4">PREMIUM</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenEdit(h)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/5" onClick={() => handleDelete(h.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5"
                      onClick={() => { setSelectedHalaqah(h); setIsParticipantsOpen(true); }}
                    >
                      <Users className="w-3 h-3" /> Kelola Peserta
                    </Button>
                    <Badge variant="secondary" className={cn("text-[8px] font-black h-4 border uppercase gap-1", sisa === 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                      <Info className="w-2.5 h-2.5" /> Sisa Kuota: {sisa} / {total}
                    </Badge>
                    {h.hasExam && <Badge variant="outline" className="text-[8px] border-emerald-200 text-emerald-700 bg-emerald-50 h-4">UJIAN</Badge>}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 mt-auto">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{h.level}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Timer className="w-2.5 h-2.5" /> {h.durationWeeks || '-'} Pekan</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                        <Calendar className="w-3 h-3 text-[#800000]" />
                        { (h.start_date || h.startDate) ? new Date(h.start_date || h.startDate).toLocaleDateString('id-ID') : '-'} s/d { (h.end_date || h.endDate) ? new Date(h.end_date || h.endDate).toLocaleDateString('id-ID') : '-'}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                        <Clock className="w-3 h-3 text-[#800000]" />
                        {h.schedule}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Participants Management Dialog */}
      <Dialog open={isParticipantsOpen} onOpenChange={setIsParticipantsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#800000]" />
              Peserta: {selectedHalaqah?.title}
            </DialogTitle>
            <DialogDescription>Kelola Thalibah yang terdaftar secara aktif di kelas ini.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Add Participant Section */}
            <div className="space-y-2 p-4 bg-muted/30 rounded-xl border-2 border-dashed">
              <Label className="text-[10px] font-black uppercase">Tambah Peserta Baru</Label>
              <div className="flex gap-2">
                <Select value={newParticipantId} onValueChange={setNewParticipantId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pilih thalibah..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers?.filter(u => u.role_id === 'learner').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.username || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddParticipant} className="bg-emerald-600 hover:bg-emerald-700" size="icon">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Current List Section */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Daftar Aktif ({participants?.length || 0})</h4>
              <div className="divide-y border rounded-xl overflow-hidden bg-white">
                {isParticipantsLoading ? (
                  <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : !participants || participants.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground italic">Belum ada peserta terdaftar.</div>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {p.user_name?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{p.user_name}</span>
                          <span className="text-[9px] text-muted-foreground">{p.user_email}</span>
                        </div>
                      </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                            onClick={() => {
                              setTransferTargetParticipant(p);
                              setIsTransferOpen(true);
                            }}
                            title="Pindah Kelas"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleRemoveParticipant(p.id, p.user_id)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] md:max-h-[85vh] flex flex-col overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-[#800000]" />
              {editingHalaqah ? "Edit Kelas" : "Tambah Kelas Baru"}
            </DialogTitle>
            <DialogDescription>Lengkapi detail operasional program Sahabat AQLI.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 overflow-y-auto flex-1 min-h-0 pr-2">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-[#800000]">Pilih Program</Label>
              <Select value={form.programType} onValueChange={(v) => setForm({ ...form, programType: v, durationWeeks: v === 'hi_mufradat' ? 1 : v === 'tikrar_daily' ? 1 : 4 })}>
                <SelectTrigger className="bg-muted/30 border-2 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hi_ngaji">Hi Ngaji (Reguler)</SelectItem>
                  <SelectItem value="hi_mufradat">Hi Mufradat (Target Hafalan)</SelectItem>
                  <SelectItem value="tikrar_daily">Tikrar Daily / Hi Tikrar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Mu'allimah</Label>
                <Input value={form.muallimah} onChange={(e) => setForm({ ...form, muallimah: e.target.value })} placeholder="Nama Mu'allimah" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Musyrifah</Label>
                <Input value={form.musyrifah} onChange={(e) => setForm({ ...form, musyrifah: e.target.value })} placeholder="Nama Musyrifah (Opsional)" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={cn("space-y-2", form.programType === 'hi_mufradat' && "sm:col-span-2")}>
                <Label className="text-xs font-black uppercase">Judul Kelas</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Tahsin Dasar Al-Fatihah" />
              </div>
              {form.programType !== 'hi_mufradat' && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">{form.programType === 'tikrar_daily' ? 'Level Bacaan' : 'Level Program'}</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {form.programType === 'tikrar_daily' ? (
                        <>
                          <SelectItem value="Semua Level">Semua Level</SelectItem>
                          <SelectItem value="Level Bacaan">Level Bacaan</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Semua Level">Semua Level</SelectItem>
                          <SelectItem value="Pemula">Pemula</SelectItem>
                          <SelectItem value="Menengah">Menengah</SelectItem>
                          <SelectItem value="Lanjutan">Lanjutan</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Deskripsi Singkat</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-20" placeholder="Jelaskan apa yang akan dipelajari..." />
            </div>

            {form.programType === 'hi_ngaji' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Hari Belajar</Label>
                  <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Jam Belajar</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="pl-10" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 rounded-xl bg-[#800000]/5 border-2 border-dashed border-[#800000]/20">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-[#800000]/70 flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3" /> Jadwal Pengerjaan Fleksibel (Target Based)
                  </Label>
                  <p className="text-sm font-black text-[#800000]">Senin - Jumat <span className="text-[10px] font-bold text-muted-foreground ml-1">(Toleransi & Murojaah s/d Ahad)</span></p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Target Juz</Label>
                  <Select value={form.juz} onValueChange={(v) => setForm({ ...form, juz: v })}>
                    <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Pilih Juz" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => (
                        <SelectItem key={juz} value={juz.toString()}>Juz {juz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Mulai Belajar</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">{form.programType === 'hi_ngaji' ? 'Durasi (Pekan)' : 'Target Hafalan satu Halaman'}</Label>
                {form.programType === 'hi_ngaji' ? (
                  <div className="relative">
                    <Timer className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="number" min="1" value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: parseInt(e.target.value) || 4 })} className="pl-10 h-10" />
                  </div>
                ) : form.programType === 'hi_mufradat' ? (
                  <Select value={form.durationWeeks.toString()} onValueChange={(v) => setForm({ ...form, durationWeeks: parseInt(v) })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 Pekan (5 Bulan - Standar 1 Juz)</SelectItem>
                      <SelectItem value="24">24 Pekan (6 Bulan - Khusus Juz 30)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={form.durationWeeks.toString()} onValueChange={(v) => setForm({ ...form, durationWeeks: parseInt(v) })}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Pekan (Intensif)</SelectItem>
                      <SelectItem value="2">2 Pekan (Reguler)</SelectItem>
                      <SelectItem value="3">3 Pekan (Santai)</SelectItem>
                      <SelectItem value="4">4 Pekan (Pemula)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {calculatedEndDate && form.programType !== 'hi_ngaji' && (
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">
                    Otomatis berakhir: {new Date(calculatedEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Ada Ujian</Label>
                </div>
                <Switch checked={form.hasExam} onCheckedChange={(v) => setForm({ ...form, hasExam: v })} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase flex items-center gap-1"><Award className="w-3 h-3" /> Sertifikat</Label>
                </div>
                <Switch checked={form.hasCertificate} onCheckedChange={(v) => setForm({ ...form, hasCertificate: v })} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Kuota Peserta</Label>
                <Input type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed h-10 mt-6">
                <Label className="text-[10px] font-bold uppercase">Berbayar (Premium)</Label>
                <Switch checked={form.isPremium} onCheckedChange={(v) => setForm({ ...form, isPremium: v })} />
              </div>
            </div>

            {form.isPremium && (
              <div className="grid gap-6 p-4 border-2 border-[#D4AF37]/20 rounded-2xl bg-[#D4AF37]/5 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Metode Pembayaran</Label>
                    <Select value={form.paymentType} onValueChange={(v) => setForm({ ...form, paymentType: v })}>
                      <SelectTrigger className="bg-white h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Nominal Tetap (Standar)</SelectItem>
                        <SelectItem value="selectable">Pilihan Terbuka (Multiples)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">{form.paymentType === 'fixed' ? 'Nominal Infaq (Rp)' : 'Min. Infaq (Level 1)'}</Label>
                    <Input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: parseInt(e.target.value) || 0 })} />
                    {form.paymentType === 'selectable' && <span className="text-[9px] font-bold text-amber-600 italic leading-none block">User memilih: 50k, 75k, 100k, 125k, 150k</span>}
                    {form.programType === 'hi_mufradat' && <span className="text-[9px] font-bold text-[#800000] italic leading-none block mt-1">*Minimal Rp 20.000 untuk Hi Mufradat</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Tag Promosi</Label>
                  <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Contoh: PENDAFTARAN DIBUKA" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2 h-12 shadow-xl">
              {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              {isSaving ? "SEDANG MENYIMPAN..." : "SIMPAN PROGRAM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Participant Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              Transfer Peserta
            </DialogTitle>
            <DialogDescription>
              Pindahkan <strong>{transferTargetParticipant?.user_name}</strong> dari <strong>{selectedHalaqah?.title}</strong> ke kelas lain.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Pilih Kelas Tujuan</Label>
              <Select value={transferDestinationHalaqahId} onValueChange={setTransferDestinationHalaqahId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih kelas tujuan..." />
                </SelectTrigger>
                <SelectContent>
                  {halaqahs?.filter(h => h.id !== selectedHalaqah?.id).map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.title} ({getSisaKuota(h)} sisa)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 text-amber-800">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-[10px] font-medium leading-relaxed">
                Tindakan ini akan memindahkan data registrasi peserta ke kelas baru dan memperbarui akses kelas di profil mereka secara otomatis.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsTransferOpen(false)}
              disabled={isTransferring}
            >
              Batal
            </Button>
            <Button 
              onClick={handleTransferParticipant} 
              className="bg-amber-600 hover:bg-amber-700 font-bold gap-2"
              disabled={!transferDestinationHalaqahId || isTransferring}
            >
              {isTransferring ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              KONFIRMASI PINDAH
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
