"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Plus } from "lucide-react";
import { useState } from "react";
import Modal from "../../../components/ui/Modal";

type WashTypeForm = {
  washTypeId?: string;
  key: string;
  name: string;
  description: string;
  basePrice: string;
  currency: string;
  durationMins: string;
  imageUrl: string;
  featuresText: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: WashTypeForm = {
  washTypeId: undefined,
  key: "",
  name: "",
  description: "",
  basePrice: "",
  currency: "AED",
  durationMins: "",
  imageUrl: "",
  featuresText: "",
  sortOrder: "0",
  isActive: true,
};

export default function ServicesPage() {
  const washTypes = useQuery(api.washTypes.listAllWashTypes);
  const upsertWashType = useMutation(api.washTypes.adminUpsertWashType);
  const deleteWashType = useMutation(api.washTypes.adminDeleteWashType);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WashTypeForm>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (wt: any) => {
    setForm({
      washTypeId: wt._id,
      key: wt.key,
      name: wt.name,
      description: wt.description ?? "",
      basePrice: String(wt.basePrice ?? ""),
      currency: wt.currency ?? "AED",
      durationMins: String(wt.durationMins ?? ""),
      imageUrl: wt.imageUrl ?? "",
      featuresText: Array.isArray(wt.features) ? wt.features.join("\n") : "",
      sortOrder: String(wt.sortOrder ?? 0),
      isActive: !!wt.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    const key = form.key.trim().toLowerCase();
    const name = form.name.trim();
    if (!key || !name) {
      window.alert("Key and name are required.");
      return;
    }

    const basePrice = Number(form.basePrice);
    const durationMins = Number(form.durationMins);
    const sortOrder = Number(form.sortOrder);
    if (Number.isNaN(basePrice) || Number.isNaN(durationMins) || Number.isNaN(sortOrder)) {
      window.alert("Base price, duration, and sort order must be numbers.");
      return;
    }

    const features = form.featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    setSaving(true);
    try {
      await upsertWashType({
        washTypeId: form.washTypeId ? (form.washTypeId as any) : undefined,
        key,
        name,
        description: form.description,
        basePrice,
        currency: form.currency.trim() || "AED",
        durationMins,
        imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : undefined,
        features: features.length > 0 ? features : undefined,
        sortOrder,
        isActive: form.isActive,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (error: any) {
      window.alert(error?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (wt: any) => {
    try {
      await upsertWashType({
        washTypeId: wt._id,
        key: wt.key,
        name: wt.name,
        description: wt.description ?? "",
        basePrice: wt.basePrice,
        currency: wt.currency,
        durationMins: wt.durationMins,
        imageUrl: wt.imageUrl,
        features: wt.features,
        sortOrder: wt.sortOrder,
        isActive: !wt.isActive,
      });
    } catch (error: any) {
      window.alert(error?.message || "Failed to update service");
    }
  };

  const handleDelete = async (wt: any) => {
    const confirmed = window.confirm(`Delete "${wt.name}"? This sets it inactive.`);
    if (!confirmed) return;
    try {
      await deleteWashType({ washTypeId: wt._id });
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete service");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Pricing</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Services & Pricing</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Manage services, add-ons, durations, active status, and pricing.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Service</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Key</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(washTypes || []).map((wt: any) => (
                <tr key={wt._id}>
                  <td>
                    <div className="font-medium">{wt.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{wt.description}</div>
                  </td>
                  <td className="font-mono text-[13px]">{wt.key}</td>
                  <td className="font-medium">{wt.basePrice} {wt.currency}</td>
                  <td className="text-[var(--muted)]">{wt.durationMins} min</td>
                  <td>
                    <span className={`badge ${wt.isActive ? "badge-green" : "badge-red"}`}>
                      {wt.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-[var(--muted)]">{wt.sortOrder}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-[13px] font-[800] text-[var(--green)]"
                        onClick={() => openEdit(wt)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-[13px] font-[800] text-[var(--muted)]"
                        onClick={() => handleToggleActive(wt)}
                      >
                        {wt.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="text-[13px] font-[800] text-[var(--red)]"
                        onClick={() => handleDelete(wt)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!washTypes || washTypes.length === 0) && (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted)]">No services configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={form.washTypeId ? "Edit Service" : "Add Service"}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button className="btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : form.washTypeId ? "Save Changes" : "Create Service"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Key (lowercase, unique)</div>
            <input
              className="input"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
              placeholder="standard_wash"
              disabled={!!form.washTypeId}
            />
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Name</div>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Standard Wash"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Description</div>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the service"
            />
          </label>

          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Base Price</div>
            <input
              className="input"
              type="number"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
              placeholder="49"
            />
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Currency</div>
            <input
              className="input"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="AED"
            />
          </label>

          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Duration (min)</div>
            <input
              className="input"
              type="number"
              value={form.durationMins}
              onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))}
              placeholder="30"
            />
          </label>
          <label className="block">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Sort Order</div>
            <input
              className="input"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              placeholder="0"
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Image URL (optional)</div>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label className="block md:col-span-2">
            <div className="text-[13px] font-[750] text-[var(--muted)] mb-2">Features (one per line)</div>
            <textarea
              className="input"
              rows={4}
              value={form.featuresText}
              onChange={(e) => setForm((f) => ({ ...f, featuresText: e.target.value }))}
              placeholder="Exterior rinse&#10;Interior vacuum&#10;Tire shine"
            />
          </label>

          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <span className="text-[13px] font-[750]">Active</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
