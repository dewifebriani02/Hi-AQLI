
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageExamSimulation } from "@/components/page-exam-simulation";
import { Loader2 } from "lucide-react";

function SimulationContent() {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1");

  return <PageExamSimulation page={page} />;
}

export default function SimulationPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="animate-spin text-[#800000] h-10 w-10" />
        <p className="text-xs font-black uppercase">Menyiapkan Ruang Simulasi...</p>
      </div>
    }>
      <SimulationContent />
    </Suspense>
  );
}
