import { AiScholarClient } from "@/components/ai-scholar-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiScholarPage() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Cendekiawan AI</h1>
        <p className="text-muted-foreground">
          Ajukan pertanyaan tentang Tajwid, Tafsir, dan sejarah Islam. AI kami dilatih dengan kumpulan data terverifikasi yang dikurasi.
        </p>
      </div>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Ajukan Pertanyaan</CardTitle>
          <CardDescription>Ketik pertanyaan Anda di bawah ini dan dapatkan jawaban dari Cendekiawan AI kami.</CardDescription>
        </CardHeader>
        <CardContent>
          <AiScholarClient />
        </CardContent>
      </Card>
    </div>
  );
}
