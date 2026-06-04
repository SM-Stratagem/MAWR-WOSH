"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { TimeRangeFilter, type TimeRangeKey, filterByTimeRange } from "../../../components/TimeRangeFilter";

export default function PaymentsPage() {
  const bookings = useQuery(api.bookings.adminListBookings, {});
  const allBookings = bookings || [];
  const [range, setRange] = useState<TimeRangeKey>("all");

  const filtered = useMemo(() => filterByTimeRange(allBookings, range), [allBookings, range]);
  const succeeded = useMemo(() => filtered.filter((b: any) => b.paymentStatus === "succeeded"), [filtered]);
  const failed = useMemo(() => filtered.filter((b: any) => b.paymentStatus === "failed"), [filtered]);
  const grossRevenue = succeeded.reduce((s: number, b: any) => s + b.total, 0);
  const estimatedFees = Math.round(grossRevenue * 0.029 + succeeded.length * 1.2);
  const netRevenue = grossRevenue - estimatedFees;

  const revenueByDay = useMemo(() => {
    const dayMap = new Map<string, { gross: number; net: number }>();
    for (const b of succeeded) {
      const d = new Date(b.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const existing = dayMap.get(key) || { gross: 0, net: 0 };
      existing.gross += b.total;
      existing.net += Math.round(b.total * 0.971 - 1.2);
      dayMap.set(key, existing);
    }
    return Array.from(dayMap.entries())
      .sort((a, b) => new Date(a[0] + ", " + new Date().getFullYear()).getTime() - new Date(b[0] + ", " + new Date().getFullYear()).getTime())
      .map(([date, data]) => ({ date, ...data }));
  }, [succeeded]);

  const statusData = [
    { name: "Succeeded", value: succeeded.length, color: "#b6ff1c" },
    { name: "Failed", value: failed.length, color: "#ff4d4f" },
    { name: "Other", value: filtered.length - succeeded.length - failed.length, color: "#a8aaa6" },
  ].filter((d) => d.value > 0);

  const dailyRevenue = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const b of succeeded) {
      const d = new Date(b.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dayMap.set(key, (dayMap.get(key) || 0) + b.total);
    }
    return Array.from(dayMap.entries())
      .sort((a, b) => new Date(a[0] + ", " + new Date().getFullYear()).getTime() - new Date(b[0] + ", " + new Date().getFullYear()).getTime())
      .map(([date, revenue]) => ({ date, revenue }));
  }, [succeeded]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Stripe</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Payments</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Card, Apple Pay, Google Pay — successful payments, failed payments, fees, and net revenue.</p>
        </div>
      </div>

      <TimeRangeFilter value={range} onChange={setRange} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Gross Revenue</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">AED {grossRevenue.toLocaleString()}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Net Revenue</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--green)]">AED {netRevenue.toLocaleString()}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Stripe Fees (est.)</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--amber)]">AED {estimatedFees.toLocaleString()}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Failed Payments</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--red)]">{failed.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Revenue Over Time</h2>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDay} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b6ff1c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#b6ff1c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2f80ff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2f80ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#32383c" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8aaa6" }} interval={Math.max(0, Math.floor(revenueByDay.length / 6))} />
                <YAxis tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="gross" stroke="#b6ff1c" fill="url(#grossGrad)" strokeWidth={3} name="Gross (AED)" />
                <Area type="monotone" dataKey="net" stroke="#2f80ff" fill="url(#netGrad)" strokeWidth={2} name="Net (AED)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]"><span className="w-3 h-[3px] rounded bg-[var(--green)]" /> Gross</div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]"><span className="w-3 h-[3px] rounded bg-[var(--blue)]" /> Net</div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0 tracking-tight mb-4">Payment Status</h2>
          {statusData.length > 0 ? (
            <div className="h-[180px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-[var(--muted)]">No data</div>
          )}
          <div className="space-y-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[var(--muted)]">{d.name}</span>
                </div>
                <span className="font-[800]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dailyRevenue.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Daily Revenue</h2>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#32383c" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8aaa6" }} interval={Math.max(0, Math.floor(dailyRevenue.length / 8))} />
                <YAxis tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#b6ff1c" radius={[4, 4, 0, 0]} name="Revenue (AED)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="text-[20px] font-[900] m-0">All Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b._id}>
                  <td className="font-mono text-[13px]">{b.bookingNumber}</td>
                  <td>{b.user?.name || "N/A"}</td>
                  <td className="font-medium">{b.total} {b.currency}</td>
                  <td>
                    <span className={`badge ${b.paymentStatus === "succeeded" ? "badge-green" : b.paymentStatus === "failed" ? "badge-red" : "badge-amber"}`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="text-[var(--muted)] text-[13px]">{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
