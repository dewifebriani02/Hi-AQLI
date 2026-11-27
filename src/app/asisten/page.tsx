"use client";

import { AiScholarClient } from "@/components/ai/ai-scholar-client";
import { useUser } from "@/db";
import { useUserPermissions } from "@/lib/permissions";
import { Bot, Sparkles, ArrowLeft, ShieldAlert, BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AsistenAiPage() {
  const { user, isUserLoading } = useUser();
  const { isAdmin, isSuperAdmin, isMusyrifah, isLoading: isPermLoading } = useUserPermissions(user?.id);
  const canAccessAdminOnly = isAdmin || isSuperAdmin || isMusyrifah;

  if (isUserLoading || isPermLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-slate-100" />
        <div className="h-[60vh] rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (!canAccessAdminOnly) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">
          Khusus Admin (Tahap Uji Coba)
        </h1>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Fitur <strong>Hi Asisten AQLI</strong> saat ini baru dibuka khusus untuk Admin/Musyrifah sebelum dirilis ke seluruh thalibah.
        </p>
        <Link href="/">
          <Button className="mt-2 rounded-xl bg-[#800000] hover:bg-[#600000] text-white font-bold text-xs">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24 px-2 sm:px-4 space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#800000] via-[#600000] to-slate-900 text-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" /> Khusus Admin • Beta
            </div>
            <h1 className="text-2xl font-black font-headline tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-amber-300" />
              Hi Asisten AQLI
            </h1>
            <p className="text-xs text-white/80 leading-relaxed max-w-xl">
              Asisten Cendekiawan AI untuk diskusi Tafsir, Tadabbur Ayat, Mufradat, Nahwu &amp; I&apos;rab Al-Qur&apos;an, serta metodologi hafalan Tikrar.
            </p>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs font-bold shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10 text-[10px] text-white/80 font-semibold">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Tafsir &amp; Tadabbur Ayat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Bedah Mufradat &amp; I&apos;rab</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Tips Mutqin &amp; Muraja&apos;ah</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="rounded-[2rem] border-slate-200/80 shadow-lg overflow-hidden bg-white">
        <CardContent className="p-4 sm:p-6">
          <AiScholarClient />
        </CardContent>
      </Card>
    </div>
  );
}
