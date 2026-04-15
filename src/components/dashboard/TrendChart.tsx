"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import type { WeeklyAverageDto } from "@/types";
import { formatWeekLabel } from "@/lib/week";

interface TrendChartProps {
  data: WeeklyAverageDto[];
  title?: string;
}

function shortWeekLabel(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function TrendChart({ data, title }: TrendChartProps) {
  const chartData = data.map((d) => ({
    week: shortWeekLabel(d.weekStartDate),
    "Geçmiş": d.pastAvg,
    "Bugün": d.todayAvg,
    "Yarın": d.futureAvg,
    count: d.entryCount,
  }));

  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            tickFormatter={(v) => `%${v}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`%${value}`, name]}
            labelFormatter={(label) => `Hafta: ${label}`}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="Geçmiş"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Bugün"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Yarın"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
