"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";

export default function ZonesPage() {
  const zones = useQuery(api.zones.adminListZones);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Dubai areas</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Zones</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Area-based coverage, ETA settings, and service availability.</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Add Zone</button>
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
                </tr>
              ))}
              {(!zones || zones.length === 0) && (
                <tr><td colSpan={4} className="text-center py-12 text-[var(--muted)]">No zones configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
