'use client';

import { useMemo } from "react";
import { useCollection } from "@/supabase/db";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  TrendingUp, 
  Activity,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MufradatReportsPage() {
  const { data: groups, isLoading: loadingGroups } = useCollection("mufradat_groups");
  const { data: users, isLoading: loadingUsers } = useCollection("users");
  const { data: attempts, isLoading: loadingAttempts } = useCollection("quiz_attempts");

  const stats = useMemo(() => {
    if (!users || !groups || !attempts) return null;

    const activeThalibah = users.filter(u => !!u.mufradat_group_id).length;
    const totalGroups = groups.length;
    const passedQuizzes = attempts.filter(a => a.is_passed).length;
    
    // Calculate last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = attempts.filter(a => new Date(a.created_at) > sevenDaysAgo).length;

    return {
      activeThalibah,
      totalGroups,
      passedQuizzes,
      recentActivity
    };
  }, [users, groups, attempts]);

  if (loadingGroups || loadingUsers || loadingAttempts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#800000]" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Menganalisis Data Performa...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-8 pb-32">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
          <Link href="/admin/mufradat"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#800000] truncate uppercase">LAPORAN KINERJA</h1>
          <p className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-widest font-bold">Analitik Hi Mufradat • Real-time</p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-[#800000] to-[#600000] text-white overflow-hidden relative group">
           <div className="absolute right-[-10%] top-[-10%] opacity-10 group-hover:scale-110 transition-transform">
              <Users className="w-24 h-24" />
           </div>
           <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/70">Thalibah Aktif</CardTitle>
           </CardHeader>
           <CardContent className="relative z-10">
              <p className="text-4xl font-black">{stats?.activeThalibah || 0}</p>
              <p className="text-[10px] font-medium text-white/50 mt-1">Terdaftar dalam batch</p>
           </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white overflow-hidden relative group">
           <div className="absolute right-[-10%] top-[-10%] text-[#D4AF37]/10 opacity-50 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-24 h-24" />
           </div>
           <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Batch</CardTitle>
           </CardHeader>
           <CardContent className="relative z-10">
              <p className="text-4xl font-black text-[#800000]">{stats?.totalGroups || 0}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Grup monitoring aktif</p>
           </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white overflow-hidden relative group">
           <div className="absolute right-[-10%] top-[-10%] text-emerald-500/10 opacity-50 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-24 h-24" />
           </div>
           <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mastery Tercapai</CardTitle>
           </CardHeader>
           <CardContent className="relative z-10">
              <p className="text-4xl font-black text-emerald-600">{stats?.passedQuizzes || 0}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Kuis yang telah lulus</p>
           </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white overflow-hidden relative group">
           <div className="absolute right-[-10%] top-[-10%] text-sky-500/10 opacity-50 group-hover:scale-110 transition-transform">
              <Activity className="w-24 h-24" />
           </div>
           <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aktivitas 7 Hari</CardTitle>
           </CardHeader>
           <CardContent className="relative z-10">
              <p className="text-4xl font-black text-sky-600">{stats?.recentActivity || 0}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">Percobaan kuis baru</p>
           </CardContent>
        </Card>
      </div>

      {/* GROUP UTILIZATION */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-[#800000]/5 border-b py-6 px-8 flex flex-row items-center justify-between">
           <div>
              <CardTitle className="text-xl font-black font-headline text-[#800000] uppercase tracking-tight">Utilisasi Kapasitas Batch</CardTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Keterisian anggota per batch (Maks 50)</p>
           </div>
           <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[200px] text-[10px] font-black uppercase tracking-widest py-4 pl-8">Nama Batch</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Persentase Keterisian</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-black uppercase tracking-widest text-right pr-8">Jumlah Anggota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups?.map((group) => {
                  const percent = Math.min(((group.member_count || 0) / 50) * 100, 100);
                  const isFull = percent >= 100;

                  return (
                    <TableRow key={group.id} className="hover:bg-[#800000]/5 transition-colors group">
                      <TableCell className="py-4 pl-8">
                        <span className="font-black text-[#800000]">{group.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                           <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border">
                              <div 
                                 className={`h-full transition-all duration-500 rounded-full ${isFull ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                                 style={{ width: `${percent}%` }}
                              />
                           </div>
                           <span className="text-xs font-black min-w-[40px] text-slate-600">{Math.round(percent)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <span className="text-sm font-black text-slate-700">{group.member_count || 0} <span className="text-muted-foreground font-bold">/ 50</span></span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
         <Card className="bg-emerald-50 border-emerald-100 border-2">
            <CardHeader>
               <CardTitle className="text-sm font-black text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> CATATAN KINERJA
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                  Data mastery menunjukkan peningkatan signifikan pada thalibah yang aktif di batch awal. Pastikan pembukaan batch baru dilakukan setelah utilisasi batch sebelumnya mencapai >90%.
               </p>
            </CardContent>
         </Card>

         <Card className="bg-amber-50 border-amber-100 border-2">
            <CardHeader>
               <CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> TIPS OPTIMASI
               </CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Gunakan fitur "Tutup Lubang" di Manajemen Grup jika terdapat batch lama yang mengalami penurunan kapasitas di bawah 50 anggota untuk memaksimalkan efisiensi musyrifah.
               </p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
