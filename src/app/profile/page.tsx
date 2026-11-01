'use client';

import { useUser, signOut, db } from '@/db';
import { useDoc, useCollection, useCount } from '@/db';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  Mail,
  Calendar,
  HeartHandshake,
  BookOpen,
  Trophy,
  ChevronRight,
  CheckCircle2,
  Medal,
  Star,
  History,
  ShieldCheck,
  Zap,
  ArrowRight,
  Copy,
  Fingerprint,
  Loader2,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { normalizeWhatsapp, whatsappErrorMessage } from '@/lib/whatsapp';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const STATIC_HALAQAH_TITLES: Record<string, string> = {
  'tikrar-j30-b1': 'Hi Tikrar (Tikrar Daily)',
  'tikrar-premium': 'Hi Tikrar (Tikrar Daily)',
  'mufradat-premium': 'Hi Mufradat',
  'tafsir-j30': "Tafsir Juz' Amma",
  'tajwid-adv': 'Tajwid Lanjutan: Sifaat Al-Huroof',
  'sirah-nabi': 'Sirah Nabi (SAW)',
};

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [salutation, setSalutation] = useState("Ukhti");

  // Check Admin Roles (guarded when user is not loaded)
  const { data: adminRole } = useDoc(user ? "roles_admin" : null, user?.id);
  const { data: superAdminRole } = useDoc(user ? "roles_superadmin" : null, user?.id);

  // Fetch real donation history
  const donationOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    orderBy: { column: 'created_at', ascending: false },
    limit: 20
  }), [user?.id]);

  const { data: donations } = useCollection(user ? "donations" : null, donationOptions);
  const { data: halaqahs } = useCollection(user ? "halaqahs" : null);

  // Fetch user data for payment status and points
  const { data: userData } = useDoc(user ? "users" : null, user?.id);
  const fullSalutation = userData?.salutation || "Ukhti";
  const isPaid = userData?.is_tikrar_paid;
  const paidJuz = userData?.paidJuz ?? userData?.paid_juz ?? 1;
  const points = userData?.points || 0;
  const { count: higherPointsCount } = useCount(user ? "users" : null, useMemo(() => ({
    filters: [{ column: 'points', operator: '>', value: points }]
  }), [points]));
  
  const rank = points > 0 ? (higherPointsCount !== null ? higherPointsCount + 1 : '-') : '-';

  const validFollowedHalaqahs = useMemo(() => {
    if (!Array.isArray(userData?.followed_halaqahs)) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const raw of userData.followed_halaqahs) {
      if (typeof raw === 'string' && raw.trim().length > 0 && !seen.has(raw.trim())) {
        seen.add(raw.trim());
        list.push(raw.trim());
      }
    }
    return list;
  }, [userData?.followed_halaqahs]);

  const resolveHalaqahTitle = (hid: string) => {
    const dbMatch = halaqahs?.find((h: any) => h.id === hid);
    if (dbMatch?.title) return dbMatch.title;
    if (STATIC_HALAQAH_TITLES[hid]) return STATIC_HALAQAH_TITLES[hid];
    return hid.replace(/-/g, ' ');
  };

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Sync form with userData
  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name || user?.user_metadata?.full_name || "");
      setUsername(userData.username || "");
      setWhatsapp(userData.whatsapp || "");
      setSalutation(userData.salutation || "Ukhti");
    }
  }, [userData, user]);

  // Open edit modal if ?edit=true
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditDialogOpen(true);
    }
  }, [searchParams]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const waError = whatsappErrorMessage(whatsapp);
    if (waError) {
      toast({ variant: "destructive", title: "Nomor WhatsApp tidak valid", description: waError });
      return;
    }
    const normalizedWa = normalizeWhatsapp(whatsapp);

    setIsUpdating(true);
    try {
      const updatePayload: any = {
        full_name: fullName,
        username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        whatsapp: normalizedWa,
        salutation: salutation,
        metadata: {
          ...(userData?.metadata || {}),
          has_chosen_salutation: true
        }
      };
      if (normalizedWa !== userData?.whatsapp) {
        updatePayload.wa_failed_count = 0;
        updatePayload.wa_blocked_at = null;
      }

      const { error } = await db
        .from('users')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profil Diperbarui",
        description: `Data ${fullSalutation} berhasil disimpan.`,
      });
      setIsEditDialogOpen(false);
      
      const params = new URLSearchParams(searchParams.toString());
      params.delete('edit');
      const qs = params.toString();
      router.replace(qs ? `/profile?${qs}` : '/profile');

    } catch (err: any) {
      toast({
        title: "Gagal Memperbarui",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyUid = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast({
        title: "UID Berhasil Disalin",
        description: `UID ${fullSalutation} diperlukan untuk pengaturan peran manual.`,
      });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Menyiapkan Berkas {fullSalutation}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 pb-32">
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Profil & Aktivitas</h1>
        <p className="text-muted-foreground text-sm">Pusat kendali pembelajaran dan kontribusi {fullSalutation}.</p>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="h-32 bg-gradient-to-r from-[#800000] to-[#b30000] relative">
          <div className="absolute inset-0 opacity-10 flex items-center justify-center">
            <Trophy className="w-48 h-48 rotate-12" />
          </div>
        </div>
        <CardHeader className="relative pb-0 px-6 sm:px-8">
          <Avatar className="w-24 h-24 border-4 border-background absolute -top-12 shadow-lg">
            <AvatarImage src={user.user_metadata?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/5 text-[#800000] text-2xl font-bold">
              {user.user_metadata?.full_name?.[0] || user.email?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="pt-14 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl font-bold font-headline">{user.user_metadata?.full_name || 'Sahabat AQLI'}</CardTitle>
                {superAdminRole && (
                  <Badge className="bg-[#800000] hover:bg-[#800000]/90 text-white font-black text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> SUPER ADMIN
                  </Badge>
                )}
                {adminRole && !superAdminRole && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> ADMIN
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#800000]" /> {user.email || '-'}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#800000]" /> Sejak {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="font-bold border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5">
                <Link href="/auth/reset-password">
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Atur Sandi
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10 font-bold" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" /> Keluar
              </Button>
              
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#800000] hover:bg-[#800000]/90 font-bold">
                    Edit Profil
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold font-headline text-[#800000] flex items-center gap-2">
                       <UserIcon className="w-5 h-5" /> Edit Profil {fullSalutation}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium">
                      Perbarui informasi identitas {fullSalutation} untuk pengalaman belajar yang lebih personal.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProfile} className="space-y-6 py-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="salutation" className="text-xs font-black uppercase tracking-widest text-slate-500">Panggilan Akrab</Label>
                          <Select value={salutation} onValueChange={setSalutation}>
                            <SelectTrigger className="h-12 border-2 rounded-xl font-bold">
                              <SelectValue placeholder="Pilih Panggilan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ukhti" className="font-bold">Ukhti</SelectItem>
                              <SelectItem value="Kakak" className="font-bold">Kakak</SelectItem>
                              <SelectItem value="Ummu" className="font-bold">Ummu</SelectItem>
                              <SelectItem value="Ibu" className="font-bold">Ibu</SelectItem>
                              <SelectItem value="Neng" className="font-bold">Neng</SelectItem>
                              <SelectItem value="Mbak" className="font-bold">Mbak</SelectItem>
                              <SelectItem value="Uni" className="font-bold">Uni</SelectItem>
                              <SelectItem value="Teteh" className="font-bold">Teteh</SelectItem>
                              <SelectItem value="Bunda" className="font-bold">Bunda</SelectItem>
                              <SelectItem value="Sahabat" className="font-bold">Sahabat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name" className="text-xs font-black uppercase tracking-widest text-slate-500">Nama Lengkap</Label>
                          <Input 
                            id="full_name" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Nama Sesuai KTP/Rekening"
                            className="h-12 border-2 rounded-xl font-bold"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kunyah_name" className="text-xs font-black uppercase tracking-widest text-slate-500">Nama Kunyah</Label>
                        <Input 
                          id="kunyah_name" 
                          name="kunyah_name"
                          autoComplete="off"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="misal: Ummu Ahmad"
                          className="h-12 border-2 rounded-xl font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="text-xs font-black uppercase tracking-widest text-slate-500">Nomor WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          type="tel"
                          inputMode="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="08123456xxxx atau 628123456xxxx"
                          className="h-12 border-2 rounded-xl font-bold"
                          required
                        />
                        {whatsapp && (
                          whatsappErrorMessage(whatsapp) ? (
                            <p className="text-[11px] text-red-600 font-bold">⚠ {whatsappErrorMessage(whatsapp)}</p>
                          ) : (
                            <p className="text-[11px] text-emerald-600 font-bold">✓ Format WhatsApp: {normalizeWhatsapp(whatsapp)}</p>
                          )
                        )}
                        <p className="text-[10px] text-amber-600 font-bold italic">*Wajib untuk koordinasi halaqah/program. Diterima: 0812..., +62812..., 62812...</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isUpdating} className="w-full h-14 bg-[#800000] hover:bg-[#800000]/90 text-white font-black uppercase tracking-widest rounded-xl">
                        {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PERUBAHAN"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pt-4">
          {(adminRole || superAdminRole) && (
            <Card className={cn(
              "mb-8 border-2 p-4",
              superAdminRole ? "border-[#800000] bg-[#800000]/10" : "border-amber-200 bg-amber-50"
            )}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg",
                    superAdminRole ? "bg-[#800000]" : "bg-amber-500"
                  )}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-sm font-black uppercase",
                      superAdminRole ? "text-[#800000]/70" : "text-amber-700"
                    )}>{superAdminRole ? "Super Admin" : "Admin"} Aktif</h4>
                    <p className={cn(
                      "text-[10px] font-medium",
                      superAdminRole ? "text-[#800000]/70" : "text-amber-700"
                    )}>{fullSalutation} memiliki akses penuh ke Dashboard AQLI.</p>
                  </div>
                </div>
                <Button asChild size="sm" className={cn(
                  "text-white font-bold h-8",
                  superAdminRole ? "bg-[#800000] hover:bg-[#800000]/90" : "bg-amber-600 hover:bg-amber-700"
                )}>
                  <Link href="/admin">BUKA DASHBOARD <ArrowRight className="ml-1 w-3 h-3" /></Link>
                </Button>
              </div>
            </Card>
          )}

          <Card className="mb-8 border-dashed border-2 bg-muted/20">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Fingerprint className="w-5 h-5 text-[#800000]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">User ID {fullSalutation} (UID)</p>
                  <p className="text-xs font-mono font-bold truncate max-w-[150px] sm:max-w-none">{user.id}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-[#800000] font-bold" onClick={copyUid}>
                <Copy className="w-3 h-3" /> SALIN
              </Button>
            </CardContent>
          </Card>

          <Tabs defaultValue="juara" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="juara" className="font-bold gap-2 rounded-lg data-[state=active]:text-[#800000]">
                <Trophy className="w-4 h-4 hidden sm:block" /> Juara
              </TabsTrigger>
              <TabsTrigger value="halaqah" className="font-bold gap-2 rounded-lg data-[state=active]:text-[#800000]">
                <BookOpen className="w-4 h-4 hidden sm:block" /> Halaqah
              </TabsTrigger>
              <TabsTrigger value="Infaq" className="font-bold gap-2 rounded-lg data-[state=active]:text-[#800000]">
                <HeartHandshake className="w-4 h-4 hidden sm:block" /> Infaq
              </TabsTrigger>
            </TabsList>

            <TabsContent value="juara" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-none bg-[#800000]/5 text-center p-6">
                  <Trophy className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                  <div className="text-2xl font-bold font-headline">{(points || 0).toLocaleString('id-ID')}</div>
                  <p className="text-[10px] font-bold text-[#800000] uppercase tracking-widest">Total Poin</p>
                </Card>
                <Card className="border-none bg-emerald-50 text-center p-6">
                  <Medal className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold font-headline">{rank}</div>
                  <p className="text-[10px] font-bold text-[#800000] uppercase tracking-widest">Peringkat Global</p>
                </Card>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-1">Lencana</h3>
                <div className="flex flex-wrap gap-4 px-1">
                  {[
                    { name: points > 100 ? "Hafiz Pro" : "Hafiz Pemula", icon: Star, color: "text-[#D4AF37]" },
                    { name: points > 0 ? "Thalibah Aktif" : "Thalibah Baru", icon: CheckCircle2, color: "text-emerald-600" }
                  ].map((badge, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5 p-3 border rounded-2xl bg-white w-24 text-center group hover:border-[#800000] transition-colors">
                      <badge.icon className={cn("w-8 h-8", badge.color)} />
                      <span className="text-[9px] font-bold leading-tight">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="halaqah" className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Materi Diikuti</h3>
                <Badge variant="outline" className="text-[10px] font-bold">{validFollowedHalaqahs.length + (isPaid ? 1 : 0)} Aktif</Badge>
              </div>
              <div className="grid gap-3">
                {isPaid && (
                  <Link href="/tikrar">
                    <Card className="border-blue-200 bg-blue-50/20 shadow-none hover:bg-blue-50 transition-all cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
                            <Zap className="w-5 h-5 fill-current" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-blue-900">Tikrar Daily Juz {paidJuz}</h4>
                              <Badge className="bg-blue-600 text-[8px] h-4 px-1">PREMIUM</Badge>
                            </div>
                            <p className="text-[10px] text-blue-700 font-medium">Metode 40x Repetisi</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600" />
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {validFollowedHalaqahs.map((hid: string) => (
                  <Link key={hid} href={`/study-circles/${encodeURIComponent(hid)}`}>
                    <Card className="border shadow-none hover:bg-muted/30 transition-all cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2.5 rounded-xl bg-[#800000]/10 text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-colors shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold uppercase truncate">{resolveHalaqahTitle(hid)}</h4>
                            <p className="text-[10px] text-muted-foreground font-medium">Halaqah Aktif</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#800000] shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {!isPaid && validFollowedHalaqahs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs italic border rounded-xl bg-white">
                    Belum ada Halaqah yang diikuti. <Link href="/study-circles" className="text-[#800000] font-bold underline">Jelajahi Kelas</Link>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="Infaq" className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Riwayat Infaq</h3>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-[#800000] gap-1" asChild>
                  <Link href="/berbagi"><History className="w-3 h-3" /> Tambah Infaq</Link>
                </Button>
              </div>

              <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase">Tanggal</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Nominal</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations && donations.length > 0 ? (
                      donations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="text-[11px] font-medium">
                            {d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell className="text-[11px] font-bold text-[#800000]">
                            Rp {d.amount?.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[8px] font-bold px-1.5 py-0",
                              d.status === 'active' || d.status === 'completed' || d.status === 'verified' ? "bg-emerald-500" : "bg-amber-500"
                            )}>
                              {d.status === 'active' || d.status === 'completed' || d.status === 'verified' ? 'BERHASIL' : 'PENDING'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-xs italic">
                          Belum ada riwayat Infaq yang tercatat.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
