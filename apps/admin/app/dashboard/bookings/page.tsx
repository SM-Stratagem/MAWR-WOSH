"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const statusColors: Record<string, string> = {
  draft: "#a8aaa6", awaiting_payment: "#ffb020", confirmed: "#2f80ff",
  team_assigned: "#2f80ff", on_the_way: "#2f80ff", arrived: "#b6ff1c",
  washing_in_progress: "#b6ff1c", completed: "#b6ff1c", canceled: "#ff4d4f",
  payment_failed: "#ff4d4f", rejected: "#ff4d4f",
};

const paymentBadge: Record<string, { bg: string; color: string; label: string }> = {
  succeeded: { bg: "rgba(182,255,28,.13)", color: "#b6ff1c", label: "Paid" },
  pending: { bg: "rgba(255,176,32,.16)", color: "#ffc76a", label: "Pending" },
  failed: { bg: "rgba(255,77,79,.15)", color: "#ff7375", label: "Failed" },
  canceled: { bg: "rgba(168,170,166,.15)", color: "#a8aaa6", label: "Canceled" },
};

function formatPlate(car: any) {
  return [car.plateRegion?.toUpperCase(), car.plateNumber].filter(Boolean).join(" ");
}

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const bookings = useQuery(api.bookings.adminListBookings, {
    searchQuery: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Operations</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Bookings</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Manage booking lifecycle from paid booking to completion.</p>
        </div>
        <button className="btn-primary">Create Manual Booking</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <input className="input" placeholder="Search booking, customer, phone, plate..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="team_assigned">Team Assigned</option>
          <option value="on_the_way">On the Way</option>
          <option value="arrived">Arrived</option>
          <option value="washing_in_progress">Washing</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Plates</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(bookings || []).map((b: any) => {
                const pb = paymentBadge[b.paymentStatus] || paymentBadge.pending;
                return (
                  <tr key={b._id}>
                    <td className="font-mono text-[13px]">{b.bookingNumber}</td>
                    <td>
                      <div className="font-medium">{b.user?.name || "N/A"}</div>
                      <div className="text-[12px] text-[var(--muted)]">{b.user?.email}</div>
                    </td>
                    <td className="text-[var(--muted)]">{b.washType?.name || "N/A"}</td>
                    <td>
                      {b.cars?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {b.cars.map((car: any) => (
                            <span key={car._id} className="badge badge-blue font-mono text-[11px]">
                              {formatPlate(car)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="font-medium">{b.total} {b.currency}</td>
                    <td><span className="badge" style={{ background: pb.bg, color: pb.color }}>{pb.label}</span></td>
                    <td><span className="badge" style={{ background: (statusColors[b.status] || "#a8aaa6") + "15", color: statusColors[b.status] }}>{b.status.replace(/_/g, " ")}</span></td>
                  </tr>
                );
              })}
              {(!bookings || bookings.length === 0) && (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted)]">No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
