
'use client';

import { useState } from "react";
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
import { Plus, Library, Edit, Trash2, ArrowLeft, Loader2, CheckCircle2, Zap, BookOpen, User } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const INITIAL_FORM = {
  title: "",
  instructor: "",
  description: "",
  schedule: "",
  level: "Semua Level",
  isPremium: false,
  tag: "",
  basePrice: 0,
};

export default function AdminClassesPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHalaqah, setEditingHalaqah] = useState<any>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const halaqahQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "halaqahs");
  }, [db, user?.uid]);

  const { data: halaqahs, isLoading } = useCollection(halaqahQuery);

  const handleOpenAdd = () => {
    setEditingHalaqah(null);
    setForm(INITIAL_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (h: any) => {
    setEditingHalaqah(h);
    setForm({
      title: h.title,
      instructor: h.instructor,
      description: h.description || "",
      schedule: h.schedule || "",
      level: h.level || "Semua Level",
      isPremium: h.isPremium || false,
      tag: h.tag || "",
      basePrice: h.basePrice || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.instructor) {
      toast({ variant: "destructive", title: "Mohon lengkapi judul dan instruktur." });
      return;
    }

    try {
      if (editingHalaqah) {
        const ref = doc(db, "halaqahs", editingHalaqah.id);
        setDocumentNonBlocking(ref, {
          ...form,
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast({ title: "Kelas Diperbarui" });
      } else {
        const col = collection(db, "halaqahs");
        addDocumentNonBlocking(col, {
          ...form,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
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
            <p className="text-sm text-muted-foreground italic">Belum ada kelas yang terdaftar. Mulai tambahkan sekarang!</p>
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
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <User className="w-3 h-3" /> {h.instructor}
                    </p>
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
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{h.description}</p>
                <div className="flex items-center justify-between border-t pt-3 mt-auto">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D4AF37]">{h.level}</span>
                  <span className="text-[9px] font-bold text-muted-foreground">{h.schedule}</span>
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
            <DialogDescription>Masukkan detail program pembelajaran Sahabat AQLI.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Judul Program</Label>
                <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Contoh: Tahsin Dasar Al-Fatihah" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Nama Instruktur</Label>
                <Input value={form.instructor} onChange={(e) => setForm({...form, instructor: e.target.value})} placeholder="Contoh: Ustadzah Fulanah" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Deskripsi Singkat</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="h-20" placeholder="Jelaskan apa yang akan dipelajari..." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Jadwal Belajar</Label>
                <Input value={form.schedule} onChange={(e) => setForm({...form, schedule: e.target.value})} placeholder="Contoh: Setiap Senin, 19:30 WIB" />
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

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border-2 border-dashed">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Program Berbayar (Premium)</Label>
                <p className="text-[10px] text-muted-foreground italic">Aktifkan jika memerlukan infaq pendaftaran.</p>
              </div>
              <Switch checked={form.isPremium} onCheckedChange={(v) => setForm({...form, isPremium: v})} />
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
