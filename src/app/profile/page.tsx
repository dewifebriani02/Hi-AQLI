
'use client';

import { useUser, signOut, supabase } from '@/supabase';
import { useDoc, useCollection } from '@/supabase/db';
import { updateDocumentNonBlocking } from '@/supabase/non-blocking-updates';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut,
  Mail,
  Calendar,
  HeartHandshake,
  BookOpen,
  Trophy,
  ChevronRight,
  Clock,
  CheckCircle2,
  Medal,
  Star,
  History,
  ShieldCheck,
  Zap,
  ArrowRight,
  Copy,
  Fingerprint
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
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Check Admin Roles
  const { data: adminRole, isLoading: isAdminLoading } = useDoc("roles_admin", user?.id);
  const { data: superAdminRole } = useDoc("roles_superadmin", user?.id);

  // Fetch real donation history
  const donationOptions = useMemo(() => ({
    filters: [{ column: 'user_id', operator: '==', value: user?.id }],
    orderBy: { column: 'created_at', ascending: false },
    limit: 20
  }), [user?.id]);

  const { data: donations } = useCollection("donations", donationOptions);

  // Fetch user data for payment status and points
  const { data: userData } = useDoc("users", user?.id);
  const isPaid = userData?.is_tikrar_paid;
  const paidJuz = userData?.paid_juz;
  const points = userData?.points || 0;

  // Fetch all users to calculate rank
  const rankOptions = useMemo(() => ({
    orderBy: { column: 'points', ascending: false }
  }), []);

  const { data: allUsers } = useCollection("users", rankOptions);
  const rank = allUsers?.findIndex(u => u.id === user?.id) + 1 || '-';

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const copyUid = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast({
        title: "UID Berhasil Disalin",
        description: "UID Ukhti diperlukan untuk pengaturan peran manual.",
      });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Menyiapkan Berkas Ukhti...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 pb-32">
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Profil & Aktivitas</h1>
        <p className="text-muted-foreground text-sm">Pusat kendali pembelajaran dan kontribusi Ukhti.</p>
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
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#800000]" /> {user.email}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#800000]" /> Sejak {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10 font-bold" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" /> Keluar
              </Button>
              <Button size="sm" className="bg-[#800000] hover:bg-[#800000]/90 font-bold">
                Edit Profil
              </Button>
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
                      superAdminRole ? "text-[#800000]" : "text-amber-900"
                    )}>{superAdminRole ? "Super Admin" : "Admin"} Aktif</h4>
                    <p className={cn(
                      "text-[10px] font-medium",
                      superAdminRole ? "text-[#800000]/70" : "text-amber-700"
                    )}>Ukhti memiliki akses penuh ke Dashboard AQLI.</p>
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
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">User ID Ukhti (UID)</p>
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
                  <div className="text-2xl font-bold font-headline">{points.toLocaleString()}</div>
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
                <Badge variant="outline" className="text-[10px] font-bold">{userData?.followed_halaqahs?.length || 0} Aktif</Badge>
              </div>
              <div className="grid gap-3">
                {isPaid && (
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
                      <Link href="/tikrar"><ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600" /></Link>
                    </CardContent>
                  </Card>
                )}
                {userData?.followed_halaqahs?.map((hid: string) => (
                  <Card key={hid} className="border shadow-none hover:bg-muted/30 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2.5 rounded-xl bg-[#800000]/10 text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-colors">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold uppercase truncate">{hid.replace(/-/g, ' ')}</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">Halaqah Aktif</p>
                        </div>
                      </div>
                      <Link href={`/study-circles/${hid}`}><ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#800000]" /></Link>
                    </CardContent>
                  </Card>
                ))}
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
