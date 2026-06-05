"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import Modal from "../../../../components/ui/Modal";
import StatusPill, {
  bookingStatusVariant,
} from "../../../../components/ui/StatusPill";

const FREQUENCY_OPTIONS = ["weekly", "biweekly", "monthly"] as const;
type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];

const STATUS_OPTIONS = ["active", "paused", "canceled"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

function subscriptionStatusVariant(status: string) {
  if (status === "active") return "good" as const;
  if (status === "paused") return "warn" as const;
  if (status === "canceled") return "hot" as const;
  return "neutral" as const;
}

export default function SubscriptionDetailPage() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const router = useRouter();
  const detail = useQuery(api.subscriptions.adminGetSubscriptionDetail, {
    subscriptionId: subscriptionId as Id<"subscriptions">,
  });
  const updateSub = useMutation(api.subscriptions.adminUpdateSubscription);

  const [editOpen, setEditOpen] = useState(false);

  if (detail === undefined) return <div className="p-6">Loading…</div>;
  if (detail === null) return <div className="p-6">Subscription not found.</div>;

  const { sub, user, address, washType, cars, recentBookings } = detail;

  const setStatus = async (status: StatusOption) => {
    await updateSub({ subscriptionId: sub._id, status });
  };

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
            SUBSCRIPTION
          </p>
          <h1 className="text-3xl font-bold capitalize">{sub.frequency} plan</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusPill variant={subscriptionStatusVariant(sub.status)}>
              {sub.status}
            </StatusPill>
            {user && (
              <Link
                href={`/dashboard/customers/${user._id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {user.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatus("paused")}
            disabled={sub.status === "paused" || sub.status === "canceled"}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pause
          </button>
          <button
            onClick={() => setStatus("active")}
            disabled={sub.status === "active" || sub.status === "canceled"}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Resume
          </button>
          <button
            onClick={() => setStatus("canceled")}
            disabled={sub.status === "canceled"}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50 text-red-700 border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="px-3 py-1.5 border rounded text-sm bg-white hover:bg-gray-50"
          >
            Edit
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Customer">
          <p className="font-medium">{user?.name ?? "—"}</p>
          <p className="text-gray-600 text-sm">{user?.email ?? ""}</p>
          <p className="text-gray-600 text-sm">{user?.phone ?? ""}</p>
        </Card>
        <Card title="Address">
          <p>{address?.formattedAddress ?? "—"}</p>
          {address?.notes && (
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-mono uppercase">Notes:</span> {address.notes}
            </p>
          )}
        </Card>
        <Card title="Service">
          <p className="font-medium">{washType?.name ?? "—"}</p>
          <dl className="mt-2 grid grid-cols-2 gap-1 text-sm font-mono">
            <dt className="text-gray-500">Cars</dt>
            <dd className="text-right">{sub.selectedCarIds.length}</dd>
            <dt className="text-gray-500">Discount</dt>
            <dd className="text-right">{sub.discountPercent ?? 0}%</dd>
            <dt className="text-gray-500">Frequency</dt>
            <dd className="text-right capitalize">{sub.frequency}</dd>
          </dl>
        </Card>
        <Card title="Schedule">
          <p className="text-sm">
            Next run:{" "}
            <span className="font-medium">
              {sub.nextRunAt
                ? new Date(sub.nextRunAt).toLocaleString()
                : "—"}
            </span>
          </p>
          <p className="text-sm mt-1">
            Last run:{" "}
            <span className="font-medium">
              {sub.lastRunAt
                ? new Date(sub.lastRunAt).toLocaleString()
                : "Never"}
            </span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(sub.createdAt).toLocaleDateString()}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
          Cars
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cars.map(
            (c: any) =>
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
              No cars on this subscription.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
          Recent runs ({recentBookings.length})
        </h2>
        {recentBookings.length === 0 ? (
          <p className="text-sm text-gray-500">
            No recurring bookings generated yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase font-mono text-gray-500">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b: any) => (
                  <tr
                    key={b._id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-2 py-2 font-mono">{b.bookingNumber}</td>
                    <td className="px-2 py-2">
                      {new Date(b._creationTime).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2 font-mono">
                      {b.total} {b.currency}
                    </td>
                    <td className="px-2 py-2">
                      <StatusPill variant={bookingStatusVariant(b.status)}>
                        {b.status}
                      </StatusPill>
                    </td>
                    <td className="px-2 py-2">
                      <Link
                        href={`/dashboard/bookings/${b._id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <EditSubscriptionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          frequency: sub.frequency as FrequencyOption,
          status: sub.status as StatusOption,
          discountPercent: sub.discountPercent ?? 0,
        }}
        onSubmit={async (values) => {
          await updateSub({
            subscriptionId: sub._id,
            frequency: values.frequency,
            status: values.status,
            discountPercent: values.discountPercent,
          });
          setEditOpen(false);
        }}
      />
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded p-4 bg-white">
      <p className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function EditSubscriptionModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial: {
    frequency: FrequencyOption;
    status: StatusOption;
    discountPercent: number;
  };
  onSubmit: (values: {
    frequency: FrequencyOption;
    status: StatusOption;
    discountPercent: number;
  }) => Promise<void>;
}) {
  const [frequency, setFrequency] = useState<FrequencyOption>(initial.frequency);
  const [status, setStatus] = useState<StatusOption>(initial.status);
  const [discountPercent, setDiscountPercent] = useState<number>(
    initial.discountPercent,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid =
    Number.isFinite(discountPercent) &&
    discountPercent >= 0 &&
    discountPercent <= 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit subscription"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded bg-white"
          >
            Cancel
          </button>
          <button
            disabled={busy || !valid}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onSubmit({ frequency, status, discountPercent });
              } catch (e: any) {
                setErr(e?.message ?? "Failed to update");
              } finally {
                setBusy(false);
              }
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Frequency</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as FrequencyOption)}
            className="block w-full mt-1 border rounded px-2 py-1.5 bg-white"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusOption)}
            className="block w-full mt-1 border rounded px-2 py-1.5 bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-gray-600">Discount %</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="block w-full mt-1 border rounded px-2 py-1.5"
          />
          {!valid && (
            <p className="text-xs text-red-600 mt-1">
              Discount must be between 0 and 100.
            </p>
          )}
        </label>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
