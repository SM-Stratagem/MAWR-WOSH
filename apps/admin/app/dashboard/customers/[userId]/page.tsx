"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import StatusPill, {
  bookingStatusVariant,
  refundStatusVariant,
} from "../../../../components/ui/StatusPill";
import EmptyState from "../../../../components/ui/EmptyState";
import Link from "next/link";

export default function CustomerDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const data = useQuery(api.users.adminGetCustomerDetail, {
    userId: userId as Id<"users">,
  });

  if (data === undefined) return <div className="p-6">Loading…</div>;
  if (data === null) return <div className="p-6">Customer not found.</div>;

  const {
    user,
    cars,
    addresses,
    bookings,
    subscriptions,
    refunds,
    totalSpent,
  } = data;

  return (
    <div className="p-6 space-y-6 max-w-6xl text-[#0e2236]">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back
      </button>

      <header>
        <p className="text-xs uppercase tracking-wider text-gray-500 font-mono">
          CUSTOMER
        </p>
        <h1 className="text-3xl font-bold">{user.name}</h1>
        <p className="text-gray-600">
          {user.email}
          {user.phone ? ` · ${user.phone}` : ""}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Role:{" "}
          <StatusPill variant={user.role === "customer" ? "neutral" : "info"}>
            {user.role}
          </StatusPill>
          {" · "}Joined {new Date(user.createdAt).toLocaleDateString()}
          {" · "}Spend:{" "}
          <span className="font-mono font-bold">{totalSpent} AED</span>
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Cars">
          {cars.length === 0 ? (
            <EmptyState title="No cars yet" />
          ) : (
            <ul className="space-y-2">
              {cars.map((c: any) => (
                <li key={c._id} className="border rounded p-3 text-sm">
                  <p className="font-medium">
                    {c.nickname || `${c.make} ${c.model}`}
                  </p>
                  <p className="text-gray-500 font-mono text-xs">
                    {c.plateNumber}
                    {c.plateRegion ? ` · ${c.plateRegion}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Addresses">
          {addresses.length === 0 ? (
            <EmptyState title="No addresses yet" />
          ) : (
            <ul className="space-y-2">
              {addresses.map((a: any) => (
                <li key={a._id} className="border rounded p-3 text-sm">
                  <p className="font-medium">
                    {a.label ?? a.formattedAddress}
                  </p>
                  {a.label && (
                    <p className="text-gray-500 text-xs">
                      {a.formattedAddress}
                    </p>
                  )}
                  {a.isDefault && (
                    <div className="mt-1">
                      <StatusPill variant="info">DEFAULT</StatusPill>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <h2 className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
          Bookings ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase font-mono text-gray-500">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Service</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr
                    key={b._id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-2 py-2 font-mono">{b.bookingNumber}</td>
                    <td className="px-2 py-2">
                      {new Date(b._creationTime).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2">{b.washType?.name ?? "—"}</td>
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
                        className="text-blue-600 hover:underline"
                        href={`/dashboard/bookings/${b._id}`}
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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
            Subscriptions
          </h2>
          {subscriptions.length === 0 ? (
            <EmptyState title="No subscriptions" />
          ) : (
            <ul className="space-y-2">
              {subscriptions.map((s: any) => (
                <li
                  key={s._id}
                  className="border rounded p-3 text-sm flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium capitalize">{s.frequency}</p>
                    <p className="text-gray-500 text-xs">
                      Discount: {s.discountPercent ?? 0}%
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/subscriptions/${s._id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Manage →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-mono uppercase text-xs tracking-wider text-gray-500 mb-2">
            Refunds
          </h2>
          {refunds.length === 0 ? (
            <EmptyState title="No refunds" />
          ) : (
            <ul className="space-y-2">
              {refunds.map((r: any) => (
                <li
                  key={r._id}
                  className="border rounded p-3 text-sm flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      {r.amount} {r.currency}
                    </p>
                    <p className="text-gray-500 text-xs">{r.reason}</p>
                  </div>
                  <StatusPill variant={refundStatusVariant(r.status)}>
                    {r.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
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
