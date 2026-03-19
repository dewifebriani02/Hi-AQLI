
'use client';

import { useState } from "react";
import { useUser } from "@/supabase";
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
import { Search, UserCog, ShieldCheck, Mail, Loader2, ArrowLeft, CheckCircle2, Users, Calendar, UserPlus, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { id: "learner", name: "Santri (Thalibah)" },
  { id: "muallimah", name: "Mu'allimah (Guru)" },
  { id: "musyrifah", name: "Musyrifah (Pembimbing)" },
  { id: "admin", name: "Administrator" },
];

const TIKRAR_LEVELS = [
  { id: "1", name: "Intensif" },
  { id: "2", name: "Reguler" },
  { id: "3", name: "Santai" },
  { id: "4", name: "Pemula" },
];

const INITIAL_ADD_FORM = {
  username: "",
  email: "",
  roleId: "learner",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Add User States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);

  const { data: users, isLoading } = useCollection("users");

  const filteredUsers = users?.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateUser = () => {
    if (!editingUser?.id) return;

    const updateData: any = {
      username: editingUser.username,
      roleId: editingUser.roleId,
      paidJuz: editingUser.paidJuz ? parseInt(editingUser.paidJuz) : null,
      tikrarLevel: editingUser.tikrarLevel ? parseInt(editingUser.tikrarLevel) : null,
      isTikrarPaid: editingUser.isTikrarPaid || false,
      updatedAt: new Date().toISOString(),
    };

    if (editingUser.tempDate) {
      updateData.tikrarStartDate = new Date(editingUser.tempDate).toISOString();
    }

    updateDocumentNonBlocking("users", editingUser.id, updateData);

    // If role is admin, ensure they are in roles_admin
    if (editingUser.roleId === 'admin') {
      // roles_admin only has id and created_at, no roleId column
      addDocumentNonBlocking("roles_admin", { id: editingUser.id });
    }

    toast({
      title: "Data Diperbarui",
      description: `Profil ${editingUser.username} telah berhasil diupdate.`,
    });
    setIsEditDialogOpen(false);
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
        username: addForm.username,
        email: addForm.email,
        roleId: addForm.roleId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (addForm.roleId === 'admin') {
        addDocumentNonBlocking("roles_admin", { id: tempId });
      }

      toast({
        title: "User Ditambahkan",
        description: `Profil ${addForm.username} sebagai ${ROLES.find(r => r.id === addForm.roleId)?.name} berhasil dibuat.`,
      });
      setIsAddDialogOpen(false);
      setAddForm(INITIAL_ADD_FORM);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menambah user." });
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
                Daftarkan profil umum ke database (Admin, Mu'allimah, atau Santri).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Nama Pengguna</Label>
                <Input
                  placeholder="Contoh: Mu'allimah Fatimah"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
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
                <Label className="text-xs font-bold uppercase">Peran / Hak Akses</Label>
                <Select
                  value={addForm.roleId}
                  onValueChange={(val) => setAddForm({ ...addForm, roleId: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <TableHead className="text-[10px] font-black uppercase text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredUsers || filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic text-sm">
                    Tidak ada data yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{u.username || 'Tanpa Nama'}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase",
                        u.roleId === 'admin' ? "bg-amber-500 text-white border-none" :
                          u.roleId === 'muallimah' ? "bg-blue-600 text-white border-none" :
                            u.roleId === 'musyrifah' ? "bg-emerald-600 text-white border-none" : ""
                      )}>
                        {ROLES.find(r => r.id === u.roleId)?.name || 'Santri'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={isEditDialogOpen && editingUser?.id === u.id} onOpenChange={(open) => {
                        if (!open) setEditingUser(null);
                        setIsEditDialogOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#800000]/10 hover:text-[#800000]"
                            onClick={() => setEditingUser({
                              ...u,
                              tempDate: u.tikrarStartDate?.toDate ? u.tikrarStartDate.toDate().toISOString().split('T')[0] : ""
                            })}
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
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Nama Pengguna</Label>
                              <Input
                                value={editingUser?.username || ""}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Peran User</Label>
                              <Select
                                value={editingUser?.roleId || "learner"}
                                onValueChange={(val) => setEditingUser({ ...editingUser, roleId: val })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROLES.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Tikrar Section - Only show if relevant or explicitly needed */}
                            <div className="border-t pt-4 space-y-4">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Detail Khusus Tikrar (Jika Ada)</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Target Juz</Label>
                                  <Select
                                    value={editingUser?.paidJuz?.toString() || ""}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, paidJuz: val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 30 }, (_, i) => (
                                        <SelectItem key={i + 1} value={(i + 1).toString()}>Juz {i + 1}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Level Tikrar</Label>
                                  <Select
                                    value={editingUser?.tikrarLevel?.toString() || ""}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, tikrarLevel: val })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TIKRAR_LEVELS.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                <div className="space-y-0.5">
                                  <Label className="text-sm font-bold">Status Premium Tikrar</Label>
                                  <p className="text-[10px] text-muted-foreground">Aktifkan akses counter repetisi.</p>
                                </div>
                                <Button
                                  variant={editingUser?.isTikrarPaid ? "default" : "outline"}
                                  className={cn("font-black text-[10px]", editingUser?.isTikrarPaid ? "bg-emerald-600" : "text-rose-600 border-rose-600")}
                                  onClick={() => setEditingUser({ ...editingUser, isTikrarPaid: !editingUser.isTikrarPaid })}
                                >
                                  {editingUser?.isTikrarPaid ? 'AKTIF' : 'NON-AKTIF'}
                                </Button>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateUser} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2">
                              <CheckCircle2 className="w-4 h-4" /> SIMPAN PERUBAHAN
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
