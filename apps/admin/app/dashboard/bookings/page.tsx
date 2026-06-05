"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Modal from "../../../components/ui/Modal";

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
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
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
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>+ Manual Booking</button>
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
                  <tr
                    key={b._id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/bookings/${b._id}`)}
                  >
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

      <ManualBookingModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ManualBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const createManual = useMutation(api.bookings.adminCreateManualBooking);
  const [userId, setUserId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [washTypeId, setWashTypeId] = useState("");
  const [carIdsCsv, setCarIdsCsv] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUserId(""); setAddressId(""); setWashTypeId(""); setCarIdsCsv("");
    setScheduledFor(""); setNotes(""); setError(null);
  };

  const submit = async () => {
    setError(null);
    const carIds = carIdsCsv.split(",").map((s) => s.trim()).filter(Boolean);
    if (!userId || !addressId || !washTypeId || carIds.length === 0) {
      setError("userId, addressId, washTypeId and at least one carId are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await createManual({
        userId: userId as Id<"users">,
        addressId: addressId as Id<"addresses">,
        washTypeId: washTypeId as Id<"washTypes">,
        carIds: carIds as Id<"cars">[],
        scheduledFor: scheduledFor ? new Date(scheduledFor).getTime() : undefined,
        notes: notes || undefined,
      });
      reset();
      onClose();
      router.push(`/dashboard/bookings/${res.bookingId}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Create manual booking"
      footer={
        <>
          <button onClick={() => { reset(); onClose(); }} className="px-3 py-1.5 border rounded bg-white">Cancel</button>
          <button disabled={busy} onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50">
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-[#0e2236]">
        <p className="text-xs text-gray-500">
          Internal tool. Paste IDs directly. Booking is created as paid offline (status: confirmed).
        </p>
        <Field label="User ID" value={userId} onChange={setUserId} placeholder="users id" />
        <Field label="Address ID" value={addressId} onChange={setAddressId} placeholder="addresses id" />
        <Field label="Wash Type ID" value={washTypeId} onChange={setWashTypeId} placeholder="washTypes id" />
        <Field label="Car IDs (comma-separated)" value={carIdsCsv} onChange={setCarIdsCsv} placeholder="carId1,carId2" />
        <label className="block">
          <span className="text-sm text-gray-600">Scheduled for (optional)</span>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="block w-full mt-1 border rounded px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full mt-1 border rounded px-2 py-1.5"
            rows={2}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full mt-1 border rounded px-2 py-1.5 font-mono text-xs"
      />
    </label>
  );
}
