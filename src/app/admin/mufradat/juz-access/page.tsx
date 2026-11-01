'use client';

import { db, useCollection } from "@/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Search, 
  ShieldCheck, 
  Settings2, 
  ChevronRight, 
  CheckCircle2,
  BookOpen,
  ArrowLeft
} from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MufradatJuzAccessPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 1. Fetch Users in Hi Mufradat
  const { data: users, isLoading, refresh } = useCollection("users", {
    filters: [{ column: 'mufradat_group_id', operator: 'not_null', value: null }],
    orderBy: { column: 'username', ascending: true }
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const selectedUser = useMemo(() => {
    return users?.find(u => u.id === selectedUserId);
  }, [users, selectedUserId]);

  const toggleJuz = async (userId: string, juzNum: number) => {
    const user = users?.find(u => u.id === userId);
    if (!user) return;

    setIsSaving(`${userId}-${juzNum}`);
    
    let currentAccessible = Array.isArray(user.mufradat_accessible_juz) ? [...user.mufradat_accessible_juz] : [];
    
    if (currentAccessible.includes(juzNum)) {
      currentAccessible = currentAccessible.filter(j => j !== juzNum);
    } else {
      currentAccessible.push(juzNum);
      currentAccessible.sort((a, b) => a - b);
    }

    try {
      const { error } = await db
        .from('users')
        .update({ mufradat_accessible_juz: currentAccessible })
        .eq('id', userId);

      if (error) throw error;
      
      refresh();
      toast({
        title: "Akses Diperbarui",
        description: `Hak akses Juz ${juzNum} untuk ${user.username || 'user'} telah diubah.`,
      });
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal memperbarui akses." });
    } finally {
      setIsSaving(null);
    }
  };

  const handleSyncJuz1All = async () => {
    setIsSaving("bulk-sync");
    try {
      const { data: mufradatUsers, error: fetchError } = await db
        .from('users')
        .select('id, mufradat_accessible_juz, username')
        .not('mufradat_group_id', 'is', null);

      if (fetchError) throw fetchError;
      if (!mufradatUsers) return;

      const usersToUpdate = mufradatUsers.filter((u: any) => {
        const juzArray = Array.isArray(u.mufradat_accessible_juz) ? u.mufradat_accessible_juz : [];
        return !juzArray.includes(1);
      });

      if (usersToUpdate.length === 0) {
        toast({ 
          title: "Sudah Sinkron", 
          description: "Masyallah, semua thalibah terdaftar sudah memiliki akses Juz 1." 
        });
        return;
      }

      let successCount = 0;
      for (const u of usersToUpdate) {
        const current = Array.isArray(u.mufradat_accessible_juz) ? u.mufradat_accessible_juz : [];
        const { error: upError } = await db
          .from('users')
          .update({ 
            mufradat_accessible_juz: [1, ...current].sort((a, b) => a - b),
            updated_at: new Date().toISOString()
          })
          .eq('id', u.id);
        
        if (!upError) successCount++;
      }

      refresh();
      toast({ 
        title: "Sinkronisasi Berhasil", 
        description: `Alhamdulillah, ${successCount} thalibah kini telah memiliki akses ke Juz 1.` 
      });
    } catch (err: any) {
      console.error(err);
      toast({ 
        variant: "destructive", 
        title: "Gagal Sinkronisasi", 
        description: err.message 
      });
    } finally {
      setIsSaving(null);
    }
  };

  const grantAll = async (userId: string) => {
    setIsSaving(userId);
    try {
      const allJuz = Array.from({ length: 30 }, (_, i) => i + 1);
      const { error } = await db
        .from('users')
        .update({ mufradat_accessible_juz: allJuz, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      refresh();
      toast({
        title: "Semua Juz Dibuka",
        description: "Seluruh Juz 1–30 telah diaktifkan untuk thalibah ini.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal membuka semua Juz", description: err.message });
    } finally {
      setIsSaving(null);
    }
  };

  const revokeAll = async (userId: string) => {
    setIsSaving(userId);
    try {
      const { error } = await db
        .from('users')
        .update({ mufradat_accessible_juz: [], updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      refresh();
      toast({
        title: "Akses Juz Ditutup",
        description: "Seluruh akses Juz thalibah telah direset.",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal menutup akses Juz", description: err.message });
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /></div>;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      <div className="flex items-center justify-between px-1 mt-4">
        <div className="flex items-center gap-4 text-left">
           <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link href="/admin"><ArrowLeft className="w-5 h-5" /></Link>
           </Button>
           <div>
              <h1 className="text-2xl font-bold font-headline tracking-tight">Hak Akses Juz</h1>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-[#800000]">Manajemen Konten Hi Mufradat</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* User Sidebar */}
        <div className="md:col-span-4 space-y-4 text-left">
          <Button 
            onClick={handleSyncJuz1All}
            disabled={isSaving === "bulk-sync"}
            className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-[10px] h-12 rounded-2xl shadow-lg shadow-[#800000]/10 gap-2 mb-2"
          >
            {isSaving === "bulk-sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
            SINKRONISASI JUZ 1 (SEMUA)
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari thalibah..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-2xl bg-white border-2 border-slate-100 focus:border-[#800000]/20"
            />
          </div>

          <div className="bg-white rounded-3xl border-2 border-slate-50 shadow-sm overflow-hidden divide-y divide-slate-50 max-h-[70vh] overflow-y-auto">
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={cn(
                  "w-full p-4 flex items-center justify-between transition-all text-left",
                  selectedUserId === u.id ? "bg-[#800000]/5 border-l-4 border-l-[#800000]" : "hover:bg-slate-50 border-l-4 border-l-transparent"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-slate-800">{u.username || u.full_name}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">{u.mufradat_status || 'active'} • {u.mufradat_accessible_juz?.length || 0} Juz Unlocked</span>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform", selectedUserId === u.id ? "translate-x-1 text-[#800000]" : "text-slate-300")} />
              </button>
            ))}
          </div>
        </div>

        {/* Access Grid */}
        <div className="md:col-span-8">
          {selectedUser ? (
            <div className="space-y-6 text-left">
              <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
                <CardHeader className="bg-slate-900 text-white p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black font-headline uppercase leading-none">{selectedUser.username || selectedUser.full_name}</h2>
                        <p className="text-white/60 text-xs mt-1 font-medium">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="bg-white/5 border-white/20 text-white hover:bg-white/10 h-10 font-bold text-xs"
                         onClick={() => grantAll(selectedUser.id)}
                         disabled={isSaving === selectedUser.id}
                        >
                          BUKA SEMUA JUZ
                        </Button>
                        <Button 
                         variant="outline" 
                         size="sm" 
                         className="bg-white/5 border-white/20 text-white hover:bg-rose-500 hover:border-rose-500 h-10 font-bold text-xs"
                         onClick={() => revokeAll(selectedUser.id)}
                         disabled={isSaving === selectedUser.id}
                        >
                          TUTUP SEMUA
                        </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 bg-slate-50/50">
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
                      const isActive = selectedUser.mufradat_accessible_juz?.includes(juz);
                      const key = `${selectedUser.id}-${juz}`;
                      const loading = isSaving === key;

                      return (
                        <button
                          key={juz}
                          onClick={() => toggleJuz(selectedUser.id, juz)}
                          disabled={loading}
                          className={cn(
                            "group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all h-24",
                            isActive 
                              ? "bg-white border-[#800000] text-[#800000] shadow-md shadow-[#800000]/10 scale-[1.02]" 
                              : "bg-white/50 border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-white"
                          )}
                        >
                          <span className="text-[10px] font-black uppercase tracking-tighter opacity-50 group-hover:opacity-100">Juz</span>
                          <span className="text-2xl font-black">{juz}</span>
                          {loading ? (
                             <Loader2 className="absolute top-2 right-2 w-3 h-3 animate-spin opacity-50" />
                          ) : isActive ? (
                             <CheckCircle2 className="absolute top-2 right-2 w-4 h-4" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex items-start gap-4 p-6 bg-[#800000]/5 rounded-3xl border-2 border-[#800000]/10 border-dashed">
                 <Settings2 className="w-6 h-6 text-[#800000] shrink-0 mt-1" />
                 <div>
                    <h4 className="text-xs font-black text-[#800000] uppercase tracking-widest leading-none mb-1">Informasi Hak Akses</h4>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      Perubahan pada panel ini akan langsung berdampak pada akses thalibah. 
                      Thalibah yang belum memiliki akses Juz akan diarahkan ke halaman informasi pendaftaran.
                    </p>
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 gap-4">
              <BookOpen className="w-16 h-16 text-slate-200" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest px-12 text-center">Pilih thalibah di sebelah kiri untuk mengelola hak akses Juz.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
