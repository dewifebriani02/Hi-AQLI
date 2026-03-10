
"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data: In a real app, this would come from Firestore progress
const juzStatus = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  completed: [1, 2, 29, 30].includes(i + 1), // Example: Juz 1, 2, 29, 30 completed
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Circular Diagram */}
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
                    className="transition-all duration-500"
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
                            className="fill-foreground text-4xl font-black font-headline"
                          >
                            {percentage}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-[10px] font-bold uppercase tracking-widest"
                          >
                            Hafal
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

        {/* Legend & Quick Stats */}
        <div className="flex-1 space-y-4 w-full">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Selesai</p>
              <p className="text-2xl font-black text-emerald-800">{completedCount} <span className="text-sm font-medium opacity-60">Juz</span></p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tersisa</p>
              <p className="text-2xl font-black text-slate-700">{30 - completedCount} <span className="text-sm font-medium opacity-60">Juz</span></p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Ringkasan</h4>
            <p className="text-sm text-muted-foreground leading-relaxed px-1">
              Alhamdulillah, Anda telah menyelesaikan {completedCount} dari 30 Juz. Terus istiqomah dalam murojaah dan menambah hafalan baru.
            </p>
          </div>
        </div>
      </div>

      {/* Juz Grid Selector/Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-bold font-headline uppercase tracking-widest">Status Per Juz</h4>
          <Badge variant="outline" className="text-[9px] font-bold">30 SEGMEN</Badge>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
          {juzStatus.map((j) => (
            <div
              key={j.number}
              className={cn(
                "h-12 flex flex-col items-center justify-center rounded-xl border-2 transition-all cursor-default select-none",
                j.completed 
                  ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20" 
                  : "bg-white border-muted text-muted-foreground hover:border-[#800000]/20"
              )}
            >
              <span className="text-[10px] font-black">{j.number}</span>
              {j.completed ? <CheckCircle2 className="w-3 h-3 mt-0.5" /> : <Circle className="w-3 h-3 mt-0.5 opacity-20" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
