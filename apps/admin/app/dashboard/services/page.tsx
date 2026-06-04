"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Zap, Plus } from "lucide-react";

export default function ServicesPage() {
  const washTypes = useQuery(api.washTypes.listAllWashTypes);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Pricing</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Services & Pricing</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Manage services, add-ons, durations, active status, and pricing.</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Add Service</button>
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
                </tr>
              ))}
              {(!washTypes || washTypes.length === 0) && (
                <tr><td colSpan={6} className="text-center py-12 text-[var(--muted)]">No services configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
