"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Shield, Users } from "lucide-react";

const roles = [
  { name: "Super Admin", desc: "Full access to operations, payments, roles, settings, refunds, services, and system health." },
  { name: "Admin / Dispatch", desc: "Bookings, customer contact, assignment, live map, drivers, vans, and operational actions." },
  { name: "Finance", desc: "Payments, subscription revenue, failed payments, reports, refund requests, and exports." },
  { name: "Driver", desc: "Own assigned bookings only, navigation, status updates, and before/after photo uploads." },
];

const permissions = [
  { perm: "View bookings", sa: "✓", ad: "✓", fi: "✓", dr: "Own only" },
  { perm: "Assign drivers", sa: "✓", ad: "✓", fi: "—", dr: "—" },
  { perm: "Request refund", sa: "✓", ad: "✓", fi: "✓", dr: "—" },
  { perm: "Approve refund", sa: "✓", ad: "—", fi: "Optional", dr: "—" },
  { perm: "View payments", sa: "✓", ad: "—", fi: "✓", dr: "—" },
  { perm: "Manage services", sa: "✓", ad: "—", fi: "—", dr: "—" },
];

export default function StaffPage() {
  const users = useQuery(api.users.adminListUsers);
  const staff = (users || []).filter((u: any) => u.role === "admin" || u.role === "superadmin" || u.role === "operator");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Access control</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Staff & Roles</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Role-based access for super admin, dispatch, finance, and drivers.</p>
        </div>
        <button className="btn-primary">Invite Staff</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {roles.map((r) => (
          <div key={r.name} className="card p-5">
            <h3 className="text-[17px] font-[900] m-0 mb-2.5">{r.name}</h3>
            <p className="text-[var(--muted)] text-[13px] m-0 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Super Admin</th>
                <th>Admin</th>
                <th>Finance</th>
                <th>Driver</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.perm}>
                  <td className="font-medium">{p.perm}</td>
                  <td className={p.sa === "✓" ? "text-[var(--green)]" : "text-[var(--muted)]"}>{p.sa}</td>
                  <td className={p.ad === "✓" ? "text-[var(--green)]" : "text-[var(--muted)]"}>{p.ad}</td>
                  <td className={p.fi === "✓" ? "text-[var(--green)]" : "text-[var(--muted)]"}>{p.fi}</td>
                  <td className="text-[var(--muted)]">{p.dr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {staff.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-[var(--border)]">
            <h2 className="text-[20px] font-[900] m-0">Staff Members</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: any) => (
                  <tr key={s._id}>
                    <td className="font-medium">{s.name}</td>
                    <td className="text-[var(--muted)]">{s.email}</td>
                    <td><span className={`badge ${s.role === "superadmin" ? "badge-green" : "badge-blue"}`}>{s.role}</span></td>
                    <td><span className={`badge ${s.isActive ? "badge-green" : "badge-red"}`}>{s.isActive ? "Active" : "Inactive"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
