"use client"

import { Line, LineChart, CartesianGrid, XAxis, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "January", accuracy: 75 },
  { month: "February", accuracy: 78 },
  { month: "March", accuracy: 82 },
  { month: "April", accuracy: 80 },
  { month: "May", accuracy: 85 },
  { month: "June", accuracy: 88 },
]

const chartConfig = {
  accuracy: {
    label: "Accuracy",
    color: "hsl(var(--accent))",
  },
}

export function ProgressClient() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent 
            formatter={(value) => `${value}%`}
            hideLabel 
            indicator="dot"
           />}
        />
        <Line
          dataKey="accuracy"
          type="monotone"
          stroke="var(--color-accuracy)"
          strokeWidth={3}
          dot={{
            fill: "var(--color-accuracy)",
          }}
          activeDot={{
            r: 8,
          }}
        />
      </LineChart>
    </ChartContainer>
  )
}
