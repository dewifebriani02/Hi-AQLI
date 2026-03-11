
'use client';

import { useUser, useAuth, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, 
  User as UserIcon, 
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
  Fingerprint,
  ShieldAlert
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Check Admin Role
  const adminDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user?.uid]);

  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminDocRef);

  // Fetch real donation history - Simplified query to avoid index requirements for now
  const donationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "donations"),
      where("userId", "==", user.uid),
      limit(20)
    );
  }, [db, user?.uid]);

  const { data: donations } = useCollection(donationsQuery);

  // Fetch user data for payment status
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: userData } = useDoc(userDocRef);
  const isPaid = userData?.isTikrarPaid;
  const paidJuz = userData?.paidJuz;

  // AUTO-BOOTSTRAP ADMIN for dewifebriani@gmail.com
  useEffect(() => {
    let mounted = true;
    async function bootstrapAdmin() {
      if (user?.email === "dewifebriani@gmail.com" && !adminRole && !isAdminLoading && !isBootstrapping) {
        setIsBootstrapping(true);
        try {
          await setDoc(doc(db, "roles_admin", user.uid), {
            email: user.email,
            role: "admin",
            createdAt: serverTimestamp()
          });
          if (mounted) {
            toast({
              title: "Akses Admin Aktif",
              description: "Masyallah, akun Anda telah otomatis ditingkatkan menjadi Admin.",
            });
          }
        } catch (e) {
          console.error("Bootstrap Error:", e);
        } finally {
          if (mounted) setIsBootstrapping(false);
        }
      }
    }
    bootstrapAdmin();
    return () => { mounted = false; };
  }, [user, adminRole, isAdminLoading, db, toast, isBootstrapping]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({
        title: "UID Berhasil Disalin",
        description: "Gunakan UID ini jika ingin menambah peran manual di console.",
      });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Menyiapkan Berkas Anda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 pb-32">
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Profil & Aktivitas</h1>
        <p className="text-muted-foreground text-sm">Pusat kendali pembelajaran dan kontribusi Anda.</p>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="h-32 bg-gradient-to-r from-[#800000] to-[#b30000] relative">
          <div className="absolute inset-0 opacity-10 flex items-center justify-center">
            <Trophy className="w-48 h-48 rotate-12" />
          </div>
        </div>
        <CardHeader className="relative pb-0 px-6 sm:px-8">
          <Avatar className="w-24 h-24 border-4 border-background absolute -top-12 shadow-lg">
            <AvatarImage src={user.photoURL || undefined} />
            <AvatarFallback className="bg-primary/5 text-[#800000] text-2xl font-bold">
              {user.displayName?.[0] || user.email?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="pt-14 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl font-bold font-headline">{user.displayName || 'Sahabat AQLI'}</CardTitle>
                {adminRole && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> ADMIN
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#800000]" /> {user.email}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#800000]" /> Sejak {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'}</span>
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
          {user?.email === "dewifebriani@gmail.com" && (
            <Card className="mb-8 border-2 border-amber-200 bg-amber-50 p-4 animate-in fade-in zoom-in duration-500">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase">Status Admin: {adminRole ? 'AKTIF' : 'SEDANG PROSES'}</h4>
                    <p className="text-[10px] text-amber-700 font-medium">
                      {adminRole ? 'Anda memiliki akses penuh ke Dashboard Verifikasi.' : 'Sedang menyiapkan hak akses Anda...'}
                    </p>
                  </div>
                </div>
                {adminRole && (
                  <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-8">
                    <Link href="/admin">BUKA DASHBOARD <ArrowRight className="ml-1 w-3 h-3" /></Link>
                  </Button>
                )}
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
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">User ID Anda (UID)</p>
                  <p className="text-xs font-mono font-bold truncate max-w-[150px] sm:max-w-none">{user.uid}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-2 text-[#800000] font-bold" onClick={copyUid}>
                <Copy className="w-3 h-3" /> SALIN
              </Button>
            </CardContent>
          </Card>

          {isPaid && (
            <Card className="mb-8 border-2 border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Program Tikrar Aktif: Juz {paidJuz}</h4>
                    <p className="text-[10px] text-blue-700 font-medium">Akses counter premium Anda terbuka.</p>
                  </div>
                </div>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8">
                  <Link href="/tajweed">BUKA <ArrowRight className="ml-1 w-3 h-3" /></Link>
                </Button>
              </div>
            </Card>
          )}

          <Tabs defaultValue="halaqah" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="halaqah" className="font-bold gap-2 rounded-lg data-[state=active]:text-[#800000]">
                <BookOpen className="w-4 h-4 hidden sm:block" /> Halaqah
              </TabsTrigger>
              <TabsTrigger value="donasi" className="font-bold gap-2 rounded-lg data-[state=active]:text-[#800000]">
                <HeartHandshake className="w-4 h-4 hidden sm:block" /> Donasi
              </TabsTrigger>
              <TabsTrigger value="juara" className="font-bold gap-2 rounded-lg data-[state=active]:text-[#800000]">
                <Trophy className="w-4 h-4 hidden sm:block" /> Juara
              </TabsTrigger>
            </TabsList>

            <TabsContent value="halaqah" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Materi Diikuti</h3>
                <Badge variant="outline" className="text-[10px] font-bold">{isPaid ? '3' : '2'} Aktif</Badge>
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
                      <Link href="/tajweed"><ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600" /></Link>
                    </CardContent>
                  </Card>
                )}
                {[
                  { title: "Tafsir Juz' Amma", instructor: "Dr. Fatima Ahmed", progress: 45, status: "Lanjut Belajar" },
                  { title: "Tajwid Lanjutan: Sifaat", instructor: "Syekh Yusuf Ibrahim", progress: 12, status: "Mulai" }
                ].map((item, idx) => (
                  <Card key={idx} className="border shadow-none hover:bg-muted/30 transition-all cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2.5 rounded-xl bg-[#800000]/10 text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-colors">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{item.title}</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">{item.instructor}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-[#800000] rounded-full" style={{ width: `${item.progress}%` }} />
                             </div>
                             <span className="text-[10px] font-bold text-[#800000]">{item.progress}%</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#800000]" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="donasi" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Riwayat Infaq & Sedekah</h3>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-[#800000] gap-1" asChild>
                  <Link href="/donate"><History className="w-3 h-3" /> Tambah Donasi</Link>
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
                            {d.donationDate?.toDate ? d.donationDate.toDate().toLocaleDateString('id-ID') : '-'}
                          </TableCell>
                          <TableCell className="text-[11px] font-bold text-[#800000]">
                            Rp {d.amount?.toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[8px] font-bold px-1.5 py-0",
                              d.status === 'completed' ? "bg-emerald-500" : "bg-amber-500"
                            )}>
                              {d.status === 'completed' ? 'BERHASIL' : 'PENDING'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-xs italic">
                          Belum ada riwayat donasi yang tercatat.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="juara" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-none bg-[#800000]/5 text-center p-6">
                  <Trophy className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                  <div className="text-2xl font-bold font-headline">1,250</div>
                  <p className="text-[10px] font-bold text-[#800000] uppercase tracking-widest">Total Poin</p>
                </Card>
                <Card className="border-none bg-emerald-50 text-center p-6">
                  <Medal className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold font-headline">142</div>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Peringkat Global</p>
                </Card>
              </div>

              <div className="space-y-3">
                 <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground px-1">Lencana Kehormatan</h3>
                 <div className="flex flex-wrap gap-4 px-1">
                   {[
                     { name: "Hafiz Pemula", icon: Star, color: "text-[#D4AF37]" },
                     { name: "Ksatria Tilawah", icon: Medal, color: "text-rose-600" },
                     { name: "Sahabat Dermawan", icon: HeartHandshake, color: "text-[#800000]" },
                     { name: "Santri Aktif", icon: CheckCircle2, color: "text-emerald-600" }
                   ].map((badge, idx) => (
                     <div key={idx} className="flex flex-col items-center gap-1.5 p-3 border rounded-2xl bg-white w-24 text-center group hover:border-[#800000] transition-colors">
                        <badge.icon className={cn("w-8 h-8", badge.color)} />
                        <span className="text-[9px] font-bold leading-tight">{badge.name}</span>
                     </div>
                   ))}
                 </div>
              </div>

              <Card className="border-[#800000]/10 bg-muted/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#800000]" />
                    <span className="text-xs font-medium italic text-muted-foreground">Butuh 150 poin lagi untuk naik peringkat...</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold text-[#800000]" asChild>
                    <Link href="/leaderboard">Cek Papan Peringkat <ChevronRight className="w-3 h-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
