
"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data: In a real app, this would come from Firestore progress
// For the prototype, we use fixed Juz 1, 2, 29, 30 as completed
const juzStatus = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  completed: [1, 2, 29, 30].includes(i + 1),
}));

const chartData = juzStatus.map((j) => ({
  name: `Juz ${j.number}`,
  value: 1,
  completed: j.completed,
}));

export function HifzProgressChart() {
  const completedCount = juzStatus.filter((j) => j.completed).length;
  const percentage = Math.round((completedCount / 30) * 100);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col lg:flex-row items-center gap-10">
        {/* Radial Chart Area */}
        <div className="relative w-64 h-64 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.completed ? "#10b981" : "#f1f5f9"} 
                    className="transition-all duration-1000"
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-5xl font-black font-headline"
                          >
                            {percentage}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 28}
                            className="fill-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]"
                          >
                            Hafalan Tuntas
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Stats */}
        <div className="flex-1 space-y-6 w-full">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-100 space-y-1 shadow-sm">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Selesai</p>
              <p className="text-3xl font-black text-emerald-800">{completedCount} <span className="text-sm font-medium opacity-60">Juz</span></p>
            </div>
            <div className="p-5 rounded-3xl bg-slate-50 border-2 border-slate-100 space-y-1 shadow-sm">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tersisa</p>
              <p className="text-3xl font-black text-slate-700">{30 - completedCount} <span className="text-sm font-medium opacity-60">Juz</span></p>
            </div>
          </div>
          
          <div className="space-y-2 bg-muted/20 p-5 rounded-3xl border border-muted">
            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ringkasan Progres
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Masyallah, Anda telah menyelesaikan {completedCount} dari 30 Juz. Fokus saat ini adalah mempertahankan kualitas (Itqan) Juz yang sudah dihafal sambil terus menambah hafalan baru.
            </p>
          </div>
        </div>
      </div>

      {/* 30 Juz Grid Matrix */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-black font-headline uppercase tracking-widest text-[#800000]">Matriks Status Juz</h4>
          <Badge variant="outline" className="text-[9px] font-black tracking-widest border-[#800000]/20 text-[#800000]">30 SEGMEN</Badge>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
          {juzStatus.map((j) => (
            <div
              key={j.number}
              className={cn(
                "h-14 flex flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-default select-none relative group",
                j.completed 
                  ? "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105" 
                  : "bg-white border-muted text-muted-foreground hover:border-[#800000]/20 hover:bg-muted/5"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter">Juz</span>
              <span className="text-xl font-black leading-none">{j.number}</span>
              {j.completed && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full text-emerald-600 shadow-sm border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
