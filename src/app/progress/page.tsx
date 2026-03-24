import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { ProgressClient } from "@/components/progress-client";
  import { CheckCircle2, ListChecks, Target } from "lucide-react";
  
  export default function ProgressPage() {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-headline tracking-tight">Progres Ukhti</h1>
          <p className="text-muted-foreground">
            Lacak perjalanan belajar Ukhti, tinjau akurasi tilawah Ukhti, dan tetap termotivasi.
          </p>
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pelajaran Tajwid Selesai</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">4 dari 6</div>
                    <p className="text-xs text-muted-foreground">
                        +2 dalam sebulan terakhir
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Skor Tilawah Rata-rata</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">88%</div>
                    <p className="text-xs text-muted-foreground">
                        +5% dari minggu lalu
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lingkar Studi Diikuti</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">2</div>
                    <p className="text-xs text-muted-foreground">
                        Baru saja bergabung dengan "Tafsir Juz' Amma"
                    </p>
                </CardContent>
            </Card>
        </div>
  
        <Card>
          <CardHeader>
            <CardTitle>Akurasi Tilawah dari Waktu ke Waktu</CardTitle>
            <CardDescription>
              Grafik ini menunjukkan skor akurasi dari sesi Asisten Tilawah AI Ukhti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressClient />
          </CardContent>
        </Card>
      </div>
    );
  }
  
