'use client';

import { useState, useEffect, useMemo } from "react";
import { useUser, db } from "@/db";
import { useCollection } from "@/db";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Search, 
  UserCog, 
  ShieldCheck, 
  Mail, 
  Loader2, 
  CheckCircle2, 
  Users, 
  Calendar, 
  UserPlus, 
  Phone, 
  ShieldAlert, 
  GraduationCap, 
  Trash2, 
  CreditCard,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  BookOpen,
  Award
} from "lucide-react";
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
  { id: "learner", name: "Thalibah / User Umum" },
  { id: "muallimah", name: "Mu'allimah (Pengajar)" },
  { id: "musyrifah", name: "Musyrifah (Pendamping)" },
  { id: "admin", name: "Administrator" },
];

const PROGRAM_OPTIONS = [
  { id: "hi_mufradat", name: "Hi Mufradat" },
  { id: "hi_tikrar", name: "Hi Tikrar" },
  { id: "hi_ngaji", name: "Hi Ngaji" },
  { id: "hi_berbagi", name: "Hi Berbagi" },
  { id: "hi_mutabaah", name: "Hi Mutabaah" },
  { id: "hi_muhasabah", name: "Hi Muhasabah" },
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
  assigned_programs: [] as string[],
};

function formatWaLink(phone: string | undefined | null, greetingName?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
  else if (!normalized.startsWith('62')) normalized = '62' + normalized;
  const text = greetingName ? `?text=${encodeURIComponent(`Assalamu'alaikum Ukhti ${greetingName} 🌸`)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

const ITEMS_PER_PAGE = 25;

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add User States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);

  // Musyrifah Programs State
  const [editingAssignedPrograms, setEditingAssignedPrograms] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Activate confirmation dialog
  const [activateTarget, setActivateTarget] = useState<{ id: string; username: string } | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const { data: users, isLoading: isUsersLoading, refresh: refreshUsers } = useCollection("users");
  const { data: registrations, isLoading: isRegLoading } = useCollection("halaqah_registrations");
  const { data: redemptions, isLoading: isRedemptionsLoading } = useCollection("voucher_redemptions", { 
    select: "*, vouchers(*)" 
  });

  const isLoading = isUsersLoading || isRegLoading || isRedemptionsLoading;

  // KPI Counts
  const kpiStats = useMemo(() => {
    if (!users) return { total: 0, learners: 0, educators: 0, admins: 0, blacklisted: 0 };
    return {
      total: users.length,
      learners: users.filter(u => u.role_id === 'learner' || !u.role_id).length,
      educators: users.filter(u => u.role_id === 'muallimah' || u.role_id === 'musyrifah').length,
      admins: users.filter(u => u.role_id === 'admin').length,
      blacklisted: users.filter(u => u.is_blacklisted).length,
    };
  }, [users]);

  // Load musyrifah programs when editingUser changes
  useEffect(() => {
    async function loadMusyrifahPrograms() {
      if (editingUser?.role_id === 'musyrifah') {
        const { data } = await db
          .from('roles_musyrifah')
          .select('assigned_programs')
          .eq('id', editingUser.id)
          .maybeSingle();
        setEditingAssignedPrograms(data?.assigned_programs || []);
      } else {
        setEditingAssignedPrograms([]);
      }
    }
    loadMusyrifahPrograms();
  }, [editingUser?.id, editingUser?.role_id]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.whatsapp?.includes(q) ||
        u.phone?.includes(q);

      const userRole = u.role_id || 'learner';
      const matchRole = roleFilter === 'all' || userRole === roleFilter;

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !u.is_blacklisted) ||
        (statusFilter === 'blacklisted' && !!u.is_blacklisted);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil((filteredUsers.length || 1) / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const handleUpdateUser = async () => {
    if (!editingUser?.id) return;

    if (editingUser.role_id === 'musyrifah' && editingAssignedPrograms.length === 0) {
      toast({ variant: "destructive", title: "Musyrifah harus memiliki minimal 1 program." });
      return;
    }

    setIsSavingEdit(true);
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
      const { error } = await db.from('users').update(updateData).eq('id', editingUser.id);
      if (error) throw error;

      if (editingUser.role_id === 'admin') {
        await db.from('roles_admin').upsert({ id: editingUser.id });
      } else {
        await db.from('roles_admin').delete().eq('id', editingUser.id);
      }

      if (editingUser.role_id === 'musyrifah') {
        if (editingAssignedPrograms.length > 0) {
          await db.from('roles_musyrifah').upsert({
            id: editingUser.id,
            assigned_programs: editingAssignedPrograms
          });
        } else {
          await db.from('roles_musyrifah').delete().eq('id', editingUser.id);
        }
      } else {
        await db.from('roles_musyrifah').delete().eq('id', editingUser.id);
      }

      toast({
        title: "Data Diperbarui! ✅",
        description: `Profil ${editingUser.username || editingUser.full_name} berhasil diperbarui.`,
      });
      setIsEditDialogOpen(false);
      refreshUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal update", description: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete?.id) return;

    setIsDeleting(true);
    try {
      await db.from('roles_admin').delete().eq('id', userToDelete.id);
      await db.from('roles_musyrifah').delete().eq('id', userToDelete.id);

      const { error } = await db.from('users').delete().eq('id', userToDelete.id);
      
      if (error) {
        if (error.code === '23503') {
          throw new Error("Gagal menghapus: Masih ada relasi data (kuis, transaksi infaq, atau setoran) yang terhubung ke akun ini.");
        }
        throw error;
      }
      
      toast({
        title: "User Dihapus",
        description: `Akun ${userToDelete.username || userToDelete.full_name} berhasil dihapus dari sistem.`,
      });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      refreshUsers();
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Gagal menghapus", 
        description: err.message || "Terjadi kesalahan saat menghapus pengguna."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.email) {
      toast({ variant: "destructive", title: "Nama dan Email wajib diisi." });
      return;
    }

    if (addForm.role_id === 'musyrifah' && addForm.assigned_programs.length === 0) {
      toast({ variant: "destructive", title: "Musyrifah harus memiliki minimal 1 program terpilih." });
      return;
    }

    setIsAddingUser(true);
    const newUserId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`;

    try {
      const { error: userError } = await db.from("users").insert({
        id: newUserId,
        full_name: addForm.full_name.trim(),
        username: addForm.username.trim().toLowerCase().replace(/\s/g, '_'),
        email: addForm.email.trim().toLowerCase(),
        whatsapp: addForm.whatsapp.trim(),
        role_id: addForm.role_id,
        bank_name: addForm.bank_name.trim(),
        bank_account_number: addForm.bank_account_number.trim(),
        bank_account_holder: addForm.bank_account_holder.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (userError) throw userError;

      if (addForm.role_id === 'admin') {
        await db.from("roles_admin").upsert({ id: newUserId });
      }

      if (addForm.role_id === 'musyrifah' && addForm.assigned_programs.length > 0) {
        await db.from("roles_musyrifah").upsert({
          id: newUserId,
          assigned_programs: addForm.assigned_programs
        });
      }

      toast({
        title: "User Berhasil Dibuat! 🎉",
        description: `Akun ${addForm.username} sebagai ${ROLES.find(r => r.id === addForm.role_id)?.name} telah tersimpan.`,
      });
      setIsAddDialogOpen(false);
      setAddForm(INITIAL_ADD_FORM);
      refreshUsers();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal menambah user", description: e.message });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleConfirmActivate = async () => {
    if (!activateTarget) return;

    setIsActivating(true);
    try {
      const nextMonth = addMonths(new Date(), 1).toISOString();
      const { error } = await db.from("users").update({
        mufradat_due_date: nextMonth,
        mufradat_status: 'active',
        updated_at: new Date().toISOString()
      }).eq('id', activateTarget.id);

      if (error) throw error;
      
      toast({
        title: "Akses Diaktifkan! 🌟",
        description: `Masa aktif ${activateTarget.username} diperpanjang hingga ${format(new Date(nextMonth), 'd MMMM yyyy', { locale: id })}.`
      });
      setActivateTarget(null);
      refreshUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal aktivasi", description: err.message });
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#6D123F]" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Database Pengguna...</p>
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
            <span className="text-[#6D123F] font-bold">Database Pengguna & Role</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-slate-900 flex items-center gap-2.5">
            <UserCog className="w-7 h-7 text-[#6D123F]" />
            Database Pengguna & Role
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Kelola profil pengguna, hak akses peran (Admin, Mu&apos;allimah, Musyrifah, Thalibah), serta aktivasi program.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            onClick={() => refreshUsers()}
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 font-bold text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Segarkan
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold gap-2 rounded-xl text-xs h-9 shadow-sm">
                <UserPlus className="w-4 h-4" /> Tambah User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="w-5 h-5 text-[#6D123F]" />
                  Tambah User Baru
                </DialogTitle>
                <DialogDescription>
                  Daftarkan profil baru ke database (Admin, Mu&apos;allimah, Musyrifah, atau Thalibah).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Nama Lengkap</Label>
                  <Input
                    placeholder="Contoh: Fatimah Az-Zahra"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Username *</Label>
                  <Input
                    placeholder="Contoh: fatimah_88"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@contoh.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Nomor WhatsApp</Label>
                  <Input
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    value={addForm.whatsapp}
                    onChange={(e) => setAddForm({ ...addForm, whatsapp: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-600">Peran / Hak Akses</Label>
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

                {/* Program Assignment for Musyrifah in Add Form */}
                {addForm.role_id === 'musyrifah' && (
                  <div className="space-y-2.5 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <Label className="text-xs font-black uppercase text-emerald-700 tracking-wider">Program yang Dikelola</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {PROGRAM_OPTIONS.map((program) => (
                        <div key={program.id} className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-emerald-100">
                          <Checkbox
                            id={`add-program-${program.id}`}
                            checked={addForm.assigned_programs.includes(program.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAddForm({ ...addForm, assigned_programs: [...addForm.assigned_programs, program.id] });
                              } else {
                                setAddForm({ ...addForm, assigned_programs: addForm.assigned_programs.filter(p => p !== program.id) });
                              }
                            }}
                            className="border-emerald-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <label
                            htmlFor={`add-program-${program.id}`}
                            className="text-[11px] font-bold text-slate-700 cursor-pointer select-none"
                          >
                            {program.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bank Account Info (Optional) */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Informasi Rekening / Payout (Opsional)</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Nama Bank</Label>
                    <Input
                      placeholder="BSI / Mandiri / BCA"
                      value={addForm.bank_name}
                      onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">No. Rekening</Label>
                      <Input
                        placeholder="7209XXX"
                        value={addForm.bank_account_number}
                        onChange={(e) => setAddForm({ ...addForm, bank_account_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">Nama Pemilik</Label>
                      <Input
                        placeholder="Sesuai Buku Tabungan"
                        value={addForm.bank_account_holder}
                        onChange={(e) => setAddForm({ ...addForm, bank_account_holder: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddUser} 
                  disabled={isAddingUser}
                  className="w-full bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold gap-2 h-11 rounded-xl"
                >
                  {isAddingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Simpan User ke Database
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => { setRoleFilter('all'); setStatusFilter('all'); setCurrentPage(1); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            roleFilter === 'all' && statusFilter === 'all'
              ? "bg-[#6D123F]/5 border-[#6D123F] shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Semua User</span>
            <Users className="w-3.5 h-3.5 text-[#6D123F]" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{kpiStats.total}</p>
        </button>

        <button
          onClick={() => { setRoleFilter('learner'); setStatusFilter('all'); setCurrentPage(1); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            roleFilter === 'learner'
              ? "bg-purple-50 border-purple-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Thalibah</span>
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-900 mt-1">{kpiStats.learners}</p>
        </button>

        <button
          onClick={() => { setRoleFilter('muallimah'); setStatusFilter('all'); setCurrentPage(1); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            roleFilter === 'muallimah'
              ? "bg-blue-50 border-blue-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Mu&apos;allimah / Musyrifah</span>
            <Award className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-900 mt-1">{kpiStats.educators}</p>
        </button>

        <button
          onClick={() => { setRoleFilter('admin'); setStatusFilter('all'); setCurrentPage(1); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all",
            roleFilter === 'admin'
              ? "bg-amber-50 border-amber-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Admin</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">{kpiStats.admins}</p>
        </button>

        <button
          onClick={() => { setStatusFilter('blacklisted'); setCurrentPage(1); }}
          className={cn(
            "p-3 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1",
            statusFilter === 'blacklisted'
              ? "bg-rose-50 border-rose-500 shadow-sm"
              : "bg-white hover:bg-slate-50 border-slate-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Blacklisted</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-900 mt-1">{kpiStats.blacklisted}</p>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nama, username, email, WhatsApp..."
            className="pl-10 h-10 bg-slate-50 border-slate-200 text-xs rounded-xl focus-visible:ring-1"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Select 
            value={roleFilter} 
            onValueChange={(val) => { setRoleFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[150px] h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              <SelectItem value="learner">Thalibah</SelectItem>
              <SelectItem value="muallimah">Mu&apos;allimah</SelectItem>
              <SelectItem value="musyrifah">Musyrifah</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={statusFilter} 
            onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[140px] h-10 text-xs rounded-xl bg-slate-50 border-slate-200">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>

          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); setCurrentPage(1); }}
              className="text-xs text-rose-600 font-bold h-10 px-2.5 rounded-xl hover:bg-rose-50"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <Card className="border shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="bg-slate-50/70 px-6 py-3.5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6D123F]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Daftar Pengguna ({filteredUsers.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Halaman {currentPage} dari {totalPages || 1}
          </span>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 pl-6">Profil Pengguna</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Peran & Akses</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500">Masa Aktif & Program</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic text-sm">
                    Tidak ada pengguna yang cocok dengan kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => {
                  const waLink = formatWaLink(u.whatsapp || u.phone, u.full_name || u.username);
                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Column 1: Profil */}
                      <TableCell className="py-3 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
                            u.is_blacklisted 
                              ? "bg-rose-100 text-rose-700"
                              : u.role_id === 'admin' 
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-[#6D123F]/10 text-[#6D123F]"
                          )}>
                            {(u.full_name || u.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">
                                {u.full_name || u.username || 'Tanpa Nama'}
                              </span>
                              {u.is_blacklisted && (
                                <Badge className="bg-rose-600 text-white text-[8px] font-black px-1.5 py-0 border-none">
                                  BLACKLISTED
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5 text-slate-400" /> {u.email}
                              </span>
                              {u.username && (
                                <span className="text-[10px] text-slate-400 font-medium">@{u.username}</span>
                              )}
                              {(u.whatsapp || u.phone) && (
                                waLink ? (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors"
                                  >
                                    <Phone className="w-2.5 h-2.5" /> {u.whatsapp || u.phone}
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" /> {u.whatsapp || u.phone}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 2: Peran & Hak Akses */}
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                            u.role_id === 'admin' ? "bg-amber-500 text-white" :
                            u.role_id === 'muallimah' ? "bg-blue-600 text-white" :
                            u.role_id === 'musyrifah' ? "bg-emerald-600 text-white" :
                            "bg-purple-100 text-purple-700"
                          )}>
                            {u.role_id === 'learner' || !u.role_id
                              ? (u.followed_halaqahs?.length > 0 ? "Thalibah" : "User Umum")
                              : (ROLES.find(r => r.id === u.role_id)?.name || u.role_id)
                            }
                          </Badge>
                          {u.bank_name && (
                            <span className="text-[9px] text-slate-400 flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5" /> {u.bank_name} {u.bank_account_number ? `(${u.bank_account_number})` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Column 3: Masa Aktif & Program */}
                      <TableCell className="py-3">
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {access.dueDate ? (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
                                      <Calendar className={cn(
                                        "w-3 h-3",
                                        status === 'active' ? "text-emerald-600" : 
                                        status === 'grace_period' ? "text-amber-500" : "text-rose-600"
                                      )} />
                                      <span>{format(access.dueDate, 'd MMM yyyy', { locale: id })}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic font-medium">Belum Berlangganan</span>
                                  )}

                                  <Badge className={cn(
                                    "text-[8px] font-black uppercase px-1.5 py-0 border-none",
                                    status === 'active' ? "bg-emerald-100 text-emerald-700" : 
                                    status === 'grace_period' ? "bg-amber-100 text-amber-700" : 
                                    "bg-rose-100 text-rose-700"
                                  )}>
                                    {status}
                                  </Badge>

                                  {u.is_tikrar_paid && (
                                    <Badge className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0 border-none">
                                      Tikrar J{u.paidJuz || 30}
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-0.5">
                                  {u.created_at && (
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      Daftar: {format(new Date(u.created_at), 'dd/MM/yyyy')}
                                    </span>
                                  )}
                                  {!access.dueDate && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setActivateTarget({ id: u.id, username: u.username || u.full_name })}
                                      className="h-5 px-1.5 text-[8px] font-black uppercase text-emerald-600 hover:bg-emerald-50"
                                    >
                                      + 1 Bln Mufradat
                                    </Button>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>

                      {/* Column 4: Aksi */}
                      <TableCell className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {waLink && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                              title="Chat WhatsApp"
                            >
                              <a href={waLink} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-600 hover:bg-[#6D123F]/10 hover:text-[#6D123F] rounded-xl"
                            onClick={() => {
                              setEditingUser({ ...u });
                              setIsEditDialogOpen(true);
                            }}
                            title="Edit User"
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                            onClick={() => {
                              setUserToDelete(u);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Hapus User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} dari {filteredUsers.length} pengguna
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold px-2 text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-[#6D123F]" />
              Edit Profil Pengguna
            </DialogTitle>
            <DialogDescription>
              Perbarui data profil, peran, rekening, dan status blacklist.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="grid gap-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Nama Lengkap</Label>
                <Input
                  value={editingUser.full_name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Username</Label>
                <Input
                  value={editingUser.username || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Nomor WhatsApp</Label>
                <Input
                  placeholder="08123456789 atau 628123456789"
                  value={editingUser.whatsapp || editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, whatsapp: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-600">Peran Pengguna</Label>
                <Select
                  value={editingUser.role_id || "learner"}
                  onValueChange={(val) => setEditingUser({ ...editingUser, role_id: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Program Assignment for Musyrifah */}
              {editingUser.role_id === 'musyrifah' && (
                <div className="space-y-2.5 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <Label className="text-xs font-black uppercase text-emerald-700 tracking-wider">Program yang Dikelola</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PROGRAM_OPTIONS.map((program) => (
                      <div key={program.id} className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-emerald-100">
                        <Checkbox
                          id={`edit-program-${program.id}`}
                          checked={editingAssignedPrograms.includes(program.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditingAssignedPrograms([...editingAssignedPrograms, program.id]);
                            } else {
                              setEditingAssignedPrograms(editingAssignedPrograms.filter(p => p !== program.id));
                            }
                          }}
                          className="border-emerald-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <label
                          htmlFor={`edit-program-${program.id}`}
                          className="text-[11px] font-bold text-slate-700 cursor-pointer select-none"
                        >
                          {program.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Account */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#6D123F]" />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Informasi Payout / Rekening</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Nama Bank</Label>
                  <Input
                    placeholder="Contoh: BSI / Mandiri"
                    value={editingUser.bank_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, bank_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Nomor Rekening</Label>
                    <Input
                      placeholder="7209XXX"
                      value={editingUser.bank_account_number || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, bank_account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Nama Pemilik</Label>
                    <Input
                      placeholder="Sesuai Buku Tabungan"
                      value={editingUser.bank_account_holder || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, bank_account_holder: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Blacklist toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black text-rose-900 flex items-center gap-1.5 uppercase">
                    <ShieldAlert className="w-4 h-4 text-rose-600" /> Status Blacklist
                  </Label>
                  <p className="text-[10px] text-rose-600 font-medium">Blokir hak akses akun ke seluruh fitur aplikasi.</p>
                </div>
                <Button
                  variant={editingUser.is_blacklisted ? "destructive" : "outline"}
                  className={cn(
                    "font-black text-[10px] h-8 px-3 rounded-lg",
                    !editingUser.is_blacklisted && "text-rose-600 border-rose-200 hover:bg-rose-100"
                  )}
                  onClick={() => setEditingUser({ ...editingUser, is_blacklisted: !editingUser.is_blacklisted })}
                >
                  {editingUser.is_blacklisted ? 'BLACKLISTED' : 'AKTIF'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={handleUpdateUser} 
              disabled={isSavingEdit}
              className="w-full bg-[#6D123F] hover:bg-[#6D123F]/90 text-white font-bold gap-2 h-11 rounded-xl"
            >
              {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACTIVATE 1 MONTH CONFIRMATION */}
      <AlertDialog open={!!activateTarget} onOpenChange={(open) => !open && setActivateTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Aktifkan Akses Hi Mufradat
            </AlertDialogTitle>
            <AlertDialogDescription>
              Perpanjang masa aktif Hi Mufradat untuk <strong>{activateTarget?.username}</strong> selama 1 bulan dari sekarang?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmActivate}
              disabled={isActivating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isActivating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Aktifkan 1 Bulan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" /> Konfirmasi Hapus Akun
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{userToDelete?.username || userToDelete?.full_name}</strong>? Tindakan ini permanen dan akan menghapus data profil dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
