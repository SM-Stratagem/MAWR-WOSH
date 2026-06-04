"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TimeRangeFilter, type TimeRangeKey, filterByTimeRange } from "../../../components/TimeRangeFilter";

const CHART_COLORS = ["#b6ff1c", "#2f80ff", "#ffb020", "#ff4d4f", "#8a5cff"];

export default function SubscriptionsPage() {
  const subs = useQuery(api.subscriptions.adminListSubscriptions, {});
  const [range, setRange] = useState<TimeRangeKey>("all");

  const allSubs = subs || [];
  const filteredSubs = useMemo(() => filterByTimeRange(allSubs, range), [allSubs, range]);

  const activeCount = filteredSubs.filter((s: any) => s.status === "active").length;
  const pausedCount = filteredSubs.filter((s: any) => s.status === "paused").length;
  const canceledCount = filteredSubs.filter((s: any) => s.status === "canceled").length;

  const weeklyCount = filteredSubs.filter((s: any) => s.frequency === "weekly").length;
  const biweeklyCount = filteredSubs.filter((s: any) => s.frequency === "biweekly").length;
  const monthlyCount = filteredSubs.filter((s: any) => s.frequency === "monthly").length;

  const statusData = [
    { name: "Active", value: activeCount, color: "#b6ff1c" },
    { name: "Paused", value: pausedCount, color: "#ffb020" },
    { name: "Canceled", value: canceledCount, color: "#ff4d4f" },
  ].filter((d) => d.value > 0);

  const freqData = [
    { name: "Weekly", value: weeklyCount, color: CHART_COLORS[0] },
    { name: "Biweekly", value: biweeklyCount, color: CHART_COLORS[1] },
    { name: "Monthly", value: monthlyCount, color: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);

  const mrr = useMemo(() => {
    return filteredSubs.filter((s: any) => s.status === "active").reduce((sum: number, s: any) => {
      if (s.frequency === "weekly") return sum + 299;
      if (s.frequency === "biweekly") return sum + 169;
      if (s.frequency === "monthly") return sum + 89;
      return sum;
    }, 0);
  }, [filteredSubs]);

  const subGrowth = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const s of filteredSubs) {
      const d = new Date(s.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
    return Array.from(dayMap.entries())
      .sort((a, b) => new Date(a[0] + ", " + new Date().getFullYear()).getTime() - new Date(b[0] + ", " + new Date().getFullYear()).getTime())
      .map(([date, count]) => ({ date, signups: count }));
  }, [filteredSubs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Recurring revenue</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Subscriptions</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Weekly, biweekly, and monthly wash plans.</p>
        </div>
      </div>

      <TimeRangeFilter value={range} onChange={setRange} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Total Subs</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">{filteredSubs.length}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Active</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--green)]">{activeCount}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">MRR</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">AED {mrr.toLocaleString()}</div>
          <div className="text-[var(--muted)] text-[13px]">Monthly recurring</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Churned</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--red)]">{canceledCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0">Weekly Plan</h2>
          <p className="text-[var(--muted)] text-[13px] mt-1">4 washes per month</p>
          <div className="text-[30px] font-[950] tracking-tight mt-3">AED 299</div>
          <span className="badge badge-green mt-2">{weeklyCount} subscribers</span>
        </div>
        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0">Biweekly Plan</h2>
          <p className="text-[var(--muted)] text-[13px] mt-1">2 washes per month</p>
          <div className="text-[30px] font-[950] tracking-tight mt-3">AED 169</div>
          <span className="badge badge-blue mt-2">{biweeklyCount} subscribers</span>
        </div>
        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0">Monthly Plan</h2>
          <p className="text-[var(--muted)] text-[13px] mt-1">1 wash per month</p>
          <div className="text-[30px] font-[950] tracking-tight mt-3">AED 89</div>
          <span className="badge badge-amber mt-2">{monthlyCount} subscribers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Subscription Growth</h2>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={subGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b6ff1c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#b6ff1c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#32383c" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8aaa6" }} interval={Math.max(0, Math.floor(subGrowth.length / 6))} />
                <YAxis tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="signups" stroke="#b6ff1c" fill="url(#subGrad)" strokeWidth={3} name="New Subs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-[17px] font-[900] m-0 mb-3">By Frequency</h3>
            {freqData.length > 0 ? (
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={freqData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {freqData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-[var(--muted)] text-sm">No data</div>
            )}
            <div className="space-y-1.5">
              {freqData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-[var(--muted)]">{d.name}</span></div>
                  <span className="font-[800]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[17px] font-[900] m-0 mb-3">By Status</h3>
            <div className="space-y-2">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-[var(--muted)]">{d.name}</span></div>
                  <span className="font-[800]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="text-[20px] font-[900] m-0">All Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map((s: any) => (
                <tr key={s._id}>
                  <td>
                    <div className="font-medium">{s.user?.name || "N/A"}</div>
                    <div className="text-[12px] text-[var(--muted)]">{s.user?.email}</div>
                  </td>
                  <td className="capitalize">{s.frequency}</td>
                  <td>
                    <span className={`badge ${s.status === "active" ? "badge-green" : s.status === "paused" ? "badge-amber" : "badge-red"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-[var(--muted)] text-[13px]">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredSubs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-[var(--muted)]">No subscriptions in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
