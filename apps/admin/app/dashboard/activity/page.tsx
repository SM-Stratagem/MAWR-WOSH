"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";

const ENTITY_TYPES = [
  "",
  "booking",
  "user",
  "team",
  "refund",
  "subscription",
  "washType",
  "zone",
  "van",
  "systemSetting",
];

export default function ActivityPage() {
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");

  const rows = useQuery(api.activity.adminListActivity, {
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">
          Audit
        </div>
        <h1 className="text-[32px] font-[900] tracking-tight m-0">Activity log</h1>
        <p className="text-[var(--muted)] text-[15px] mt-3">
          Audit trail of admin and system actions. Filter by entity type or exact ID.
        </p>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-[var(--muted)] text-[11px] uppercase tracking-[.18em] font-mono">
              Entity type
            </span>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="block mt-1 bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] min-w-[160px]"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || "(any)"}
                </option>
              ))}
            </select>
          </label>
          <label className="block flex-1 min-w-[220px]">
            <span className="text-[var(--muted)] text-[11px] uppercase tracking-[.18em] font-mono">
              Entity ID
            </span>
            <input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Optional — filter by exact ID"
              className="block w-full mt-1 bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-mono"
            />
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        {rows === undefined ? (
          <div className="p-8 text-center text-[var(--muted)] text-[13px]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted)] text-[13px]">No activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Action</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r._id} className="align-top">
                    <td className="text-[var(--muted)] text-[12px] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="font-medium">{r.actor ?? "—"}</div>
                      {r.actorRole && (
                        <span className="badge badge-blue mt-1">{r.actorRole}</span>
                      )}
                    </td>
                    <td className="text-[12px] font-mono">
                      <div>{r.entityType}</div>
                      <div className="text-[var(--muted)] break-all">{r.entityId}</div>
                    </td>
                    <td className="font-mono text-[12px]">{r.action}</td>
                    <td className="text-[12px] text-[var(--muted)] max-w-md break-words">
                      {r.payload ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
