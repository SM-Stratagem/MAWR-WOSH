"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus, Truck } from "lucide-react";
import { useState } from "react";
import Modal from "../../../components/ui/Modal";

type VanStatus = "available" | "busy" | "maintenance";

type VanForm = {
  vanId?: string;
  name: string;
  plate: string;
  teamId: string; // "" = None
  status: VanStatus;
  notes: string;
};

const EMPTY_FORM: VanForm = {
  vanId: undefined,
  name: "",
  plate: "",
  teamId: "",
  status: "available",
  notes: "",
};

export default function VansPage() {
  const vans = useQuery(api.vans.adminListVans);
  const teams = useQuery(api.teams.adminListTeams) || [];
  const createVan = useMutation(api.vans.adminCreateVan);
  const updateVan = useMutation(api.vans.adminUpdateVan);
  const deleteVan = useMutation(api.vans.adminDeleteVan);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VanForm>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (van: any) => {
    setForm({
      vanId: van._id,
      name: van.name ?? "",
      plate: van.plate ?? "",
      teamId: van.teamId ?? "",
      status: (van.status as VanStatus) ?? "available",
      notes: van.notes ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const teamNameById = (teamId?: string) => {
    if (!teamId) return null;
    const t = teams.find((tm: any) => tm._id === teamId);
    return t?.name ?? null;
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const plate = form.plate.trim();
    if (!name || !plate) {
      window.alert("Name and plate are required.");
      return;
    }

    setSaving(true);
    try {
      if (form.vanId) {
        await updateVan({
          vanId: form.vanId as any,
          name,
          plate,
          teamId: form.teamId ? (form.teamId as any) : undefined,
          status: form.status,
          notes: form.notes.trim() ? form.notes.trim() : undefined,
        });
      } else {
        const id = await createVan({
          name,
          plate,
          teamId: form.teamId ? (form.teamId as any) : undefined,
          notes: form.notes.trim() ? form.notes.trim() : undefined,
        });
        // adminCreateVan defaults to status=available; apply override if needed.
        if (form.status !== "available") {
          await updateVan({ vanId: id, status: form.status });
        }
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (error: any) {
      window.alert(error?.message || "Failed to save van");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (van: any) => {
    const confirmed = window.confirm(`Delete van "${van.name}"?`);
    if (!confirmed) return;
    try {
      await deleteVan({ vanId: van._id });
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete van");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Assets</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Vans</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Track each van as an operational asset.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Van</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(vans || []).map((v: any) => (
          <div key={v._id} className="card p-5">
            <h2 className="text-[20px] font-[900] m-0">{v.name}</h2>
            <p className="text-[var(--muted)] text-[13px] mt-1">Plate: {v.plate}</p>
            {teamNameById(v.teamId) && (
              <p className="text-[var(--muted)] text-[13px] mt-1">Team: {teamNameById(v.teamId)}</p>
            )}
            <div className="mt-3">
              <span className={`badge ${v.status === "available" ? "badge-green" : v.status === "busy" ? "badge-amber" : "badge-red"}`}>{v.status}</span>
            </div>
            {v.notes && (
              <p className="text-[var(--muted)] text-[13px] mt-3 italic">{v.notes}</p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <button
                className="text-[13px] font-[800] text-[var(--green)]"
                onClick={() => openEdit(v)}
              >
                Edit
              </button>
              <button
                className="text-[13px] font-[800] text-[var(--red)]"
                onClick={() => handleDelete(v)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {(!vans || vans.length === 0) && (
          <div className="col-span-full card p-12 text-center">
            <Truck className="mx-auto mb-4 text-[var(--muted)]" size={48} />
            <p className="text-[var(--muted)]">No vans yet</p>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={form.vanId ? "Edit Van" : "Add Van"}
        maxWidth="max-w-xl"
        footer={
          <>
            <button className="btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : form.vanId ? "Save Changes" : "Create Van"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Name</div>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Van 1"
            />
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Plate</div>
            <input
              className="input"
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
              placeholder="DXB-A-12345"
            />
          </label>

          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Assigned Team</div>
            <select
              className="input"
              value={form.teamId}
              onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
            >
              <option value="">— None —</option>
              {teams.map((t: any) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Status</div>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VanStatus }))}
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Notes</div>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes about this van"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
