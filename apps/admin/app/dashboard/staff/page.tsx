"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Modal from "../../../components/ui/Modal";

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

type StaffRole = "operator" | "admin" | "superadmin";

export default function StaffPage() {
  const staff = useQuery(api.users.adminListStaff);
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const inviteStaff = useMutation(api.users.adminInviteStaff);
  const updateUser = useMutation(api.users.updateUser);

  const isSuperadmin = currentUser?.role === "superadmin";

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("operator");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Role-edit modal state
  const [editing, setEditing] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("operator");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const resetInvite = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteRole("operator");
    setInviteError(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError("Name and email are required");
      return;
    }
    setInviteBusy(true);
    try {
      await inviteStaff({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
      });
      setInviteOpen(false);
      resetInvite();
    } catch (err: any) {
      setInviteError(err?.message ?? "Failed to invite");
    } finally {
      setInviteBusy(false);
    }
  };

  const openEdit = (member: any) => {
    setEditing(member);
    setEditRole(member.role);
    setEditError(null);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    setEditBusy(true);
    try {
      await updateUser({ userId: editing._id, role: editRole });
      setEditing(null);
    } catch (err: any) {
      setEditError(err?.message ?? "Failed to update role");
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeactivate = async (member: any) => {
    if (!confirm(`Deactivate ${member.name}? They will lose access immediately.`)) return;
    setDeactivatingId(member._id);
    try {
      await updateUser({ userId: member._id, isActive: false });
    } catch (err: any) {
      alert(err?.message ?? "Failed to deactivate");
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">
            Access control
          </div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Staff &amp; Roles</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">
            Role-based access for super admin, dispatch, finance, and drivers.
          </p>
        </div>
        <button
          onClick={() => {
            resetInvite();
            setInviteOpen(true);
          }}
          className="btn-primary"
        >
          Invite Staff
        </button>
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

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[20px] font-[900] m-0">Staff Members</h2>
          <span className="text-[var(--muted)] text-[12px]">
            {staff ? `${staff.length} total` : "Loading…"}
          </span>
        </div>
        {staff === undefined ? (
          <div className="p-8 text-center text-[var(--muted)] text-[13px]">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted)] text-[13px]">
            No staff yet. Use Invite Staff to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Clerk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: any) => {
                  const pendingClerk = s.clerkId?.startsWith("pending:");
                  return (
                    <tr key={s._id}>
                      <td className="font-medium">{s.name}</td>
                      <td className="text-[var(--muted)]">{s.email}</td>
                      <td>
                        <span
                          className={`badge ${s.role === "superadmin" ? "badge-green" : "badge-blue"}`}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${s.isActive ? "badge-green" : "badge-red"}`}>
                          {s.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {pendingClerk ? (
                          <span
                            className="badge badge-amber"
                            title="Awaiting first sign-in to reconcile Clerk ID"
                          >
                            Pending invite
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] text-[12px]">Linked</span>
                        )}
                      </td>
                      <td className="space-x-2 whitespace-nowrap">
                        {isSuperadmin && (
                          <button
                            onClick={() => openEdit(s)}
                            className="text-[12px] underline text-[var(--green)]"
                          >
                            Edit role
                          </button>
                        )}
                        {s.isActive && (
                          <button
                            onClick={() => handleDeactivate(s)}
                            disabled={deactivatingId === s._id}
                            className="text-[12px] underline text-[var(--red)] disabled:opacity-60"
                          >
                            {deactivatingId === s._id ? "Deactivating…" : "Deactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          resetInvite();
        }}
        title="Invite staff"
        footer={
          <>
            <button
              onClick={() => {
                setInviteOpen(false);
                resetInvite();
              }}
              className="px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              form="invite-staff-form"
              type="submit"
              disabled={inviteBusy}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {inviteBusy ? "Inviting…" : "Send invite"}
            </button>
          </>
        }
      >
        <form id="invite-staff-form" onSubmit={handleInvite} className="space-y-3">
          <p className="text-xs text-gray-600">
            This creates the Convex user row immediately. Clerk invite must still
            be sent separately — when the invitee signs in, their account is
            reconciled by email.
          </p>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-600 font-mono">Name</span>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="block w-full mt-1 border rounded px-2 py-1.5"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-600 font-mono">Email</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="block w-full mt-1 border rounded px-2 py-1.5"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-600 font-mono">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as StaffRole)}
              className="block w-full mt-1 border rounded px-2 py-1.5"
            >
              <option value="operator">operator</option>
              <option value="admin">admin</option>
              {isSuperadmin && <option value="superadmin">superadmin</option>}
            </select>
          </label>
          {inviteError && <div className="text-red-600 text-sm">{inviteError}</div>}
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit role — ${editing.name}` : "Edit role"}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              form="edit-role-form"
              type="submit"
              disabled={editBusy}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {editBusy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form id="edit-role-form" onSubmit={handleSaveRole} className="space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-gray-600 font-mono">Role</span>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as StaffRole)}
              className="block w-full mt-1 border rounded px-2 py-1.5"
            >
              <option value="operator">operator</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </label>
          {editError && <div className="text-red-600 text-sm">{editError}</div>}
        </form>
      </Modal>
    </div>
  );
}
