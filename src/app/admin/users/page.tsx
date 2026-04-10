
'use client';

import { useState } from "react";
import { useUser, supabase } from "@/supabase";
import { useCollection } from "@/supabase/db";
import { updateDocumentNonBlocking, addDocumentNonBlocking } from "@/supabase/non-blocking-updates";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Search, UserCog, ShieldCheck, Mail, Loader2, ArrowLeft, CheckCircle2, Users, Calendar, UserPlus, UserCircle, Phone, ShieldAlert, GraduationCap, Trash2, CreditCard } from "lucide-react";
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
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { getMufradatStatus } from "@/lib/mufradat-access";
import { format, addMonths } from "date-fns";
import { id } from "date-fns/locale";

const ROLES = [
  { id: "learner", name: "Thalibah / User" }, // Dynamic label handling
  { id: "muallimah", name: "Mu'allimah" },
  { id: "musyrifah", name: "Musyrifah" },
  { id: "admin", name: "Administrator" },
];

const INITIAL_ADD_FORM = {
  full_name: "",
  username: "",
  email: "",
  whatsapp: "",
  role_id: "learner",
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // Add User States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);

  const { data: users, isLoading: isUsersLoading, refresh: refreshUsers } = useCollection("users");
  const { data: registrations, isLoading: isRegLoading } = useCollection("halaqah_registrations");
  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection("voucher_redemptions", { 
    select: "*, vouchers(*)" 
  });

  const isLoading = isUsersLoading || isRegLoading || isRedemptionsLoading;

  const filteredUsers = users?.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateUser = async () => {
    if (!editingUser?.id) return;

    const updateData: any = {
      full_name: editingUser.full_name || "",
      username: editingUser.username,
      role_id: editingUser.role_id,
      whatsapp: editingUser.whatsapp || editingUser.phone || "",
      bank_name: editingUser.bank_name || "",
      bank_account_number: editingUser.bank_account_number || "",
      bank_account_holder: editingUser.bank_account_holder || "",
      is_blacklisted: editingUser.is_blacklisted || false,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('users').update(updateData).eq('id', editingUser.id);
      if (error) throw error;

      if (editingUser.role_id === 'admin') {
        await supabase.from('roles_admin').upsert({ id: editingUser.id });
      }

      toast({
        title: "Data Diperbarui",
        description: `Profil ${editingUser.username} telah berhasil diupdate.`,
      });
      setIsEditDialogOpen(false);
      refreshUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal update", description: err.message });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) return;

    try {
      // First, try to remove from roles_admin manually just in case
      await supabase.from('roles_admin').delete().eq('id', userToDelete.id);

      // Now delete the user. The DB should handle cascading for quiz_attempts, voucher_redemptions, etc.
      const { data, error } = await supabase.from('users').delete().eq('id', userToDelete.id).select();
      
      if (error) {
        // Handle the specific foreign key error with a helpful message if DB migration hasn't run yet
        if (error.code === '23503') {
          throw new Error("Gagal menghapus: Masih ada data terkait (seperti kuis atau registrasi) yang bergantung pada user ini. Silakan jalankan migrasi database terbaru atau hubungi developer.");
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        toast({
          variant: "destructive",
          title: "Gagal menghapus",
          description: "Data thalibah tidak ditemukan atau akses ditolak.",
        });
        setIsDeleteDialogOpen(false);
        return;
      }
      
      toast({
        title: "User Dihapus",
        description: `Profil ${userToDelete.username || userToDelete.full_name} telah berhasil dihapus.`,
      });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      refreshUsers();
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Gagal menghapus", 
        description: err.message || "Terjadi kesalahan internal saat menghapus user."
      });
    }
  };

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.email) {
      toast({ variant: "destructive", title: "Nama dan Email wajib diisi." });
      return;
    }

    const tempId = `user_${Date.now()}`;

    try {
      addDocumentNonBlocking("users", {
        id: tempId,
        full_name: addForm.full_name,
        username: addForm.username,
        email: addForm.email,
        whatsapp: addForm.whatsapp,
        role_id: addForm.role_id,
        bank_name: addForm.bank_name,
        bank_account_number: addForm.bank_account_number,
        bank_account_holder: addForm.bank_account_holder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (addForm.role_id === 'admin') {
        addDocumentNonBlocking("roles_admin", { id: tempId });
      }

      toast({
        title: "User Ditambahkan",
        description: `Profil ${addForm.username} sebagai ${ROLES.find(r => r.id === addForm.role_id)?.name} berhasil dibuat.`,
      });
      setIsAddDialogOpen(false);
      setAddForm(INITIAL_ADD_FORM);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menambah user." });
    }
  };

  const handleActivateUser = async (userId: string, username: string) => {
    if (!confirm(`Aktifkan akses Hi Mufradat untuk ${username} selama 1 bulan dari sekarang?`)) return;

    try {
      const nextMonth = addMonths(new Date(), 1).toISOString();
      updateDocumentNonBlocking("users", userId, { 
        mufradat_due_date: nextMonth,
        mufradat_status: 'active'
      });
      
      toast({
        title: "Akses Diaktifkan",
        description: `Masa aktif ${username} telah diperpanjang hingga ${format(new Date(nextMonth), 'd MMMM yyyy', { locale: id })}.`
      });
      
      refreshUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal aktivasi", description: err.message });
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Daftar...</p></div>;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      <div className="flex items-center justify-between gap-4 px-1 mt-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Database Profil</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Manajemen User HI AQLI</p>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
              <UserPlus className="w-4 h-4" /> TAMBAH USER UMUM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#800000]" />
                Tambah User Baru
              </DialogTitle>
              <DialogDescription>
                Daftarkan profil umum ke database (Admin, Mu'allimah, atau Thalibah).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Nama Lengkap Sesuai KTP</Label>
                <Input
                  placeholder="Contoh: Fatimah Az-Zahra"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Username</Label>
                <Input
                  placeholder="Contoh: fatimah_88"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Email</Label>
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Nomor WhatsApp</Label>
                <Input
                  placeholder="Contoh: 62812345678"
                  value={addForm.whatsapp}
                  onChange={(e) => setAddForm({ ...addForm, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Peran / Hak Akses</Label>
                <Select
                  value={addForm.role_id}
                  onValueChange={(val) => setAddForm({ ...addForm, role_id: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* BANK DETAILS IN ADD FORM */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid gap-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Informasi Rekening (Oksional)</p>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Nama Bank</Label>
                  <Input
                    placeholder="Contoh: BSI / Mandiri"
                    value={addForm.bank_name}
                    onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">No. Rekening</Label>
                    <Input
                      placeholder="000XXX000"
                      value={addForm.bank_account_number}
                      onChange={(e) => setAddForm({ ...addForm, bank_account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase">Nama Pemilik</Label>
                    <Input
                      placeholder="Nama di Buku Tabungan"
                      value={addForm.bank_account_holder}
                      onChange={(e) => setAddForm({ ...addForm, bank_account_holder: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddUser} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2 h-12">
                <CheckCircle2 className="w-5 h-5" /> SIMPAN KE DATABASE
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau email..."
          className="pl-11 h-12 bg-white border-none shadow-sm text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 border-b">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-[#800000]" />
            Daftar User ({filteredUsers?.length || 0})
          </h3>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="text-[10px] font-black uppercase">Nama & Email</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Peran</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Masa Aktif</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredUsers || filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic text-sm">
                    Tidak ada data yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{u.full_name || u.username || 'Tanpa Nama'}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                          {(u.whatsapp || u.phone) && <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Phone className="w-3 h-3" /> {u.whatsapp || u.phone}</span>}
                          {u.username && <span className="text-[10px] text-slate-400 font-medium">@{u.username}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase",
                          u.role_id === 'admin' ? "bg-amber-500 text-white border-none" :
                            u.role_id === 'muallimah' ? "bg-blue-600 text-white border-none" :
                              u.role_id === 'musyrifah' ? "bg-emerald-600 text-white border-none" : ""
                        )}>
                          {u.role_id === 'learner' 
                            ? (u.followed_halaqahs?.length > 0 ? "Thalibah" : "User Umum")
                            : (ROLES.find(r => r.id === u.role_id)?.name || 'User')
                          }
                        </Badge>
                        {u.is_blacklisted && (
                          <Badge className="bg-rose-600 text-white border-none text-[9px] font-black uppercase tracking-widest">
                            BLACKLISTED
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(() => {
                           const userRegs = registrations?.filter(r => r.user_id === u.id) || [];
                           const userReds = redemptions?.filter(r => r.user_id === u.id) || [];
                           const access = getMufradatStatus({
                             user: u, 
                             registrations: userRegs, 
                             redemptions: userReds
                           });
                           const status = access.status;
                           
                           return (
                             <>
                               {access.dueDate ? (
                                 <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 w-fit">
                                   <Calendar className={cn(
                                     "w-3 h-3",
                                     status === 'active' ? "text-emerald-600" : 
                                     status === 'grace_period' ? "text-amber-500" : "text-rose-600"
                                   )} />
                                   <span className={cn(
                                     "text-[10px] font-black uppercase tracking-tight",
                                     status === 'active' ? "text-emerald-700" : 
                                     status === 'grace_period' ? "text-amber-700" : "text-rose-700"
                                   )}>
                                     {format(access.dueDate, 'd MMM yyyy', { locale: id })}
                                   </span>
                                 </div>
                               ) : (
                                 <div className="flex flex-col gap-1">
                                   <span className="text-[10px] text-muted-foreground italic font-medium px-2">Belum Aktif</span>
                                   <Button 
                                     size="sm" 
                                     variant="outline"
                                     onClick={() => handleActivateUser(u.id, u.username || u.full_name)}
                                     className="h-6 px-2 text-[8px] font-black uppercase tracking-tighter border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                   >
                                     <UserPlus className="w-2.5 h-2.5 mr-1" /> AKTIFKAN
                                   </Button>
                                 </div>
                               )}
                               <div className="flex items-center gap-3 px-2">
                                 {u.created_at && (
                                   <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">Reg: {new Date(u.created_at).toLocaleDateString('id-ID')}</span>
                                 )}
                                 <span className={cn(
                                   "text-[7px] font-black px-1.5 rounded-sm uppercase tracking-widest",
                                   status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                                   status === 'grace_period' ? "bg-amber-100 text-amber-700" : 
                                   "bg-rose-100 text-rose-700"
                                 )}>
                                   {status}
                                 </span>
                               </div>
                             </>
                           );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog open={isEditDialogOpen && editingUser?.id === u.id} onOpenChange={(open) => {
                        if (!open) setEditingUser(null);
                        setIsEditDialogOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#800000]/10 hover:text-[#800000]"
                            onClick={() => setEditingUser(u)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-[#800000]" />
                              Edit Profil User
                            </DialogTitle>
                            <DialogDescription>Perbarui data dan hak akses user ini.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Nama Lengkap</Label>
                              <Input
                                value={editingUser?.full_name || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Username</Label>
                              <Input
                                value={editingUser?.username || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Nomor WhatsApp</Label>
                              <Input
                                placeholder="Contoh: 62812345678"
                                value={editingUser?.whatsapp || editingUser?.phone || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, whatsapp: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Peran User</Label>
                              <Select
                                value={editingUser?.role_id || "learner"}
                                onValueChange={(val) => setEditingUser({ ...editingUser, role_id: val })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROLES.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.id === 'learner' 
                                        ? (editingUser?.followed_halaqahs?.length > 0 ? "Thalibah" : "User Umum") 
                                        : r.name
                                      }
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 grid gap-4">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-[#800000]" />
                                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Informasi Payout / Rekening</span>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nama Bank</Label>
                                  <Input
                                    placeholder="Contoh: BSI / Bank Syariah Indonesia"
                                    value={editingUser?.bank_name || ""}
                                    onChange={(e) => setEditingUser({ ...editingUser, bank_name: e.target.value })}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nomor Rekening</Label>
                                    <Input
                                      placeholder="7209XXX"
                                      value={editingUser?.bank_account_number || ""}
                                      onChange={(e) => setEditingUser({ ...editingUser, bank_account_number: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Nama Pemilik</Label>
                                    <Input
                                      placeholder="Sesuai Buku Tabungan"
                                      value={editingUser?.bank_account_holder || ""}
                                      onChange={(e) => setEditingUser({ ...editingUser, bank_account_holder: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border-2 border-dashed border-rose-200">
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-black text-rose-900 flex items-center gap-1.5 uppercase">
                                    <ShieldAlert className="w-4 h-4" /> Blacklist User
                                  </Label>
                                  <p className="text-[10px] text-rose-600 font-medium">Blokir akses ke seluruh menu Hi AQLI.</p>
                                </div>
                                <Button
                                  variant={editingUser?.is_blacklisted ? "destructive" : "outline"}
                                  className={cn("font-black text-[10px] h-9 px-4", !editingUser?.is_blacklisted && "text-rose-600 border-rose-200")}
                                  onClick={() => setEditingUser({ ...editingUser, is_blacklisted: !editingUser?.is_blacklisted })}
                                >
                                  {editingUser?.is_blacklisted ? 'BLACKLISTED' : 'AKTIF'}
                                </Button>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateUser} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2">
                              <CheckCircle2 className="w-4 h-4" /> SIMPAN PERUBAHAN
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-rose-100 hover:text-rose-600"
                        onClick={() => {
                          setUserToDelete(u);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" /> Konfirmasi Hapus User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{userToDelete?.username}</strong>? Tindakan ini permanen dan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Ya, Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
