"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { TimeRangeFilter, type TimeRangeKey, filterByTimeRange } from "../../../components/TimeRangeFilter";

const CHART_COLORS = ["#b6ff1c", "#2f80ff", "#ffb020", "#ff4d4f", "#8a5cff"];

function formatPlate(car: any) {
  return [car.plateRegion?.toUpperCase(), car.plateNumber].filter(Boolean).join(" ");
}

export default function CustomersPage() {
  const users = useQuery(api.users.adminListUsers);
  const bookings = useQuery(api.bookings.adminListBookings);
  const cars = useQuery(api.cars.adminListCars);
  const [range, setRange] = useState<TimeRangeKey>("all");

  const allCustomers = useMemo(() => (users || []).filter((u: any) => u.role === "customer"), [users]);
  const filteredCustomers = useMemo(() => filterByTimeRange(allCustomers, range), [allCustomers, range]);
  const bookingList = bookings || [];
  const carList = cars || [];
  const filteredBookings = useMemo(() => filterByTimeRange(bookingList, range), [bookingList, range]);
  const carsByUser = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const car of carList as any[]) {
      if (car.isActive === false) continue;
      const current = map.get(car.userId) || [];
      current.push(car);
      map.set(car.userId, current);
    }
    return map;
  }, [carList]);

  const getCustomerStats = (userId: string) => {
    const ub = filteredBookings.filter((b: any) => b.userId === userId);
    const totalSpend = ub.filter((b: any) => b.paymentStatus === "succeeded").reduce((s: number, b: any) => s + b.total, 0);
    const lastBooking = ub.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
    return { totalBookings: ub.length, totalSpend, lastBooking };
  };

  const newCustomers = filteredCustomers.filter((c: any) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return c.createdAt >= thirtyDaysAgo;
  });
  const oneTimeUsers = filteredCustomers.filter((c: any) => filteredBookings.filter((b: any) => b.userId === c._id).length === 1);
  const repeatUsers = filteredCustomers.filter((c: any) => filteredBookings.filter((b: any) => b.userId === c._id).length > 1);
  const usersWithNoBookings = filteredCustomers.filter((c: any) => !filteredBookings.some((b: any) => b.userId === c._id));
  const repeatRate = filteredCustomers.length > 0 ? ((repeatUsers.length / filteredCustomers.length) * 100).toFixed(0) : "0";

  const segmentData = [
    { name: "One-time", value: oneTimeUsers.length, color: CHART_COLORS[0] },
    { name: "Repeat", value: repeatUsers.length, color: CHART_COLORS[1] },
    { name: "No Bookings", value: usersWithNoBookings.length, color: CHART_COLORS[3] },
  ].filter((d) => d.value > 0);

  const topSpenders = filteredCustomers
    .map((c: any) => {
      const stats = getCustomerStats(c._id);
      return { name: c.name?.split(" ")[0] || "N/A", spend: stats.totalSpend };
    })
    .filter((s) => s.spend > 0)
    .sort((a: { name: string; spend: number }, b: { name: string; spend: number }) => b.spend - a.spend)
    .slice(0, 8);

  const customerGrowth = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const c of filteredCustomers) {
      const d = new Date(c.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
    return Array.from(dayMap.entries())
      .sort((a, b) => new Date(a[0] + ", " + new Date().getFullYear()).getTime() - new Date(b[0] + ", " + new Date().getFullYear()).getTime())
      .map(([date, count]) => ({ date, signups: count }));
  }, [filteredCustomers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">CRM</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Customers / CRM</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Track repeat users, abandoned bookings, and high-value customers.</p>
        </div>
      </div>

      <TimeRangeFilter value={range} onChange={setRange} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Total Customers</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">{filteredCustomers.length}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">New (30d)</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--green)]">{newCustomers.length}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Repeat Rate</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">{repeatRate}%</div>
          <div className="text-[var(--muted)] text-[13px]">Target 45%</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">No Bookings Yet</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--amber)]">{usersWithNoBookings.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Customer Growth</h2>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b6ff1c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#b6ff1c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#32383c" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a8aaa6" }} interval={Math.max(0, Math.floor(customerGrowth.length / 6))} />
                <YAxis tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="signups" stroke="#b6ff1c" fill="url(#custGrad)" strokeWidth={3} name="Signups" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0 tracking-tight mb-4">Customer Segments</h2>
          {segmentData.length > 0 ? (
            <div className="h-[180px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segmentData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {segmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-[var(--muted)] text-sm">No data</div>
          )}
          <div className="space-y-2">
            {segmentData.map((d) => (
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

      {topSpenders.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Top Customers by Spend</h2>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSpenders} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#32383c" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#a8aaa6" }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => `AED ${v}`} />
                <Bar dataKey="spend" fill="#b6ff1c" radius={[0, 6, 6, 0]} name="Spend (AED)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="text-[20px] font-[900] m-0">All Customers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Bookings</th>
                <th>Vehicle Plates</th>
                <th>Total Spend</th>
                <th>Last Booking</th>
                <th>Tag</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c: any) => {
                const stats = getCustomerStats(c._id);
                const tag = stats.totalBookings === 0 ? { label: "New", cls: "badge-amber" } :
                  stats.totalBookings === 1 ? { label: "One-time", cls: "badge-blue" } :
                  { label: "Repeat", cls: "badge-green" };
                const customerCars = carsByUser.get(c._id) || [];
                return (
                  <tr key={c._id}>
                    <td>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[12px] text-[var(--muted)]">{c.email}</div>
                    </td>
                    <td className="text-[var(--muted)]">{c.phone || "—"}</td>
                    <td>{stats.totalBookings}</td>
                    <td>
                      {customerCars.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {customerCars.slice(0, 4).map((car: any) => (
                            <span key={car._id} className="badge badge-blue font-mono text-[11px]">
                              {formatPlate(car)}
                            </span>
                          ))}
                          {customerCars.length > 4 && (
                            <span className="text-[12px] text-[var(--muted)]">+{customerCars.length - 4}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="font-medium">{stats.totalSpend} AED</td>
                    <td className="text-[var(--muted)] text-[13px]">{stats.lastBooking ? new Date(stats.lastBooking.createdAt).toLocaleDateString() : "Never"}</td>
                    <td><span className={`badge ${tag.cls}`}>{tag.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
