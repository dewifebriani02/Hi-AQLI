"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Flag, CheckCircle2, Clock, RefreshCw, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/db";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppReportItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  module_name: string;
  page_path: string;
  category: string;
  context_title: string | null;
  context_excerpt: string | null;
  description: string;
  status: "open" | "resolved";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  koreksi_konten: "Koreksi Ayat / Terjemah / Materi",
  koreksi_rujukan_ai: "Koreksi Jawaban Hi Asisten AQLI",
  koreksi_kuis: "Koreksi Soal / Kunci Kuis",
  kendala_teknis: "Kendala Teknis / Bug",
  saran_fitur: "Masukan & Saran",
};

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<AppReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/reports?status=${statusFilter}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setReports(json.data);
      }
    } catch (err) {
      console.error("Failed loading reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const toggleStatus = async (report: AppReportItem) => {
    const nextStatus = report.status === "open" ? "resolved" : "open";
    setUpdatingId(report.id);
    try {
      const res = await authFetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memperbarui status");
      }
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: nextStatus } : r))
      );
      toast({
        title: nextStatus === "resolved" ? "Ditandai Selesai" : "Dibuka Kembali",
        description: `Laporan pada ${report.module_name} telah diperbarui.`,
      });
    } catch (err: any) {
      toast({
        title: "Gagal memperbarui",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openCount = reports.filter((r) => r.status === "open").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
            <Flag className="w-4 h-4" />
            Pusat Koreksi &amp; Laporan Thalibah
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">
            Laporan Kesalahan Modul &amp; Konten
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Daftar seluruh masukan dan koreksi dari thalibah di semua halaman aplikasi termasuk Hi Asisten AQLI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReports}
            className="rounded-xl text-xs font-bold h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Muat Ulang
          </Button>
        </div>
      </div>

      {/* Filter & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
          {(["all", "open", "resolved"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === st
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {st === "all" && `Semua (${reports.length})`}
              {st === "open" && `Perlu Ditinjau (${openCount})`}
              {st === "resolved" && `Selesai (${resolvedCount})`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-slate-200 bg-white">
          <CardContent className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Belum Ada Laporan</h3>
            <p className="text-xs text-muted-foreground">
              Laporan yang dikirim oleh thalibah melalui tombol &ldquo;Laporkan&rdquo; akan muncul di halaman ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className={cn(
                "rounded-2xl border transition-all bg-white shadow-sm",
                report.status === "open" ? "border-amber-200/90" : "border-slate-200/80 opacity-80"
              )}
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px] font-bold uppercase",
                        report.status === "open"
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      )}
                    >
                      {report.status === "open" ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Perlu Ditinjau
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">
                      {report.module_name}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {CATEGORY_LABELS[report.category] || report.category}
                    </Badge>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(report.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {report.context_title && (
                  <p className="text-xs font-bold text-[#800000]">
                    Bagian: {report.context_title}
                  </p>
                )}

                {report.context_excerpt && (
                  <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-slate-600 italic">
                    &ldquo;{report.context_excerpt}&rdquo;
                  </div>
                )}

                <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {report.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-slate-500">
                    <span>
                      Pelapor: <strong className="text-slate-700">{report.user_name || "Thalibah"}</strong>
                      {report.user_email ? ` (${report.user_email})` : ""}
                    </span>
                    <Link
                      href={report.page_path || "/"}
                      className="inline-flex items-center gap-1 text-primary font-bold hover:underline"
                    >
                      Buka {report.page_path} <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <Button
                    size="sm"
                    variant={report.status === "open" ? "default" : "outline"}
                    disabled={updatingId === report.id}
                    onClick={() => toggleStatus(report)}
                    className={cn(
                      "rounded-xl text-xs font-bold h-8 px-3.5",
                      report.status === "open"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : ""
                    )}
                  >
                    {report.status === "open" ? "Tandai Selesai" : "Buka Kembali"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
