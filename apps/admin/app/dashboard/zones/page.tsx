"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus } from "lucide-react";
import { useState } from "react";
import Modal from "../../../components/ui/Modal";

type ZoneStatus = "active" | "busy" | "inactive";

type ZoneForm = {
  zoneId?: string;
  name: string;
  baseEtaMin: string;
  baseEtaMax: string;
  driversAvailable: string;
  status: ZoneStatus;
};

const EMPTY_FORM: ZoneForm = {
  zoneId: undefined,
  name: "",
  baseEtaMin: "15",
  baseEtaMax: "30",
  driversAvailable: "0",
  status: "active",
};

export default function ZonesPage() {
  const zones = useQuery(api.zones.adminListZones);
  const createZone = useMutation(api.zones.adminCreateZone);
  const updateZone = useMutation(api.zones.adminUpdateZone);
  const deleteZone = useMutation(api.zones.adminDeleteZone);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (z: any) => {
    setForm({
      zoneId: z._id,
      name: z.name,
      baseEtaMin: String(z.baseEtaMin ?? 0),
      baseEtaMax: String(z.baseEtaMax ?? 0),
      driversAvailable: String(z.driversAvailable ?? 0),
      status: (z.status as ZoneStatus) ?? "active",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      window.alert("Name is required.");
      return;
    }
    const baseEtaMin = Number(form.baseEtaMin);
    const baseEtaMax = Number(form.baseEtaMax);
    const driversAvailable = Number(form.driversAvailable);
    if (
      Number.isNaN(baseEtaMin) ||
      Number.isNaN(baseEtaMax) ||
      Number.isNaN(driversAvailable)
    ) {
      window.alert("ETA and drivers fields must be numbers.");
      return;
    }
    if (baseEtaMax < baseEtaMin) {
      window.alert("Max ETA must be >= min ETA.");
      return;
    }

    setSaving(true);
    try {
      if (form.zoneId) {
        await updateZone({
          zoneId: form.zoneId as any,
          name,
          baseEtaMin,
          baseEtaMax,
          driversAvailable,
          status: form.status,
        });
      } else {
        const id = await createZone({
          name,
          baseEtaMin,
          baseEtaMax,
          driversAvailable,
        });
        // If admin chose a non-active initial status, apply it.
        if (form.status !== "active") {
          await updateZone({ zoneId: id, status: form.status });
        }
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (error: any) {
      window.alert(error?.message || "Failed to save zone");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (z: any) => {
    const confirmed = window.confirm(`Delete zone "${z.name}"?`);
    if (!confirmed) return;
    try {
      await deleteZone({ zoneId: z._id });
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete zone");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Dubai areas</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Zones</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Area-based coverage, ETA settings, and service availability.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Zone</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Status</th>
                <th>Drivers Available</th>
                <th>Base ETA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(zones || []).map((z: any) => (
                <tr key={z._id}>
                  <td className="font-medium">{z.name}</td>
                  <td>
                    <span className={`badge ${z.status === "active" ? "badge-green" : z.status === "busy" ? "badge-amber" : "badge-red"}`}>
                      {z.status}
                    </span>
                  </td>
                  <td>{z.driversAvailable}</td>
                  <td className="text-[var(--muted)]">{z.baseEtaMin}–{z.baseEtaMax} min</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-[13px] font-[800] text-[var(--green)]"
                        onClick={() => openEdit(z)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-[13px] font-[800] text-[var(--red)]"
                        onClick={() => handleDelete(z)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!zones || zones.length === 0) && (
                <tr><td colSpan={5} className="text-center py-12 text-[var(--muted)]">No zones configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={form.zoneId ? "Edit Zone" : "Add Zone"}
        maxWidth="max-w-xl"
        footer={
          <>
            <button className="btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : form.zoneId ? "Save Changes" : "Create Zone"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Name</div>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Downtown"
            />
          </label>

          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Base ETA Min</div>
            <input
              className="input"
              type="number"
              value={form.baseEtaMin}
              onChange={(e) => setForm((f) => ({ ...f, baseEtaMin: e.target.value }))}
            />
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Base ETA Max</div>
            <input
              className="input"
              type="number"
              value={form.baseEtaMax}
              onChange={(e) => setForm((f) => ({ ...f, baseEtaMax: e.target.value }))}
            />
          </label>

          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Drivers Available</div>
            <input
              className="input"
              type="number"
              value={form.driversAvailable}
              onChange={(e) => setForm((f) => ({ ...f, driversAvailable: e.target.value }))}
            />
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Status</div>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ZoneStatus }))}
            >
              <option value="active">Active</option>
              <option value="busy">Busy</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
