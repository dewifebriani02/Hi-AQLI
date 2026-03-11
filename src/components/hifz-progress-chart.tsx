"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

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
                    fill={entry.completed ? "#D4AF37" : "#800000"} 
                    className="transition-all duration-1000"
                    opacity={entry.completed ? 1 : 0.05}
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
                            className="fill-[#800000] text-5xl font-black font-headline"
                          >
                            {percentage}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 28}
                            className="fill-[#800000] text-[10px] font-black uppercase tracking-[0.2em]"
                          >
                            Itqan Tuntas
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

        <div className="flex-1 space-y-6 w-full">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#800000] border-b-4 border-[#D4AF37] space-y-1 shadow-sm text-white">
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest text-center">Itqan</p>
              <p className="text-3xl font-black text-white text-center">{completedCount} <span className="text-xs opacity-60">Juz</span></p>
            </div>
            <div className="p-5 rounded-3xl bg-white border-2 border-[#800000] border-b-4 space-y-1 shadow-sm">
              <p className="text-[10px] font-black text-[#800000] uppercase tracking-widest text-center">Target</p>
              <p className="text-3xl font-black text-[#800000] text-center">{30 - completedCount} <span className="text-xs opacity-60">Juz</span></p>
            </div>
          </div>
          
          <div className="space-y-2 bg-muted p-5 rounded-3xl border border-[#800000]/5">
            <h4 className="text-xs font-black text-[#800000] uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> Ringkasan
            </h4>
            <p className="text-sm text-black/70 leading-relaxed font-medium">
              Masyallah, Anda telah mencapai kualitas Itqan pada {completedCount} Juz. Teruslah istiqomah menambah perbendaharaan hafalan baru.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-black font-headline uppercase text-[#800000]">Matriks Hafalan</h4>
          <Badge className="bg-[#800000] text-white text-[9px] font-black tracking-widest">30 JUZ</Badge>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
          {juzStatus.map((j) => (
            <div
              key={j.number}
              className={cn(
                "h-14 flex flex-col items-center justify-center rounded-2xl border-2 transition-all cursor-default select-none relative",
                j.completed 
                  ? "bg-[#D4AF37] border-[#800000] text-black shadow-lg scale-105" 
                  : "bg-white border-[#800000]/5 text-muted-foreground hover:border-[#800000]/20"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter">Juz</span>
              <span className="text-xl font-black leading-none">{j.number}</span>
              {j.completed && (
                <div className="absolute -top-1 -right-1 bg-[#800000] rounded-full text-white p-0.5 border border-white">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
