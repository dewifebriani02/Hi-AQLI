'use client';

import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  History
} from 'lucide-react';
import { useEffect } from 'react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
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

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  // Fetch real donation history for the user with limit and proper QAP filter
  const donationsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "donations"),
      where("userId", "==", user.uid),
      orderBy("donationDate", "desc"),
      limit(20)
    );
  }, [db, user]);

  const { data: donations } = useCollection(donationsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
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
      {/* Header Profile Section */}
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
              <CardTitle className="text-2xl font-bold font-headline">{user.displayName || 'Sahabat AQLI'}</CardTitle>
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

            {/* HALAQAH TAB */}
            <TabsContent value="halaqah" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Materi Diikuti</h3>
                <Badge variant="outline" className="text-[10px] font-bold">2 Aktif</Badge>
              </div>
              <div className="grid gap-3">
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

            {/* DONASI TAB */}
            <TabsContent value="donasi" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#800000]">Riwayat Infaq & Sedekah</h3>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-[#800000] gap-1" asChild>
                  <a href="/donate"><History className="w-3 h-3" /> Tambah Donasi</a>
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

            {/* JUARA TAB */}
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
                    <a href="/leaderboard">Cek Papan Peringkat <ChevronRight className="w-3 h-3" /></a>
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