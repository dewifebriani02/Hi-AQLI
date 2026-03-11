import { AiScholarClient } from "@/components/ai-scholar-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";

export default function BerbagiPage() {
  return (
    <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto pb-20">
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center gap-2 text-[#800000] mb-1">
          <Globe className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000]">Hi Berbagi • Tanya Jawab Islam</span>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Diskusi & Kosakata</h1>
        <p className="text-muted-foreground text-sm">
          Berbagi pengetahuan melalui asisten AI HI AQLI untuk pendalaman Tafsir, Tajwid, dan Sejarah Islam.
        </p>
      </div>
      <Card className="flex-1 border-none shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-[#800000] text-white">
          <CardTitle className="font-headline text-xl">Ajukan Pertanyaan</CardTitle>
          <CardDescription className="text-white/70">Ketik topik yang ingin Anda bahas dan dapatkan jawaban berbasis data terverifikasi.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <AiScholarClient />
        </CardContent>
      </Card>
    </div>
  );
}
