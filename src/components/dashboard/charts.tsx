"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function GrowthChart({ data }: { data: { month: string; members: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey="members" stroke="var(--primary)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `₹${v}`} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v) => [`₹${v}`, "Revenue"]} />
          <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
