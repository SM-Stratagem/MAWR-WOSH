"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus, X } from "lucide-react";

type DriverStatus = "available" | "busy" | "offline";

const INITIAL_FORM = {
  name: "",
  phone: "",
  pin: "",
  status: "available" as DriverStatus,
};

export default function DriversPage() {
  const teams = useQuery(api.teams.adminListTeams) || [];
  const createDriver = useMutation(api.teams.adminUpsertTeam);
  const deactivateDriver = useMutation(api.teams.adminDeleteTeam);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const activeCount = useMemo(() => teams.filter((team: any) => team.status !== "offline").length, [teams]);
  const availableCount = useMemo(() => teams.filter((team: any) => team.status === "available").length, [teams]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setShowModal(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.pin.trim()) {
      window.alert("Name, phone, and PIN are required.");
      return;
    }

    if (!/^\d{4,6}$/.test(form.pin.trim())) {
      window.alert("PIN must be 4 to 6 digits.");
      return;
    }

    setSaving(true);
    try {
      await createDriver({
        name: form.name.trim(),
        phone: form.phone.trim(),
        pin: form.pin.trim(),
        status: form.status,
        isActive: true,
      });
      resetForm();
    } catch (error: any) {
      window.alert(error?.message || "Failed to create driver");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (teamId: string, teamName: string) => {
    const confirmed = window.confirm(`Deactivate ${teamName}? This also blocks team login.`);
    if (!confirmed) return;

    try {
      await deactivateDriver({ teamId: teamId as any });
    } catch (error: any) {
      window.alert(error?.message || "Failed to deactivate driver");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Field team</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Drivers</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Provision driver logins, track availability, and monitor the live team roster.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Driver
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Total Drivers</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">{teams.length}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Active Now</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--green)]">{activeCount}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Available</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1">{availableCount}</div>
        </div>
        <div className="card p-[18px] min-h-[120px]">
          <div className="text-[var(--muted)] text-[13px] font-[750]">Busy / Offline</div>
          <div className="text-[30px] font-[950] tracking-tight mt-1 text-[var(--amber)]">{teams.length - availableCount}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Phone</th>
              <th>Status</th>
              <th>GPS</th>
              <th>Last Update</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team: any) => (
              <tr key={team._id}>
                <td className="font-medium">{team.name}</td>
                <td className="text-[var(--muted)]">{team.phone || "—"}</td>
                <td>
                  <span className={`badge ${team.status === "available" ? "badge-green" : team.status === "busy" ? "badge-amber" : "badge-red"}`}>
                    {team.status}
                  </span>
                </td>
                <td className="text-[var(--muted)] text-[13px]">
                  {team.currentLat ? `${team.currentLat.toFixed(4)}, ${team.currentLng?.toFixed(4)}` : "—"}
                </td>
                <td className="text-[var(--muted)] text-[13px]">
                  {team.lastLocationAt ? new Date(team.lastLocationAt).toLocaleTimeString() : "—"}
                </td>
                <td>
                  <button
                    className="text-[13px] font-[800] text-[var(--red)]"
                    onClick={() => handleDeactivate(team._id, team.name)}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-[var(--muted)]">No drivers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[24px] font-[900] tracking-tight m-0">Add Driver</h2>
                <p className="text-[var(--muted)] text-[14px] mt-2">Creates the team login used by the driver app.</p>
              </div>
              <button className="text-[var(--muted)] hover:text-[var(--text)]" onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Name</div>
                <input
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Downtown Team A"
                />
              </label>

              <label className="block">
                <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Phone</div>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+971501234567"
                />
              </label>

              <label className="block">
                <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">PIN</div>
                <input
                  className="input"
                  value={form.pin}
                  onChange={(event) => setForm((current) => ({ ...current, pin: event.target.value.replace(/[^\d]/g, "") }))}
                  placeholder="4-6 digits"
                  inputMode="numeric"
                />
              </label>

              <label className="block">
                <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Initial Status</div>
                <select
                  className="input"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DriverStatus }))}
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button className="btn-ghost" onClick={resetForm} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create Driver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
