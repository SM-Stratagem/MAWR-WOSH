"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TimeRangeFilter, type TimeRangeKey, filterByTimeRange } from "../../../components/TimeRangeFilter";

export default function RefundsPage() {
  const refunds = useQuery(api.refunds.adminListRefunds);
  const reviewRefund = useMutation(api.refunds.adminReviewRefund);
  const [range, setRange] = useState<TimeRangeKey>("all");

  const allRefunds = refunds || [];
  const filteredRefunds = useMemo(() => filterByTimeRange(allRefunds, range), [allRefunds, range]);

  const pendingCount = filteredRefunds.filter((r: any) => r.status === "pending").length;
  const approvedCount = filteredRefunds.filter((r: any) => r.status === "approved").length;
  const rejectedCount = filteredRefunds.filter((r: any) => r.status === "rejected").length;
  const totalAmount = filteredRefunds.filter((r: any) => r.status === "approved").reduce((s: number, r: any) => s + r.amount, 0);
  const pendingAmount = filteredRefunds.filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + r.amount, 0);

  const statusData = [
    { name: "Pending", value: pendingCount, color: "#ffb020" },
    { name: "Approved", value: approvedCount, color: "#b6ff1c" },
    { name: "Rejected", value: rejectedCount, color: "#ff4d4f" },
  ].filter((d) => d.value > 0);

  const reasonsBreakdown = useMemo(() => {
    const reasonMap = new Map<string, number>();
    for (const r of filteredRefunds) {
      reasonMap.set(r.reason, (reasonMap.get(r.reason) || 0) + 1);
    }
    return Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRefunds]);

  const handleReview = async (refundId: string, status: "approved" | "rejected") => {
    try {
      await reviewRefund({ refundId: refundId as any, status });
    } catch (error) {
      console.error("Failed to review refund:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Finance workflow</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Refund Requests</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Finance/admin can request refunds. Super admin approves or rejects.</p>
        </div>
      </div>

      <TimeRangeFilter value={range} onChange={setRange} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Total Requests</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">{filteredRefunds.length}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Pending</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--amber)]">{pendingCount}</div>
          <div className="text-[var(--muted)] text-[13px]">AED {pendingAmount.toLocaleString()}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Approved</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--green)]">{approvedCount}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Total Refunded</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--red)]">AED {totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-[900] m-0 tracking-tight">Refund Reasons</h2>
          </div>
          <div className="h-[200px]">
            {reasonsBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonsBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#32383c" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#a8aaa6" }} />
                  <YAxis type="category" dataKey="reason" tick={{ fontSize: 12, fill: "#a8aaa6" }} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#ff4d4f" radius={[0, 6, 6, 0]} name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-[var(--muted)]">No data</div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0 tracking-tight mb-4">Status Breakdown</h2>
          {statusData.length > 0 ? (
            <div className="h-[160px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#292d30", border: "1px solid #3b4246", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-[var(--muted)]">No data</div>
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

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="text-[20px] font-[900] m-0">All Refund Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map((r: any) => (
                <tr key={r._id}>
                  <td className="font-mono text-[13px]">{r.booking?.bookingNumber || "N/A"}</td>
                  <td>{r.user?.name || "N/A"}</td>
                  <td className="font-medium">{r.amount} {r.currency}</td>
                  <td className="text-[var(--muted)]">{r.reason}</td>
                  <td className="text-[var(--muted)]">{r.requestedBy}</td>
                  <td>
                    <span className={`badge ${r.status === "approved" ? "badge-green" : r.status === "rejected" ? "badge-red" : "badge-amber"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button className="btn-primary text-[12px] h-[32px] px-3" onClick={() => handleReview(r._id, "approved")}>Approve</button>
                        <button className="btn-secondary text-[12px] h-[32px] px-3" onClick={() => handleReview(r._id, "rejected")}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRefunds.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted)]">No refund requests in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
