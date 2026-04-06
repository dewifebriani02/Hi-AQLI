'use client';

import { useState, useMemo } from "react";
import { useCollection } from "@/supabase/db";
import { supabase } from "@/supabase";
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
  Users, 
  Plus, 
  Link as LinkIcon, 
  ArrowLeft, 
  Save, 
  ExternalLink,
  Search,
  CheckCircle2,
  Zap,
  Eye,
  UserMinus,
  X,
  UserPlus,
  ChevronRight,
  Trash2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function MufradatGroupsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string, 
    whatsapp_link: string, 
    start_date: string,
    musyrifah_name: string,
    musyrifah_phone: string,
    muallimah_name: string,
    muallimah_phone: string
  }>({ 
    name: "", 
    whatsapp_link: "", 
    start_date: "",
    musyrifah_name: "",
    musyrifah_phone: "",
    muallimah_name: "",
    muallimah_phone: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  
  // NEW CRUD STATES
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    start_date: new Date().toISOString().split('T')[0],
    musyrifah_name: "",
    musyrifah_phone: "",
    muallimah_name: "",
    muallimah_phone: "",
    whatsapp_link: ""
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: groups, isLoading, refresh } = useCollection("mufradat_groups", {
    orderBy: { column: 'created_at', ascending: true }
  });

  const { data: allUsers } = useCollection("users");

  const groupMembers = useMemo(() => {
    if (!viewingGroupId || !allUsers) return [];
    return allUsers.filter(u => u.mufradat_group_id === viewingGroupId);
  }, [viewingGroupId, allUsers]);

  const availableUsers = useMemo(() => {
    if (!allUsers) return [];
    const s = userSearch.toLowerCase();
    return allUsers.filter(u => 
      !u.mufradat_group_id && 
      (u.username?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s))
    );
  }, [allUsers, userSearch]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const s = search.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(s));
  }, [groups, search]);

  const handleStartEdit = (group: any) => {
    setEditingId(group.id);
    setEditValues({ 
      name: group.name, 
      whatsapp_link: group.whatsapp_link || "",
      start_date: group.start_date || "",
      musyrifah_name: group.musyrifah_name || "",
      musyrifah_phone: group.musyrifah_phone || "",
      muallimah_name: group.muallimah_name || "",
      muallimah_phone: group.muallimah_phone || ""
    });
  };

  const handleSave = async (id: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('mufradat_groups')
        .update({
          name: editValues.name,
          whatsapp_link: editValues.whatsapp_link,
          start_date: editValues.start_date || null,
          musyrifah_name: editValues.musyrifah_name,
          musyrifah_phone: editValues.musyrifah_phone,
          muallimah_name: editValues.muallimah_name,
          muallimah_phone: editValues.muallimah_phone
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Grup Diperbarui", description: "Perubahan berhasil disimpan." });
      setEditingId(null);
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (userId: string, groupId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ mufradat_group_id: null })
        .eq('id', userId);
      
      if (error) throw error;

      // Recount members
      const { data: members } = await supabase
        .from('users')
        .select('id')
        .eq('mufradat_group_id', groupId);
      
      await supabase
        .from('mufradat_groups')
        .update({ member_count: members?.length || 0 })
        .eq('id', groupId);

      toast({ title: "Peserta Dikeluarkan", description: "Peserta telah berhasil dikeluarkan dari grup." });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal mengeluarkan peserta", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinGroup = async (userId: string, groupId: string) => {
    const group = groups?.find(g => g.id === groupId);
    if (group && (group.member_count || 0) >= 50) {
      toast({ variant: "destructive", title: "Grup Penuh", description: "Maksimal 50 thalibah per grup." });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ mufradat_group_id: groupId })
        .eq('id', userId);
      
      if (error) throw error;

      // Recount members
      const { data: members } = await supabase
        .from('users')
        .select('id')
        .eq('mufradat_group_id', groupId);
      
      await supabase
        .from('mufradat_groups')
        .update({ member_count: members?.length || 0 })
        .eq('id', groupId);

      toast({ title: "Peserta Ditambahkan", description: "Peserta telah berhasil dimasukkan ke dalam grup." });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menambahkan peserta", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFillGroupGaps = async () => {
    if (!groups || groups.length === 0) {
      toast({ variant: "destructive", title: "Gagal Proses", description: "Buat minimal satu grup terlebih dahulu." });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: ungroupedUsers, error: fetchErr } = await supabase
        .from('users')
        .select('id')
        .is('mufradat_group_id', null);
      
      if (fetchErr) throw fetchErr;
      
      if (!ungroupedUsers || ungroupedUsers.length === 0) {
        toast({ title: "Optimasi Selesai", description: "Tidak ada thalibah tanpa grup yang ditemukan." });
        return;
      }

      let remainingUsers = [...ungroupedUsers];
      let updatedCount = 0;

      for (const group of groups) {
        if (remainingUsers.length === 0) break;
        
        const spaceAvailable = 50 - (group.member_count || 0);
        if (spaceAvailable > 0) {
          const batchToMove = remainingUsers.splice(0, spaceAvailable);
          const userIds = batchToMove.map(u => u.id);
          
          const { error: moveErr } = await supabase
            .from('users')
            .update({ mufradat_group_id: group.id })
            .in('id', userIds);
          
          if (moveErr) throw moveErr;

          const { data: memberCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('mufradat_group_id', group.id);
          await supabase.from('mufradat_groups').update({ member_count: memberCount?.length || 0 }).eq('id', group.id);
          
          updatedCount += userIds.length;
        }
      }

      toast({ 
        title: "Optimasi Berhasil", 
        description: `Masyallah, ${updatedCount} thalibah telah dipindahkan untuk mengisi kekosongan grup.` 
      });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Optimasi", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name) {
      toast({ variant: "destructive", title: "Nama grup wajib diisi" });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('mufradat_groups')
        .insert({
          name: newGroup.name,
          whatsapp_link: newGroup.whatsapp_link,
          member_count: 0,
          start_date: newGroup.start_date || null,
          musyrifah_name: newGroup.musyrifah_name,
          musyrifah_phone: newGroup.musyrifah_phone,
          muallimah_name: newGroup.muallimah_name,
          muallimah_phone: newGroup.muallimah_phone
        });

      if (error) throw error;

      toast({ title: "Grup Berhasil Dibuat", description: `Masyallah, ${newGroup.name} telah siap!` });
      setIsCreateDialogOpen(false);
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal membuat grup", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    setIsProcessing(true);
    try {
      // 1. Set mufradat_group_id to null for all members
      const { error: memberErr } = await supabase
        .from('users')
        .update({ mufradat_group_id: null })
        .eq('mufradat_group_id', id);
      
      if (memberErr) throw memberErr;

      // 2. Delete the group
      const { error: groupErr } = await supabase
        .from('mufradat_groups')
        .delete()
        .eq('id', id);

      if (groupErr) throw groupErr;

      toast({ title: "Grup Dihapus", description: "Grup dan relasi peserta telah dihapus." });
      setConfirmDeleteId(null);
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Memuat Daftar Grup...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8 pb-32">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
        <Link href="/admin" className="hover:text-[#800000] transition-colors">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/admin/mufradat" className="hover:text-[#800000] transition-colors">Hi Mufradat</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#800000]">Kelola Group</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#800000] truncate uppercase">MANAJEMEN GRUP</h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-bold">Hi Mufradat • Batch 50 Thalibah</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#800000] hover:bg-[#800000]/90 font-black h-12 px-6 rounded-xl shadow-lg gap-2 w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          TAMBAH GRUP BARU
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <Card className="col-span-1 lg:col-span-1 bg-amber-50 border-amber-200">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-black flex items-center gap-2 text-amber-900">
                <Users className="w-4 h-4" /> INFO KAPASITAS
             </CardTitle>
           </CardHeader>
           <CardContent>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Setiap grup dibatasi maksimal 50 thalibah. Fitur di bawah akan mengisi slot kosong grup sebelumnya secara otomatis.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFillGroupGaps}
                disabled={isProcessing}
                className="mt-3 w-full border-amber-300 text-amber-900 bg-white/50 hover:bg-white font-black text-[9px] h-8 gap-1.5 uppercase transition-all active:scale-95"
              >
                <Zap className="w-3 h-3" /> Tutup Lubang & Isi Grup
              </Button>
           </CardContent>
        </Card>
        
        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama grup..." 
              className="pl-10 h-12 border-2 bg-white/50 rounded-xl w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/90 backdrop-blur-md">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg font-black font-headline text-[#800000]">DAFTAR BATCH & LINK WHATSAPP</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[800px] md:min-w-full">
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[180px] text-[10px] font-black uppercase tracking-widest py-4 pl-6">Nama Grup</TableHead>
                  <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest">Mulai</TableHead>
                  <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest">Peserta</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-black uppercase tracking-widest">Musyrifah</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-black uppercase tracking-widest">Muallimah</TableHead>
                  <TableHead className="min-w-[200px] text-[10px] font-black uppercase tracking-widest">Link WhatsApp Monitoring</TableHead>
                  <TableHead className="text-right pr-6 w-[200px] text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => {
                  const isEditing = editingId === group.id;
                  const isFull = group.member_count >= 50;

                  return (
                    <TableRow key={group.id} className="hover:bg-[#800000]/5 transition-colors group">
                      <TableCell className="py-4 pl-6">
                        {isEditing ? (
                          <Input 
                            value={editValues.name} 
                            onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))}
                            className="h-9 font-bold text-xs"
                          />
                        ) : (
                          <span className="font-black text-[#800000]">{group.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input 
                            type="date"
                            value={editValues.start_date}
                            onChange={e => setEditValues(v => ({ ...v, start_date: e.target.value }))}
                            className="h-9 text-[10px] font-bold"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-600">
                             <Calendar className="w-3 h-3" />
                             <span className="text-[11px] font-bold">
                                {group.start_date ? new Date(group.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                             </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{group.member_count || 0}</span>
                          <div className="w-16 sm:w-20 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                             <div 
                                className={`h-full transition-all ${isFull ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min((group.member_count / 50) * 100, 100)}%` }} 
                             />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0">/ 50</span>
                          {isFull && <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input 
                              placeholder="Nama Musyrifah"
                              value={editValues.musyrifah_name} 
                              onChange={e => setEditValues(v => ({ ...v, musyrifah_name: e.target.value }))}
                              className="h-8 text-[10px]"
                            />
                            <Input 
                              placeholder="No. WA (62812...)"
                              value={editValues.musyrifah_phone} 
                              onChange={e => setEditValues(v => ({ ...v, musyrifah_phone: e.target.value }))}
                              className="h-8 text-[10px]"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{group.musyrifah_name || '-'}</span>
                            <span className="text-[10px] text-muted-foreground">{group.musyrifah_phone || '-'}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input 
                              placeholder="Nama Muallimah"
                              value={editValues.muallimah_name} 
                              onChange={e => setEditValues(v => ({ ...v, muallimah_name: e.target.value }))}
                              className="h-8 text-[10px]"
                            />
                            <Input 
                              placeholder="No. WA (62812...)"
                              value={editValues.muallimah_phone} 
                              onChange={e => setEditValues(v => ({ ...v, muallimah_phone: e.target.value }))}
                              className="h-8 text-[10px]"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#800000]">{group.muallimah_name || '-'}</span>
                            <span className="text-[10px] text-muted-foreground">{group.muallimah_phone || '-'}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell tabIndex={0}>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                            <Input 
                              placeholder="https://chat.whatsapp.com/..."
                              value={editValues.whatsapp_link} 
                              onChange={e => setEditValues(v => ({ ...v, whatsapp_link: e.target.value }))}
                              className="h-9 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                              {group.whatsapp_link || 'Belum diatur'}
                            </span>
                            {group.whatsapp_link && (
                              <a href={group.whatsapp_link} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#800000]/10 rounded-full text-[#800000]">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                             <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-muted-foreground text-[10px] font-bold h-8" 
                              onClick={() => setEditingId(null)}
                             >
                              Batal
                             </Button>
                             <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1.5 font-bold text-[10px]"
                              onClick={() => handleSave(group.id)}
                              disabled={isProcessing}
                             >
                               <Save className="w-3.5 h-3.5" /> Simpan
                             </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-3 border-2" 
                                onClick={() => {
                                  setViewingGroupId(group.id);
                                  setIsViewMembersOpen(true);
                                  setIsAddingMember(false);
                                }}
                              >
                                 <Eye className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Lihat Peserta</span>
                              </Button>
                             <Button asChild variant="ghost" size="sm" className="h-8 text-[9px] sm:text-[10px] font-black uppercase text-[#800000] px-2 sm:px-3">
                                <Link href={`/admin/mufradat?groupId=${group.id}`}>Monitor</Link>
                             </Button>
                             <Button variant="outline" size="sm" className="h-8 text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-3 border-2" onClick={() => handleStartEdit(group)}>
                                 Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[9px] sm:text-[10px] font-black uppercase text-rose-600 hover:bg-rose-50 px-2 sm:px-3" 
                                onClick={() => setConfirmDeleteId(group.id)}
                              >
                                 <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                              </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE GROUP DIALOG */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
           <DialogHeader className="p-8 bg-[#800000] text-white">
              <DialogTitle className="text-2xl font-black font-headline uppercase">Tambah Grup Baru</DialogTitle>
              <p className="text-white/60 text-xs font-medium">Lengkapi detail grup thalibah Hi Mufradat Anda.</p>
           </DialogHeader>
           <CardContent className="p-8 space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[#800000]">Nama Grup</label>
                 <Input 
                   placeholder="Contoh: Batch 5 - Ummahat" 
                   value={newGroup.name}
                   onChange={e => setNewGroup(v => ({ ...v, name: e.target.value }))}
                   className="h-12 rounded-xl focus:border-[#800000]/30"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Musyrifah</label>
                    <Input 
                      placeholder="Nama"
                      value={newGroup.musyrifah_name}
                      onChange={e => setNewGroup(v => ({ ...v, musyrifah_name: e.target.value }))}
                      className="h-11 text-xs"
                    />
                 </div>
                 <div className="space-y-1.5 pt-5.5">
                    <Input 
                      placeholder="No. WA"
                      value={newGroup.musyrifah_phone}
                      onChange={e => setNewGroup(v => ({ ...v, musyrifah_phone: e.target.value }))}
                      className="h-11 text-xs"
                    />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tanggal Mulai</label>
                 <Input 
                   type="date"
                   value={newGroup.start_date}
                   onChange={e => setNewGroup(v => ({ ...v, start_date: e.target.value }))}
                   className="h-11"
                 />
              </div>
              <Button 
                onClick={handleCreateGroup} 
                className="w-full h-14 bg-[#800000] hover:bg-[#800000]/90 font-black text-lg rounded-2xl shadow-xl mt-4"
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : 'SIMPAN GRUP BARU'}
              </Button>
           </CardContent>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm p-8 text-center rounded-3xl border-none shadow-2xl">
           <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
           </div>
           <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 leading-tight">HAPUS GRUP INI?</DialogTitle>
              <p className="text-xs font-medium text-slate-500 mt-2 px-4">
                Masyallah, apakah Ukhti yakin? Peserta di dalam grup ini akan menjadi 'Tanpa Grup' (Ungrouped).
              </p>
           </DialogHeader>
           <div className="flex flex-col gap-3 mt-8">
              <Button 
                variant="destructive" 
                className="h-12 rounded-2xl font-black text-sm shadow-lg bg-rose-600 hover:bg-rose-700" 
                onClick={() => confirmDeleteId && handleDeleteGroup(confirmDeleteId)}
                disabled={isProcessing}
              >
                YA, HAPUS GRUP
              </Button>
              <Button 
                variant="ghost" 
                className="h-10 text-slate-400 font-bold" 
                onClick={() => setConfirmDeleteId(null)}
              >
                TIDAK, BATALKAN
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* VIEW MEMBERS MODAL */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-[#800000]/5 border-b flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2 text-[#800000] font-black uppercase tracking-tight">
              <Users className="w-5 h-5 text-[#D4AF37]" /> 
              {isAddingMember ? 'Tambah Peserta' : `Peserta ${groups?.find(g => g.id === viewingGroupId)?.name}`}
            </DialogTitle>
            <Button 
               variant={isAddingMember ? "ghost" : "outline"} 
               size="sm" 
               onClick={() => setIsAddingMember(!isAddingMember)}
               className={cn(
                 "h-8 font-black uppercase text-[10px] gap-2 border-2 rounded-xl",
                 isAddingMember ? "text-muted-foreground" : "border-[#800000]/20 text-[#800000]"
               )}
            >
               {isAddingMember ? <ArrowLeft className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
               {isAddingMember ? 'Kembali' : 'Tambah Manual'}
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
             {isAddingMember ? (
               <div className="space-y-4">
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                      placeholder="Cari thalibah tanpa grup..." 
                      className="pl-10 h-11 border-2 bg-white rounded-xl shadow-sm focus:border-[#800000]/30 transition-all"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                   />
                 </div>
                 <div className="space-y-2">
                   {availableUsers.length > 0 ? availableUsers.map(user => (
                     <Card key={user.id} className="border shadow-sm hover:border-[#800000]/30 transition-all bg-white group rounded-xl overflow-hidden">
                       <CardContent className="p-3 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9 border-2 border-white shadow-md">
                             <AvatarImage src={user.avatar_url} />
                             <AvatarFallback className="text-[10px] font-black bg-[#800000] text-white">
                               {(user.username || 'U').charAt(0)}
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex flex-col">
                             <span className="text-sm font-black text-slate-800">{user.username || 'Tanpa Nama'}</span>
                             <span className="text-[10px] text-muted-foreground font-medium">{user.email}</span>
                           </div>
                         </div>
                         <Button 
                           size="sm" 
                           onClick={() => handleJoinGroup(user.id, viewingGroupId!)}
                           disabled={isProcessing}
                           className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black uppercase text-[9px] h-8 px-4 rounded-lg shadow-md active:scale-95 transition-all"
                         >
                           Tambah
                         </Button>
                       </CardContent>
                     </Card>
                   )) : (
                     <div className="text-center py-12 bg-white border-2 border-dashed rounded-2xl">
                        <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground italic text-xs">Tidak ada thalibah tanpa grup yang ditemukan.</p>
                     </div>
                   )}
                 </div>
               </div>
             ) : (
               <div className="space-y-3">
                 {groupMembers.length > 0 ? groupMembers.map(member => (
                   <Card key={member.id} className="border shadow-sm group hover:border-[#800000]/30 transition-all bg-white rounded-xl overflow-hidden">
                     <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                             <AvatarImage src={member.avatar_url} />
                             <AvatarFallback className="bg-[#800000] text-white text-xs font-black uppercase">
                                {(member.username || 'U').charAt(0)}
                             </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                             <span className="text-sm font-black text-slate-800">{member.username || 'Tanpa Nama'}</span>
                             <span className="text-[10px] text-muted-foreground font-medium">{member.email}</span>
                          </div>
                       </div>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold text-[10px] uppercase gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                         onClick={() => handleRemoveMember(member.id, viewingGroupId!)}
                         disabled={isProcessing}
                       >
                         <UserMinus className="w-3.5 h-3.5" /> Keluarkan
                       </Button>
                     </CardContent>
                   </Card>
                 )) : (
                   <div className="text-center py-12 bg-white border-2 border-dashed rounded-2xl">
                        <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground italic text-xs">Belum ada thalibah di grup ini.</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-[#800000]/5 p-6 rounded-2xl border-2 border-dashed border-[#800000]/20">
         <h4 className="flex items-center gap-2 font-black text-[#800000] mb-2 uppercase tracking-tight">
           Catatan Sistem:
         </h4>
         <ul className="text-xs space-y-2 text-muted-foreground font-medium leading-relaxed list-disc pl-4">
           <li>Grup dengan tanda <CheckCircle2 className="w-3 h-3 text-amber-500 inline" /> berarti sudah mencapai kapasitas maksimal (50 peserta).</li>
           <li>Musyrifah menyalin link WhatsApp Monitoring di sini agar sistem bisa mengatur pendaftaran Thalibah baru dengan tepat.</li>
           <li>Tombol "Monitor" akan mengarahkan Anda ke dashboard progress khusus thalibah di grup tersebut.</li>
         </ul>
      </div>
    </div>
  );
}
