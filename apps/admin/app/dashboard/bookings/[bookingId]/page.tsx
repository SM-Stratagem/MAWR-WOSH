"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import StatusPill, { bookingStatusVariant } from "../../../../components/ui/StatusPill";

// Only statuses accepted by adminUpdateBookingStatus.
const STATUS_OPTIONS = [
  "confirmed",
  "team_assigned",
  "on_the_way",
  "arrived",
  "washing_in_progress",
  "completed",
  "canceled",
  "payment_failed",
] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

export default function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const detail = useQuery(api.bookings.adminGetBookingDetail, {
    bookingId: bookingId as Id<"bookings">,
  });
  const teams = useQuery(api.teams.adminListTeams);
  const updateStatus = useMutation(api.bookings.adminUpdateBookingStatus);
  const assignTeam = useMutation(api.bookings.adminAssignTeam);
  const createRefund = useMutation(api.refunds.adminCreateRefund);

  const [statusModal, setStatusModal] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);

  if (detail === undefined) return <div className="p-6">Loading…</div>;
  if (detail === null) return <div className="p-6">Booking not found.</div>;

  const b = detail.booking;
  const photos = detail.photos ?? [];
  const cars = (detail.cars ?? []).filter(Boolean) as any[];

  return (
    <div className="p-6 space-y-6 max-w-5xl text-[#0e2236]">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back
      </button>

      <header className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-mono">
            BOOKING
          </p>
          <h1 className="text-3xl font-bold">{b.bookingNumber}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusPill variant={bookingStatusVariant(b.status)}>
              {b.status}
            </StatusPill>
            <StatusPill
              variant={
                b.paymentStatus === "succeeded"
                  ? "good"
                  : b.paymentStatus === "failed"
                    ? "hot"
                    : "warn"
              }
            >
              PAY: {b.paymentStatus}
            </StatusPill>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusModal(true)}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50"
          >
            Change status
          </button>
          <button
            onClick={() => setTeamModal(true)}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50"
          >
            Reassign team
          </button>
          <button
            onClick={() => setRefundModal(true)}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 text-red-700 border-red-300"
          >
            Issue refund
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Customer">
          <p className="font-medium">{detail.user?.name ?? "—"}</p>
          <p className="text-gray-600 text-sm">{detail.user?.email ?? ""}</p>
          <p className="text-gray-600 text-sm">{detail.user?.phone ?? ""}</p>
        </Card>
        <Card title="Address">
          <p>{detail.address?.formattedAddress ?? "—"}</p>
          {detail.address?.notes && (
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-mono uppercase">Notes:</span>{" "}
              {detail.address.notes}
            </p>
          )}
        </Card>
        <Card title="Service">
          <p className="font-medium">
            {detail.washType?.name ?? "—"} · {b.selectedCarCount} car
            {b.selectedCarCount !== 1 ? "s" : ""}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-sm font-mono">
            <dt className="text-gray-500">Subtotal</dt>
            <dd className="text-right">
              {b.subtotal} {b.currency}
            </dd>
            <dt className="text-gray-500">Fee</dt>
            <dd className="text-right">{b.serviceFee}</dd>
            <dt className="text-gray-500">Discount</dt>
            <dd className="text-right">-{b.discount}</dd>
            <dt className="text-gray-500 font-bold">Total</dt>
            <dd className="text-right font-bold">{b.total}</dd>
          </dl>
        </Card>
        <Card title="Schedule">
          <p>
            {b.scheduledFor ? new Date(b.scheduledFor).toLocaleString() : "ASAP"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ETA {b.etaMin ?? "?"}–{b.etaMax ?? "?"} min
          </p>
          <p className="text-sm mt-2">
            Team:{" "}
            <span className="font-medium">
              {detail.team?.name ?? "Unassigned"}
            </span>
          </p>
        </Card>
      </section>

      <section>
        <h2 className="font-bold mb-2 font-mono uppercase text-xs tracking-wider text-gray-500">
          Cars
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cars.map(
            (c) =>
              c && (
                <div
                  key={c._id}
                  className="border rounded p-3 text-sm bg-white"
                >
                  <p className="font-medium">
                    {c.nickname || `${c.make} ${c.model}`}
                  </p>
                  <p className="text-gray-500 font-mono text-xs mt-1">
                    {c.plateNumber}
                    {c.plateRegion ? ` · ${c.plateRegion}` : ""}
                  </p>
                </div>
              ),
          )}
          {cars.length === 0 && (
            <p className="text-gray-500 text-sm col-span-3">
              No cars on this booking.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-2 font-mono uppercase text-xs tracking-wider text-gray-500">
          Photos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p: any) => (
            <a
              key={p._id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.type}
                className="w-full aspect-square object-cover border"
              />
              <p className="text-xs font-mono uppercase mt-1 text-gray-500">
                {p.type}
              </p>
            </a>
          ))}
          {photos.length === 0 && (
            <p className="text-gray-500 text-sm col-span-3">No photos yet.</p>
          )}
        </div>
      </section>

      {/* Status modal */}
      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Change booking status"
      >
        <div className="space-y-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={async () => {
                await updateStatus({ bookingId: b._id, status: s });
                setStatusModal(false);
              }}
              className={`block w-full text-left px-3 py-2 border rounded hover:bg-gray-50 ${
                s === b.status ? "bg-blue-50 border-blue-300" : ""
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Modal>

      {/* Reassign modal */}
      <Modal
        open={teamModal}
        onClose={() => setTeamModal(false)}
        title="Reassign team"
      >
        <div className="space-y-2">
          {(teams ?? []).map((t: any) => (
            <button
              key={t._id}
              onClick={async () => {
                await assignTeam({ bookingId: b._id, teamId: t._id });
                setTeamModal(false);
              }}
              className="flex items-center justify-between w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              <span className="font-medium">{t.name}</span>
              <StatusPill
                variant={
                  t.status === "available"
                    ? "good"
                    : t.status === "busy"
                      ? "warn"
                      : "neutral"
                }
              >
                {t.status}
              </StatusPill>
            </button>
          ))}
          {teams && teams.length === 0 && (
            <p className="text-sm text-gray-500">No active teams.</p>
          )}
        </div>
      </Modal>

      {/* Refund modal */}
      <RefundModal
        open={refundModal}
        onClose={() => setRefundModal(false)}
        bookingTotal={b.total}
        canSubmit={Boolean(detail.user?._id)}
        onCreate={async (amount, reason) => {
          if (!detail.user?._id) throw new Error("Missing customer on booking");
          await createRefund({
            bookingId: b._id,
            userId: detail.user._id,
            amount,
            currency: b.currency,
            reason,
            requestedBy: "admin",
          });
          setRefundModal(false);
        }}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded p-4 bg-white">
      <p className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function RefundModal({
  open,
  onClose,
  bookingTotal,
  canSubmit,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  bookingTotal: number;
  canSubmit: boolean;
  onCreate: (amount: number, reason: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(bookingTotal);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue refund"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded bg-white"
          >
            Cancel
          </button>
          <button
            disabled={busy || !reason || !canSubmit}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreate(amount, reason);
              } finally {
                setBusy(false);
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Working…" : "Issue refund"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Amount</span>
          <input
            type="number"
            min={0}
            max={bookingTotal}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="block w-full mt-1 border rounded px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Reason</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="block w-full mt-1 border rounded px-2 py-1.5"
            rows={3}
          />
        </label>
        {!canSubmit && (
          <p className="text-xs text-red-600">
            Customer record missing — refund unavailable.
          </p>
        )}
      </div>
    </Modal>
  );
}
