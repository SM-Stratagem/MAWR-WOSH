"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Truck, Plus } from "lucide-react";

export default function VansPage() {
  const vans = useQuery(api.vans.adminListVans);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">Assets</div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">Vans</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">Track each van as an operational asset.</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Add Van</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(vans || []).map((v: any) => (
          <div key={v._id} className="card p-5">
            <h2 className="text-[20px] font-[900] m-0">{v.name}</h2>
            <p className="text-[var(--muted)] text-[13px] mt-1">Plate: {v.plate}</p>
            <div className="mt-3">
              <span className={`badge ${v.status === "available" ? "badge-green" : v.status === "busy" ? "badge-amber" : "badge-red"}`}>{v.status}</span>
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
    </div>
  );
}
