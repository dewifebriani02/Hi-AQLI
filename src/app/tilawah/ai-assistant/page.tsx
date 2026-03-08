
import { TilawahClient } from "@/components/tilawah-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AiAssistantPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/tilawah">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Asisten Qur'an AI</h1>
      </div>
      
      <p className="text-muted-foreground">
        Rekam tilawah Anda untuk mendapatkan analisis instan mengenai makhraj dan kelancaran dari AI kami.
      </p>

      <Card className="flex-1 shadow-md border-muted">
        <CardHeader className="text-center">
          <CardTitle>Latihan Tilawah</CardTitle>
          <CardDescription>Tekan tombol rekam dan mulailah membaca salah satu ayat Al-Qur'an.</CardDescription>
        </CardHeader>
        <CardContent>
          <TilawahClient />
        </CardContent>
      </Card>
    </div>
  );
}
