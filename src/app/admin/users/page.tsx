
'use client';

import { useState } from "react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
import { Search, UserCog, ShieldCheck, Mail, Loader2, ArrowLeft, CheckCircle2, Users, Calendar, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const LEVELS = [
  { id: "1", name: "Intensif" },
  { id: "2", name: "Reguler" },
  { id: "3", name: "Santai" },
  { id: "4", name: "Pemula" },
];

const INITIAL_ADD_FORM = {
  username: "",
  email: "",
  paidJuz: "30",
  tikrarLevel: "3",
  isTikrarPaid: false
};

export default function AdminUsersPage() {
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Add User States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !currentUser?.uid) return null;
    return collection(db, "users");
  }, [db, currentUser?.uid]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const filteredUsers = users?.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateUser = () => {
    if (!editingUser?.id) return;

    const userRef = doc(db, "users", editingUser.id);
    
    const updateData: any = {
      username: editingUser.username,
      paidJuz: parseInt(editingUser.paidJuz || "1"),
      tikrarLevel: parseInt(editingUser.tikrarLevel || "3"),
      isTikrarPaid: editingUser.isTikrarPaid,
      updatedAt: serverTimestamp(),
    };

    if (editingUser.tempDate) {
      updateData.tikrarStartDate = Timestamp.fromDate(new Date(editingUser.tempDate));
    }

    updateDocumentNonBlocking(userRef, updateData);

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

    // Simple ID generation for placeholder users (ideally email-based or random)
    const tempId = `user_${Date.now()}`;
    const userRef = doc(db, "users", tempId);

    try {
      setDocumentNonBlocking(userRef, {
        id: tempId,
        username: addForm.username,
        email: addForm.email,
        paidJuz: parseInt(addForm.paidJuz),
        tikrarLevel: parseInt(addForm.tikrarLevel),
        isTikrarPaid: addForm.isTikrarPaid,
        roleId: "learner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: "User Ditambahkan",
        description: `Profil ${addForm.username} berhasil dibuat di database.`,
      });
      setIsAddDialogOpen(false);
      setAddForm(INITIAL_ADD_FORM);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menambah user." });
    }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-4"><Loader2 className="animate-spin h-10 w-10 text-[#800000]" /><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memuat Daftar Peserta...</p></div>;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-32">
      <div className="flex items-center justify-between gap-4 px-1 mt-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Manajemen Peserta</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">Kelola Seluruh Santri Aktif</p>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#800000] hover:bg-[#800000]/90 font-bold gap-2">
              <UserPlus className="w-4 h-4" /> TAMBAH USER
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#800000]" />
                Tambah User Baru
              </DialogTitle>
              <DialogDescription>
                Masukkan data santri atau mu'allimah secara manual ke database.
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Target Juz</Label>
                  <Select 
                    value={addForm.paidJuz}
                    onValueChange={(val) => setAddForm({ ...addForm, paidJuz: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>Juz {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Level Tikrar</Label>
                  <Select 
                    value={addForm.tikrarLevel}
                    onValueChange={(val) => setAddForm({ ...addForm, tikrarLevel: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                <Label className="text-sm font-bold">Status Aktif Tikrar</Label>
                <Button 
                  variant={addForm.isTikrarPaid ? "default" : "outline"}
                  className={cn("font-black text-[10px]", addForm.isTikrarPaid ? "bg-emerald-600" : "text-rose-600 border-rose-600")}
                  onClick={() => setAddForm({ ...addForm, isTikrarPaid: !addForm.isTikrarPaid })}
                >
                  {addForm.isTikrarPaid ? 'AKTIF' : 'NON-AKTIF'}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddUser} className="w-full bg-[#800000] hover:bg-[#800000]/90 font-black gap-2 h-12">
                <CheckCircle2 className="w-5 h-5" /> SIMPAN USER
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Cari nama atau email santri..." 
          className="pl-11 h-12 bg-white border-none shadow-sm text-sm" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-[#800000]" />
            Daftar Santri ({filteredUsers?.length || 0})
          </h3>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="text-[10px] font-black uppercase">Santri</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Program Tikrar</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Level</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Tanggal Mulai</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredUsers || filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                    Tidak ada data peserta yang ditemukan.
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
                      {u.isTikrarPaid ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-500 text-[9px] font-black px-2 py-0.5">AKTIF</Badge>
                          <span className="text-xs font-bold text-[#800000]">Juz {u.paidJuz || '-'}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground">NON-AKTIF</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-muted-foreground">
                        {LEVELS.find(l => parseInt(l.id) === u.tikrarLevel)?.name || 'Santai'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <Calendar className="w-3 h-3 text-[#800000]" />
                        {u.tikrarStartDate?.toDate ? u.tikrarStartDate.toDate().toLocaleDateString('id-ID') : '-'}
                      </div>
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
                              Edit Data Peserta
                            </DialogTitle>
                            <DialogDescription>Perbarui hak akses dan profil santri ini.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Nama Pengguna</Label>
                              <Input 
                                value={editingUser?.username || ""} 
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Target Juz</Label>
                                <Select 
                                  value={editingUser?.paidJuz?.toString() || "30"}
                                  onValueChange={(val) => setEditingUser({ ...editingUser, paidJuz: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
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
                                  value={editingUser?.tikrarLevel?.toString() || "3"}
                                  onValueChange={(val) => setEditingUser({ ...editingUser, tikrarLevel: val })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LEVELS.map(l => (
                                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Tanggal Mulai Program</Label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="date"
                                  className="pl-10"
                                  value={editingUser?.tempDate || ""} 
                                  onChange={(e) => setEditingUser({ ...editingUser, tempDate: e.target.value })}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">Menentukan awal kalkulasi jadwal di tab 'Jadwal Saya'.</p>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-bold">Status Berbayar (Tikrar)</Label>
                                <p className="text-[10px] text-muted-foreground">Aktifkan untuk membuka counter repetisi.</p>
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
