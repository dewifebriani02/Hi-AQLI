
'use client';

import { useState, useMemo } from "react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
import { Plus, Library, Edit, Trash2, ArrowLeft, Loader2, CheckCircle2, User, Calendar, Clock, Users, Timer, GraduationCap, Award } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INITIAL_FORM = {
  title: "",
  muallimahId: "",
  musyrifahId: "",
  description: "",
  day: "Senin",
  time: "19:00",
  startDate: "",
  durationWeeks: 4,
  level: "Semua Level",
  isPremium: false,
  hasExam: true,
  hasCertificate: true,
  tag: "",
  basePrice: 0,
  quota: 20,
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function AdminClassesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHalaqah, setEditingHalaqah] = useState<any>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  // Fetch Classes
  const halaqahQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "halaqahs");
  }, [db, user?.uid]);

  const { data: halaqahs, isLoading } = useCollection(halaqahQuery);

  // Fetch Users for Selection
  const usersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "users");
  }, [db, user?.uid]);

  const { data: allUsers } = useCollection(usersQuery);

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
      title: h.title,
      muallimahId: h.muallimahId || "",
      musyrifahId: h.musyrifahId || "",
      description: h.description || "",
      day: day || "Senin",
      time: time || "19:00",
      startDate: h.startDate || "",
      durationWeeks: h.durationWeeks || 4,
      level: h.level || "Semua Level",
      isPremium: h.isPremium || false,
      hasExam: h.hasExam ?? true,
      hasCertificate: h.hasCertificate ?? true,
      tag: h.tag || "",
      basePrice: h.basePrice || 0,
      quota: h.quota || 20,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.muallimahId || !form.startDate) {
      toast({ variant: "destructive", title: "Mohon lengkapi judul, Mu'allimah, dan tanggal mulai." });
      return;
    }

    const selectedMuallimah = allUsers?.find(u => u.id === form.muallimahId);
    const selectedMusyrifah = allUsers?.find(u => u.id === form.musyrifahId);

    const finalData = {
      title: form.title,
      muallimah: selectedMuallimah?.username || "Mu'allimah AQLI",
      muallimahId: form.muallimahId,
      musyrifah: selectedMusyrifah?.username || "",
      musyrifahId: form.musyrifahId,
      description: form.description,
      schedule: `${form.day}, ${form.time}`,
      startDate: form.startDate,
      endDate: calculatedEndDate,
      durationWeeks: form.durationWeeks,
      level: form.level,
      isPremium: form.isPremium,
      hasExam: form.hasExam,
      hasCertificate: form.hasCertificate,
      tag: form.tag,
      basePrice: form.basePrice,
      quota: form.quota,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingHalaqah) {
        const ref = doc(db, "halaqahs", editingHalaqah.id);
        setDocumentNonBlocking(ref, finalData, { merge: true });
        toast({ title: "Kelas Diperbarui" });
      } else {
        const col = collection(db, "halaqahs");
        addDocumentNonBlocking(col, {
          ...finalData,
          createdAt: serverTimestamp()
        });
        toast({ title: "Kelas Berhasil Ditambahkan" });
      }
      setIsDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan data." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kelas ini? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      await deleteDoc(doc(db, "halaqahs", id));
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
          halaqahs.map((h) => (
            <Card key={h.id} className={cn("border-none shadow-sm group overflow-hidden border-l-4", h.isPremium ? "border-l-[#800000]" : "border-l-blue-500")}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm uppercase text-[#800000]">{h.title}</h3>
                      {h.isPremium && <Badge className="bg-[#800000] text-white text-[7px] font-black h-4">PREMIUM</Badge>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-[#800000]" /> Mu'allimah: {h.muallimah}
                      </p>
                      {h.musyrifah && (
                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-[#D4AF37]" /> Musyrifah: {h.musyrifah}
                        </p>
                      )}
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
                <div className="flex flex-wrap gap-2 mb-4">
                  {h.hasExam && <Badge variant="outline" className="text-[8px] border-emerald-200 text-emerald-700 bg-emerald-50">UJIAN</Badge>}
                  {h.hasCertificate && <Badge variant="outline" className="text-[8px] border-blue-200 text-blue-700 bg-blue-50">SERTIFIKAT</Badge>}
                </div>
                <div className="flex items-center justify-between border-t pt-3 mt-auto">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">{h.level}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Timer className="w-2.5 h-2.5" /> {h.durationWeeks || '-'} Pekan</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                      <Calendar className="w-3 h-3 text-[#800000]" />
                      {h.startDate ? new Date(h.startDate).toLocaleDateString('id-ID') : '-'} s/d {h.endDate ? new Date(h.endDate).toLocaleDateString('id-ID') : '-'}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                      <Clock className="w-3 h-3 text-[#800000]" />
                      {h.schedule}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-[#800000]" />
              {editingHalaqah ? "Edit Kelas" : "Tambah Kelas Baru"}
            </DialogTitle>
            <DialogDescription>Lengkapi detail operasional program Sahabat AQLI.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Judul Program</Label>
                <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Contoh: Tahsin Dasar Al-Fatihah" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Pilih Mu'allimah</Label>
                <Select value={form.muallimahId} onValueChange={(v) => setForm({...form, muallimahId: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih mu'allimah" /></SelectTrigger>
                  <SelectContent>
                    {allUsers?.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.username || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Pilih Musyrifah (Pendamping)</Label>
                <Select value={form.musyrifahId} onValueChange={(v) => setForm({...form, musyrifahId: v})}>
                  <SelectTrigger><SelectValue placeholder="Pilih musyrifah" /></SelectTrigger>
                  <SelectContent>
                    {allUsers?.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.username || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Level Program</Label>
                <Select value={form.level} onValueChange={(v) => setForm({...form, level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Level">Semua Level</SelectItem>
                    <SelectItem value="Pemula">Pemula</SelectItem>
                    <SelectItem value="Menengah">Menengah</SelectItem>
                    <SelectItem value="Lanjutan">Lanjutan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Deskripsi Singkat</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="h-20" placeholder="Jelaskan apa yang akan dipelajari..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Hari Belajar</Label>
                <Select value={form.day} onValueChange={(v) => setForm({...form, day: v})}>
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
                  <Input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} className="pl-10" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Mulai Belajar</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Durasi (Jumlah Pekan)</Label>
                <div className="relative">
                  <Timer className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input type="number" min="1" value={form.durationWeeks} onChange={(e) => setForm({...form, durationWeeks: parseInt(e.target.value) || 1})} className="pl-10" />
                </div>
                {calculatedEndDate && (
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
                <Switch checked={form.hasExam} onCheckedChange={(v) => setForm({...form, hasExam: v})} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase flex items-center gap-1"><Award className="w-3 h-3" /> Sertifikat</Label>
                </div>
                <Switch checked={form.hasCertificate} onCheckedChange={(v) => setForm({...form, hasCertificate: v})} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Kuota Peserta</Label>
                <Input type="number" value={form.quota} onChange={(e) => setForm({...form, quota: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed h-10 mt-6">
                <Label className="text-[10px] font-bold uppercase">Berbayar (Premium)</Label>
                <Switch checked={form.isPremium} onCheckedChange={(v) => setForm({...form, isPremium: v})} />
              </div>
            </div>

            {form.isPremium && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border-2 border-[#D4AF37]/20 rounded-2xl bg-[#D4AF37]/5 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Infaq Dasar (Rp)</Label>
                  <Input type="number" value={form.basePrice} onChange={(e) => setForm({...form, basePrice: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Tag Promosi</Label>
                  <Input value={form.tag} onChange={(e) => setForm({...form, tag: e.target.value})} placeholder="Contoh: PENDAFTARAN DIBUKA" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleSave} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2 h-12 shadow-xl">
              <CheckCircle2 className="w-5 h-5" /> SIMPAN PROGRAM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
