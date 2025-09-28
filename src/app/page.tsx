import { TilawahClient } from "@/components/tilawah-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Asisten Tilawah AI</h1>
        <p className="text-muted-foreground">
          Tingkatkan bacaan Al-Qur'an Anda dengan umpan balik waktu nyata. Rekam diri Anda dan biarkan AI kami membimbing Anda.
        </p>
      </div>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Latihan Tilawah</CardTitle>
          <CardDescription>Tekan rekam untuk memulai tilawah Anda. Tekan berhenti jika sudah selesai.</CardDescription>
        </CardHeader>
        <CardContent>
          <TilawahClient />
        </CardContent>
      </Card>
    </div>
  );
}
