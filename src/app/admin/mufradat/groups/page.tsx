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
  Trash2,
  Zap,
  Eye,
  UserMinus,
  X
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MufradatGroupsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{name: string, whatsapp_link: string}>({ name: "", whatsapp_link: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);

  const { data: groups, isLoading, refresh } = useCollection("mufradat_groups", {
    orderBy: { column: 'created_at', ascending: true }
  });

  const { data: allUsers } = useCollection("users");

  const groupMembers = useMemo(() => {
    if (!viewingGroupId || !allUsers) return [];
    return allUsers.filter(u => u.mufradat_group_id === viewingGroupId);
  }, [viewingGroupId, allUsers]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const s = search.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(s));
  }, [groups, search]);

  const handleStartEdit = (group: any) => {
    setEditingId(group.id);
    setEditValues({ name: group.name, whatsapp_link: group.whatsapp_link || "" });
  };

  const handleSave = async (id: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('mufradat_groups')
        .update({
          name: editValues.name,
          whatsapp_link: editValues.whatsapp_link
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

  const handleMigrateUngrouped = async () => {
    if (!groups || groups.length === 0) {
      toast({ variant: "destructive", title: "Gagal Migrasi", description: "Buat minimal satu grup terlebih dahulu." });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Find all users with no group
      const { data: ungroupedUsers, error: fetchErr } = await supabase
        .from('users')
        .select('id')
        .is('mufradat_group_id', null);
      
      if (fetchErr) throw fetchErr;
      
      if (!ungroupedUsers || ungroupedUsers.length === 0) {
        toast({ title: "Migrasi Selesai", description: "Semua thalibah sudah masuk ke dalam grup." });
        return;
      }

      // 2. Pick the first group (Grup 1)
      const targetGroup = groups[0];
      
      // 3. Update all these users
      const userIds = ungroupedUsers.map(u => u.id);
      const { error: updateErr } = await supabase
        .from('users')
        .update({ mufradat_group_id: targetGroup.id })
        .in('id', userIds);
      
      if (updateErr) throw updateErr;

      // 4. Update group member count
      const { error: groupErr } = await supabase
        .from('mufradat_groups')
        .update({ member_count: (targetGroup.member_count || 0) + userIds.length })
        .eq('id', targetGroup.id);
      
      if (groupErr) throw groupErr;

      toast({ 
        title: "Migrasi Berhasil", 
        description: `Masyallah, ${userIds.length} thalibah telah dipindahkan ke ${targetGroup.name}.` 
      });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal Migrasi", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddGroup = async () => {
    setIsProcessing(true);
    try {
      const nextNum = (groups?.length || 0) + 1;
      const { error } = await supabase
        .from('mufradat_groups')
        .insert({
          name: `Grup ${nextNum}`,
          whatsapp_link: "",
          member_count: 0
        });

      if (error) throw error;

      toast({ title: "Grup Baru Dibuat", description: `Grup ${nextNum} berhasil ditambahkan.` });
      refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal membuat grup", description: e.message });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/admin/mufradat"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-[#800000]">MANAJEMEN GRUP</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Hi Mufradat • Batch 50 Thalibah</p>
          </div>
        </div>
        <Button onClick={handleAddGroup} disabled={isProcessing} className="bg-[#800000] hover:bg-[#800000]/90 font-black h-12 px-6 rounded-xl shadow-lg gap-2">
          {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
          TAMBAH GRUP BARU
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 bg-amber-50 border-amber-200">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-black flex items-center gap-2 text-amber-900">
                <Users className="w-4 h-4" /> INFO KAPASITAS
             </CardTitle>
           </CardHeader>
           <CardContent>
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Setiap grup dibatasi maksimal 50 thalibah. Pendaftaran baru otomatis mengisi grup terakhir yang belum penuh.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMigrateUngrouped}
                disabled={isProcessing}
                className="mt-3 w-full border-amber-300 text-amber-900 bg-white/50 hover:bg-white font-black text-[9px] h-8 gap-1.5 uppercase transition-all active:scale-95"
              >
                <Zap className="w-3 h-3" /> Pindahkan Thalibah Lama ke Grup 1
              </Button>
           </CardContent>
        </Card>
        
        <div className="md:col-span-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama grup..." 
              className="pl-10 h-12 border-2 bg-white/50 rounded-xl"
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
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[200px] text-[10px] font-black uppercase tracking-widest py-4 pl-6">Nama Grup</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Peserta</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Link WhatsApp Monitoring</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
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
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{group.member_count || 0}</span>
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                           <div 
                              className={`h-full transition-all ${isFull ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${Math.min((group.member_count / 50) * 100, 100)}%` }} 
                           />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">/ 50</span>
                        {isFull && <CheckCircle2 className="w-3 h-3 text-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-3 h-3 text-muted-foreground" />
                          <Input 
                            placeholder="https://chat.whatsapp.com/..."
                            value={editValues.whatsapp_link} 
                            onChange={e => setEditValues(v => ({ ...v, whatsapp_link: e.target.value }))}
                            className="h-9 text-xs"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
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
                            className="text-muted-foreground text-xs font-bold" 
                            onClick={() => setEditingId(null)}
                           >
                            Batal
                           </Button>
                           <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1.5 font-bold"
                            onClick={() => handleSave(group.id)}
                            disabled={isProcessing}
                           >
                             <Save className="w-3.5 h-3.5" /> Simpan
                           </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[10px] font-black uppercase" 
                              onClick={() => {
                                setViewingGroupId(group.id);
                                setIsViewMembersOpen(true);
                              }}
                            >
                               <Eye className="w-3.5 h-3.5 mr-1.5" /> Lihat Peserta
                            </Button>
                           <Button asChild variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-[#800000]">
                              <Link href={`/admin/mufradat?groupId=${group.id}`}>Monitor</Link>
                           </Button>
                           <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase" onClick={() => handleStartEdit(group)}>
                              Edit
                           </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-medium italic">
                    Belum ada grup yang terdaftar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* VIEW MEMBERS MODAL */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <DialogTitle className="flex items-center gap-2 text-[#800000] font-black uppercase tracking-tight">
              <Users className="w-5 h-5" /> Peserta {groups?.find(g => g.id === viewingGroupId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
             <div className="space-y-3">
               {groupMembers.length > 0 ? groupMembers.map(member => (
                 <Card key={member.id} className="border shadow-sm group hover:border-[#800000]/30 transition-all">
                   <CardContent className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border shadow-sm">
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
                 <div className="text-center py-12 text-muted-foreground italic text-sm">
                    Belum ada thalibah di grup ini.
                 </div>
               )}
             </div>
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
