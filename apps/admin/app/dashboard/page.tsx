"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { RefreshCw, DollarSign, Users, Target, TrendingUp, AlertTriangle, Activity, Star, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TimeRangeFilter, type TimeRangeKey, getTimeRangeMs, filterByTimeRange, getRangeLabel } from "../../components/TimeRangeFilter";

const statusColors: Record<string, string> = {
  draft: "#a8aaa6", awaiting_payment: "#ffb020", confirmed: "#2f80ff",
  team_assigned: "#2f80ff", on_the_way: "#2f80ff", arrived: "#b6ff1c",
  washing_in_progress: "#b6ff1c", completed: "#b6ff1c", canceled: "#ff4d4f",
  payment_failed: "#ff4d4f", rejected: "#ff4d4f",
};

function groupByDay(bookings: any[], rangeMs: number): { date: string; revenue: number; bookings: number; completed: number; canceled: number }[] {
  const now = Date.now();
  const start = now - rangeMs;
  const dayMap = new Map<string, { revenue: number; bookings: number; completed: number; canceled: number }>();

  for (const b of bookings) {
    if (b.createdAt < start) continue;
    const d = new Date(b.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const existing = dayMap.get(key) || { revenue: 0, bookings: 0, completed: 0, canceled: 0 };
    existing.bookings++;
    if (b.paymentStatus === "succeeded") existing.revenue += b.total;
    if (b.status === "completed") existing.completed++;
    if (b.status === "canceled" || b.status === "payment_failed") existing.canceled++;
    dayMap.set(key, existing);
  }

  const sorted = Array.from(dayMap.entries()).sort((a, b) => {
    const da = new Date(a[0] + ", " + new Date().getFullYear());
    const db = new Date(b[0] + ", " + new Date().getFullYear());
    return da.getTime() - db.getTime();
  });

  return sorted.map(([date, data]) => ({ date, ...data }));
}

export default function DashboardPage() {
  const router = useRouter();
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const metrics = useQuery(api.bookings.adminDashboardMetrics);
  const analytics = useQuery(api.bookings.adminAdvancedAnalytics);
  const bookings = useQuery(api.bookings.adminListBookings, {});
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("30d");

  useEffect(() => {
    if (userProfile && userProfile.role !== "admin" && userProfile.role !== "superadmin" && userProfile.role !== "operator") {
      router.push("/");
    }
  }, [userProfile, router]);

  const allBookings = bookings || [];
  const rangeMs = getTimeRangeMs(timeRange);
  const rangeStart = Date.now() - rangeMs;

  const filtered = useMemo(() => allBookings.filter((b: any) => b.createdAt >= rangeStart), [allBookings, rangeStart]);
  const chartData = useMemo(() => groupByDay(allBookings, rangeMs), [allBookings, rangeMs]);

  const totalRevenue = useMemo(() => filtered.filter((b: any) => b.paymentStatus === "succeeded").reduce((s: number, b: any) => s + b.total, 0), [filtered]);
  const totalBookings = filtered.length;
  const completedBookings = filtered.filter((b: any) => b.status === "completed").length;
  const activeBookings = filtered.filter((b: any) =>
    ["confirmed", "team_assigned", "on_the_way", "arrived", "washing_in_progress"].includes(b.status)
  ).length;
  const canceledBookings = filtered.filter((b: any) => b.status === "canceled" || b.status === "payment_failed").length;
  const failedPayments = filtered.filter((b: any) => b.paymentStatus === "failed").length;
  const avgValue = completedBookings > 0 ? Math.round(totalRevenue / completedBookings) : 0;
  const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

  const funnelPaid = filtered.filter((b: any) => b.paymentStatus === "succeeded").length;

  const rangeLabel = getRangeLabel(timeRange);

  if (!metrics || !analytics) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="animate-spin text-[var(--green)]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Main command center</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0 leading-none">Dashboard</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Live overview of WOSH bookings, drivers, revenue, payments, and service quality.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button className="btn-ghost">Export</button>
          <button className="btn-primary">Create Manual Booking</button>
        </div>
      </div>

      {/* Time Range Selector */}
      <TimeRangeFilter value={timeRange} onChange={setTimeRange} summary={`${filtered.length} bookings · AED ${totalRevenue.toLocaleString()} revenue`} />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<DollarSign size={18} />} label="Total Revenue" value={`AED ${totalRevenue.toLocaleString()}`} badge={rangeLabel} badgeClass="badge-green" />
        <KPICard icon={<Calendar size={18} />} label="Total Bookings" value={totalBookings.toString()} badge={`${completedBookings} completed`} badgeClass="badge-blue" />
        <KPICard icon={<Activity size={18} />} label="Active Jobs" value={activeBookings.toString()} badge={`${failedPayments} failed`} badgeClass={failedPayments > 0 ? "badge-amber" : "badge-green"} />
        <KPICard icon={<Users size={18} />} label="Available Drivers" value={`${metrics.availableTeams} / ${metrics.totalTeams}`} badge={`${metrics.totalTeams - metrics.availableTeams} busy`} badgeClass="badge-green" />
        <KPICard icon={<Target size={18} />} label="Total Users" value={metrics.totalUsers.toString()} badge="customers" badgeClass="badge-green" />
        <KPICard icon={<TrendingUp size={18} />} label="Avg Booking Value" value={`AED ${avgValue.toLocaleString()}`} badge={rangeLabel} badgeClass="badge-blue" />
        <KPICard icon={<AlertTriangle size={18} />} label="Failed Payments" value={failedPayments.toString()} badge={failedPayments > 0 ? "needs attention" : "healthy"} badgeClass={failedPayments > 0 ? "badge-red" : "badge-green"} />
        <KPICard icon={<Star size={18} />} label="Subscriptions" value={analytics.subscriptionStatusBreakdown.active.toString()} badge="active" badgeClass="badge-green" />
      </div>

      {/* Revenue + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[20px] font-[900] m-0 tracking-tight">Revenue Trend</h2>
              <p className="text-[var(--muted)] text-[13px] mt-1">Gross revenue · {rangeLabel}</p>
            </div>
          </div>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b6ff1c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#b6ff1c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#32383c" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8aaa6" }} interval={Math.max(0, Math.floor(chartData.length / 8))} />
                <YAxis tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#a8aaa6" }} />
                <Area type="monotone" dataKey="revenue" stroke="#b6ff1c" fill="url(#revGrad)" strokeWidth={3} name="Revenue (AED)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Booking Funnel</h2>
            <span className="badge badge-green">{conversionRate.toFixed(1)}% completion</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "Paid", value: funnelPaid, color: "var(--green)" },
              { label: "Completed", value: completedBookings, color: "var(--green)" },
              { label: "In Progress", value: activeBookings, color: "var(--blue)" },
              { label: "Canceled", value: canceledBookings, color: "var(--red)" },
            ].map((stage) => {
              const pct = totalBookings > 0 ? Math.min(100, (stage.value / totalBookings) * 100) : 0;
              return (
                <div key={stage.label}>
                  <div className="flex justify-between text-[var(--muted)] font-[750] text-[13px] mb-2">
                    <span>{stage.label}</span>
                    <span>{stage.value}</span>
                  </div>
                  <div className="h-[9px] rounded-full bg-[#3a4044] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Bookings + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
        <div className="card overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
            <div>
              <h2 className="text-[20px] font-[900] m-0 tracking-tight">Recent Bookings</h2>
              <p className="text-[var(--muted)] text-[13px] mt-1">Latest {rangeLabel} bookings</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .sort((a: any, b: any) => b.createdAt - a.createdAt)
                  .slice(0, 10)
                  .map((b: any) => (
                    <tr key={b._id}>
                      <td className="font-mono text-[13px]">{b.bookingNumber}</td>
                      <td>
                        <div className="text-[14px] font-medium">{b.user?.name || "N/A"}</div>
                        <div className="text-[12px] text-[var(--muted)]">{b.user?.email}</div>
                      </td>
                      <td className="text-[var(--muted)]">{b.washType?.name || "N/A"}</td>
                      <td className="font-medium">{b.total} {b.currency}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: (statusColors[b.status] || "#a8aaa6") + "15", color: statusColors[b.status] || "#a8aaa6" }}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-[var(--muted)]">No bookings in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Alerts</h2>
            <span className="badge badge-red">{failedPayments} issues</span>
          </div>
          <div className="space-y-2.5">
            {failedPayments > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-[13px] bg-[var(--panel-2)] border border-[var(--border-soft)]">
                <span className="text-[14px] font-[700]"><span className="inline-block w-[9px] h-[9px] rounded-full bg-[var(--red)] mr-2" />{failedPayments} failed payments</span>
                <span className="text-[var(--muted)] text-[13px]">Retry</span>
              </div>
            )}
            {analytics.abandonedBookingsCount > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-[13px] bg-[var(--panel-2)] border border-[var(--border-soft)]">
                <span className="text-[14px] font-[700]"><span className="inline-block w-[9px] h-[9px] rounded-full bg-[var(--red)] mr-2" />{analytics.abandonedBookingsCount} abandoned bookings</span>
                <span className="text-[var(--muted)] text-[13px]">Review</span>
              </div>
            )}
            {analytics.teamUtilization.filter((t: any) => t.status !== "available").length > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-[13px] bg-[var(--panel-2)] border border-[var(--border-soft)]">
                <span className="text-[14px] font-[700]"><span className="inline-block w-[9px] h-[9px] rounded-full bg-[var(--amber)] mr-2" />{analytics.teamUtilization.filter((t: any) => t.status !== "available").length} drivers busy</span>
                <span className="text-[var(--muted)] text-[13px]">View</span>
              </div>
            )}
            <div className="flex items-center justify-between p-3.5 rounded-[13px] bg-[var(--panel-2)] border border-[var(--border-soft)]">
              <span className="text-[14px] font-[700]"><span className="inline-block w-[9px] h-[9px] rounded-full bg-[var(--green)] mr-2" />System healthy</span>
              <span className="text-[var(--muted)] text-[13px]">OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, badge, badgeClass }: { icon: React.ReactNode; label: string; value: string; badge: string; badgeClass: string }) {
  return (
    <div className="card p-[18px] min-h-[142px] relative overflow-hidden">
      <div className="after:content-[''] after:absolute after:-right-[60px] after:-bottom-[80px] after:w-[160px] after:h-[160px] after:rounded-full after:bg-[rgba(182,255,28,.055)]" />
      <div className="flex items-center justify-between mb-[18px]">
        <div className="w-[42px] h-[42px] rounded-xl grid place-items-center bg-[rgba(182,255,28,.13)] text-[var(--green)]">{icon}</div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div className="text-[var(--muted)] text-[13px] font-[750]">{label}</div>
      <div className="text-[30px] font-[950] tracking-tight mt-1">{value}</div>
    </div>
  );
}
