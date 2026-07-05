"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/format";

export interface WeightPoint {
  date: string;
  weight: number;
}

export function WeightChart({ data }: { data: WeightPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Log at least two weigh-ins to see the trend.
      </p>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d, "d MMM")}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            domain={["dataMin - 2", "dataMax + 2"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(d) => formatDate(d as string)}
            formatter={(v) => [`${v} kg`, "Weight"]}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--primary)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
