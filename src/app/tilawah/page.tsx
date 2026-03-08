
import { SurahList } from "@/components/surah-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function QuranPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Al-Qur'an</h1>
        <p className="text-muted-foreground">Baca, pelajari, dan latih tilawah Anda dengan bantuan AI.</p>
      </div>

      {/* AI Assistant Banner */}
      <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden relative group">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform">
          <Mic className="w-32 h-32" />
        </div>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h3 className="font-bold text-xl">Asisten AI Tilawah</h3>
            <p className="text-sm opacity-90 max-w-xs">
              Dapatkan umpan balik langsung untuk akurasi dan kelancaran bacaan Anda.
            </p>
          </div>
          <Button asChild variant="secondary" size="lg" className="font-bold shadow-md w-full sm:w-auto">
            <Link href="/tilawah/ai-assistant">Buka Asisten AI</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-headline">Daftar Surat</h2>
          <span className="text-xs text-muted-foreground font-medium">114 Surat</span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari surat..." className="pl-10 h-11 bg-muted/50 border-none ring-offset-background" />
        </div>

        <SurahList />
      </div>
    </div>
  );
}
