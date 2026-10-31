'use client';

import { useState, useMemo } from "react";
import { useCollection } from "@/db";
import {db } from "@/db";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Plus, 
  Trophy, 
  Clock, 
  Calendar,
  CheckCircle2,
  Trash2,
  Play,
  StopCircle,
  Hash
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function AdminMabarManagementPage() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newMabar, setNewMabar] = useState({
    title: "",
    juz_id: 30,
    scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16), // Default 1 hour from now
    duration_minutes: 60
  });

  const { data: sessions, isLoading, refresh } = useCollection("mufradat_mabar_sessions", {
    orderBy: { column: 'scheduled_at', ascending: false }
  });

  const handleCreateMabar = async () => {
    if (!newMabar.title) {
        toast({ variant: "destructive", title: "Judul Mabar wajib diisi" });
        return;
    }

    setIsProcessing(true);
    try {
      const { error } = await db
        .from('mufradat_mabar_sessions')
        .insert({
          title: newMabar.title,
          juz_id: newMabar.juz_id,
          scheduled_at: newMabar.scheduled_at,
          duration_minutes: newMabar.duration_minutes,
          status: 'pending'
        });

      if (error) throw error;

      toast({ title: "Mabar Dijadwalkan", description: "Bismillah, sesi mabar berhasil dibuat." });
      setIsCreateDialogOpen(false);
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal membuat sesi", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setIsProcessing(true);
    try {
      const { error } = await db
        .from('mufradat_mabar_sessions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Status Diperbarui", description: `Sesi kini berstatus ${status}.` });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal update status", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Hapus sesi mabar ini? Semua data partisipan juga akan terhapus.")) return;

    setIsProcessing(true);
    try {
      const { error } = await db
        .from('mufradat_mabar_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sesi Dihapus", description: "Mabar telah dibatalkan." });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin w-10 h-10 text-[#800000]" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Menyiapkan Ruang Mabar...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#800000] rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-xl border-4 border-white">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black font-headline tracking-tight uppercase">Jadwal Mabar</h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-bold">Hi Mufradat • Kompetisi Hafalan Realtime</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#800000] hover:bg-[#800000]/90 font-black h-12 px-6 rounded-xl shadow-lg gap-2 w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          JADWALKAN MABAR
        </Button>
      </div>

      {/* SESSIONS TABLE */}
      <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
        <CardHeader className="bg-[#800000] text-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight">Sesi Mabar Aktif & Mendatang</CardTitle>
              <CardDescription className="text-white/60 text-xs font-medium">Atur kompetisi hafal bersama untuk seluruh thalibah.</CardDescription>
            </div>
            <Trophy className="w-10 h-10 text-white/20" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-[#800000] pl-8 py-5">Status</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-5">Detail Mabar</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-5">Juz</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-5">Waktu Pelaksanaan</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 text-right pr-8 py-5">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions?.map((session) => (
                  <TableRow key={session.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="pl-8">
                       <Badge className={cn(
                         "font-black text-[9px] px-2 py-0 border-none uppercase",
                         session.status === 'active' ? "bg-emerald-100 text-emerald-700 animate-pulse" :
                         session.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                       )}>
                         {session.status}
                       </Badge>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{session.title}</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Durasi: {session.duration_minutes} Menit</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-[#800000]/10 rounded flex items-center justify-center">
                             <Hash className="w-3 h-3 text-[#800000]" />
                          </div>
                          <span className="text-xs font-black text-slate-700">Juz {session.juz_id}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-bold text-slate-700">
                             {format(new Date(session.scheduled_at), "eeee, d MMM HH:mm", { locale: idLocale })}
                          </span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <div className="flex items-center justify-end gap-2">
                          {session.status === 'pending' && (
                             <Button 
                               size="sm" 
                               className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-[10px] font-black uppercase px-3"
                               onClick={() => updateStatus(session.id, 'active')}
                             >
                                <Play className="w-3.5 h-3.5 mr-1.5" /> Start
                             </Button>
                          )}
                          {session.status === 'active' && (
                             <Button 
                               size="sm" 
                               variant="outline"
                               className="border-rose-600 text-rose-600 hover:bg-rose-50 h-8 text-[10px] font-black uppercase px-3"
                               onClick={() => updateStatus(session.id, 'finished')}
                             >
                                <StopCircle className="w-3.5 h-3.5 mr-1.5" /> Finish
                             </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-full"
                            onClick={() => deleteSession(session.id)}
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
            <DialogHeader className="p-8 bg-[#800000] text-white text-center">
              <DialogTitle className="text-2xl font-black font-headline uppercase leading-tight">Jadwalkan Mabar</DialogTitle>
              <DialogDescription className="text-white/60 text-xs font-medium">
                Bismillah, mari buat kompetisi yang seru!
              </DialogDescription>
            </DialogHeader>
           <div className="p-8 space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Nama Sesi Mabar</label>
                 <Input 
                   placeholder="Contoh: Mabar Malam Minggu Juz 30"
                   value={newMabar.title}
                   onChange={e => setNewMabar(v => ({ ...v, title: e.target.value }))}
                   className="h-12 text-sm font-bold rounded-xl"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Juz Fokus</label>
                    <Input 
                      type="number" min="1" max="30"
                      value={newMabar.juz_id}
                      onChange={e => setNewMabar(v => ({ ...v, juz_id: parseInt(e.target.value) }))}
                      className="h-11 font-bold"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Durasi (Menit)</label>
                    <Input 
                      type="number"
                      value={newMabar.duration_minutes}
                      onChange={e => setNewMabar(v => ({ ...v, duration_minutes: parseInt(e.target.value) }))}
                      className="h-11 font-bold"
                    />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waktu Mulai</label>
                 <Input 
                    type="datetime-local"
                    value={newMabar.scheduled_at}
                    onChange={e => setNewMabar(v => ({ ...v, scheduled_at: e.target.value }))}
                    className="h-12 font-bold"
                 />
              </div>
              <Button 
                onClick={handleCreateMabar}
                disabled={isProcessing}
                className="w-full h-14 bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-lg rounded-2xl shadow-xl mt-4"
              >
                 {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : "JADWALKAN SEKARANG"}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
