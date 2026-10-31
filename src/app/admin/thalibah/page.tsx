'use client';

import { useState, useMemo } from "react";
import {useUser, db } from "@/db";
import { useCollection } from "@/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Users, BookOpen, ShieldAlert, ShieldCheck, Trash2, Loader2, ArrowLeft, Calendar, MessageCircle, Send, Phone } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function formatWaLink(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
  else if (!normalized.startsWith('62')) normalized = '62' + normalized;
  return `https://wa.me/${normalized}`;
}

export default function AdminThalibahPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "blacklisted">("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all users with role = learner
  const { data: allUsers, isLoading: isUsersLoading } = useCollection("users");

  // Fetch all registrations
  const { data: allRegistrations, isLoading: isRegistrationsLoading } = useCollection("halaqah_registrations");

  // Fetch all halaqahs/classes
  const { data: allHalaqahs } = useCollection("halaqahs");

  // Filter and process thalibah data
  const thalibahData = useMemo(() => {
    if (!allUsers || !allRegistrations) return [];

    const learners = allUsers.filter(u => u.role_id === 'learner');

    return learners.map(learner => {
      const userRegs = allRegistrations.filter(r => r.user_id === learner.id && r.status === 'active');
      const programs = userRegs.map(r => ({
        id: r.id,
        halaqah_id: r.halaqah_id,
        halaqah_title: r.halaqah_title,
        program_type: allHalaqahs?.find(h => h.id === r.halaqah_id)?.program_type,
        joined_at: r.verified_at || r.created_at,
        is_paid: r.is_paid,
        payment_method: r.payment_method,
      }));

      return {
        ...learner,
        activePrograms: programs,
        totalPrograms: programs.length,
      };
    });
  }, [allUsers, allRegistrations, allHalaqahs]);

  // Get unique program types for filter
  const programTypes = useMemo(() => {
    const types = new Set<string>();
    thalibahData.forEach(t => {
      t.activePrograms.forEach((p: any) => {
        if (p.program_type) types.add(p.program_type);
      });
    });
    return Array.from(types);
  }, [thalibahData]);

  // Filter thalibah based on search and filters
  const filteredThalibah = useMemo(() => {
    return thalibahData.filter(thalibah => {
      // Search filter
      const matchesSearch = !searchQuery ||
        thalibah.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thalibah.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thalibah.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "blacklisted" && thalibah.is_blacklisted) ||
        (filterStatus === "active" && !thalibah.is_blacklisted);

      // Program filter
      const matchesProgram =
        filterProgram === "all" ||
        thalibah.activePrograms.some((p: any) => p.program_type === filterProgram);

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [thalibahData, searchQuery, filterStatus, filterProgram]);

  const handleToggleBlacklist = async (thalibah: any) => {
    setIsLoading(true);
    try {
      const { error } = await db
        .from("users")
        .update({ is_blacklisted: !thalibah.is_blacklisted })
        .eq('id', thalibah.id);

      if (error) throw error;

      toast({
        title: thalibah.is_blacklisted ? "Thalibah Diaktifkan" : "Thalibah Di-Blacklist",
        description: `${thalibah.username || thalibah.full_name} sekarang ${thalibah.is_blacklisted ? 'aktif' : 'di-blacklist'}.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal update status",
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromProgram = async (registrationId: string) => {
    if (!confirm("Hapus akses program ini? Thalibah tidak bisa lagi mengakses program ini.")) return;

    setIsLoading(true);
    try {
      const { error } = await db
        .from("halaqah_registrations")
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: "Akses Program Dihapus",
        description: "Thalibah berhasil dihapus dari program.",
      });

      // Refresh data
      window.location.reload();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUsersLoading || isRegistrationsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#800000]" />
        <p className="text-sm font-bold text-muted-foreground">Memuat data thalibah...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline tracking-tight">Direktori Thalibah</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-[#800000]">
              {filteredThalibah.length} Thalibah • {thalibahData.filter((t: any) => !t.is_blacklisted).length} Aktif
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-slate-100">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Cari Thalibah</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nama, username, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Status</Label>
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Program Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Program</Label>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Program</SelectItem>
                  {programTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'hi_mufradat' ? 'Hi Mufradat' :
                       type === 'tikrar_daily' ? 'Hi Tikrar' :
                       type === 'hi_ngaji' ? 'Hi Ngaji' : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thalibah List */}
      {filteredThalibah.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-16 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-lg font-bold text-muted-foreground">Tidak ada thalibah ditemukan</p>
            <p className="text-sm text-muted-foreground">Coba ubah filter atau kata pencarian</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredThalibah.map((thalibah: any) => (
            <Card key={thalibah.id} className={cn(
              "border-2 transition-all hover:shadow-lg",
              thalibah.is_blacklisted ? "bg-rose-50/50 border-rose-200" : "border-slate-100"
            )}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* User Info */}
                  <div className="flex items-center gap-4 lg:w-1/3">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0",
                      thalibah.is_blacklisted ? "bg-rose-200 text-rose-700" : "bg-[#800000]/10 text-[#800000]"
                    )}>
                      {thalibah.username?.[0] || thalibah.full_name?.[0] || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tight">
                          {thalibah.full_name || thalibah.username}
                        </span>
                        {thalibah.is_blacklisted && (
                          <Badge className="bg-rose-600 text-white text-[9px] font-black px-2 py-0">
                            BLACKLISTED
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {thalibah.email}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-black">
                          {thalibah.totalPrograms} Program
                        </Badge>
                        {thalibah.totalPrograms > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[9px] font-black border-emerald-200">
                            Aktif
                          </Badge>
                        )}
                        {thalibah.created_at && (
                          <span className="text-[9px] text-muted-foreground font-bold flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(thalibah.created_at), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                      {thalibah.whatsapp && (
                        <a
                          href={formatWaLink(thalibah.whatsapp) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 text-[9px] font-black text-emerald-600 hover:text-emerald-700 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <MessageCircle className="w-3 h-3" />
                          {thalibah.whatsapp}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Programs */}
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs font-black uppercase text-muted-foreground">
                      Program Yang Diikuti
                    </Label>
                    {thalibah.activePrograms.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Belum mengikuti program apa pun</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {thalibah.activePrograms.map((prog: any) => (
                          <Badge
                            key={prog.id}
                            className={cn(
                              "text-[10px] font-black px-3 py-1 border-2 flex items-center gap-1.5 group relative",
                              prog.program_type === 'hi_mufradat' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              prog.program_type === 'tikrar_daily' ? "bg-blue-100 text-blue-700 border-blue-200" :
                              "bg-purple-100 text-purple-700 border-purple-200"
                            )}
                          >
                            <BookOpen className="w-3 h-3" />
                            {prog.halaqah_title}
                            <button
                              onClick={() => handleRemoveFromProgram(prog.id)}
                              className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors"
                              title="Hapus dari program"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 lg:w-auto">
                    {formatWaLink(thalibah.whatsapp) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-black text-[10px] uppercase gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        asChild
                      >
                        <a href={formatWaLink(thalibah.whatsapp)!} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-3.5 h-3.5" /> Chat WA
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "font-black text-[10px] uppercase gap-2",
                        !thalibah.is_blacklisted && "text-rose-600 border-rose-200 hover:bg-rose-50"
                      )}
                      onClick={() => handleToggleBlacklist(thalibah)}
                      disabled={isLoading}
                    >
                      {thalibah.is_blacklisted ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" /> Aktifkan
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" /> Blacklist
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-black text-[10px] uppercase"
                      onClick={() => { setSelectedUser(thalibah); setIsDialogOpen(true); }}
                    >
                      <Users className="w-3.5 h-3.5 mr-1" /> Detail
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#800000]" />
              Detail Thalibah
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap dan riwayat program
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* User Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Username</Label>
                  <p className="font-bold">{selectedUser.username || '-'}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Email</Label>
                  <p className="font-bold text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Nama Lengkap</Label>
                  <p className="font-bold">{selectedUser.full_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">WhatsApp</Label>
                  {formatWaLink(selectedUser.whatsapp) ? (
                    <a
                      href={formatWaLink(selectedUser.whatsapp)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {selectedUser.whatsapp}
                    </a>
                  ) : (
                    <p className="font-bold text-muted-foreground">-</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Bergabung Aplikasi</Label>
                  <p className="font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedUser.created_at ? format(new Date(selectedUser.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Status</Label>
                  <p className="font-bold">
                    {selectedUser.is_blacklisted ? (
                      <span className="text-rose-600">Blacklisted</span>
                    ) : (
                      <span className="text-emerald-600">Aktif</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Program History */}
              <div>
                <Label className="text-xs font-black uppercase mb-3 block">Program Aktif</Label>
                {selectedUser.activePrograms.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Belum mengikuti program</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.activePrograms.map((prog: any) => (
                      <div key={prog.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                        <div>
                          <p className="text-sm font-bold">{prog.halaqah_title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Bergabung: {prog.joined_at ? format(new Date(prog.joined_at), 'dd MMM yyyy') : '-'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">
                            {prog.is_paid ? (prog.payment_method === 'voucher' ? 'Voucher' : 'Berbayar') : 'Gratis'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                            onClick={() => handleRemoveFromProgram(prog.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedUser && formatWaLink(selectedUser.whatsapp) && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-2 sm:mr-auto"
                asChild
              >
                <a href={formatWaLink(selectedUser.whatsapp)!} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" /> Chat di WhatsApp
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
