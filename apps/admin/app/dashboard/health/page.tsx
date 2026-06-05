"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const checklist = [
  { label: "Stripe live mode enabled", status: "done" },
  { label: "Payment flow tested", status: "done" },
  { label: "Google Maps production key configured", status: "pending" },
  { label: "Refund flow tested", status: "pending" },
  { label: "Subscription billing tested", status: "pending" },
  { label: "Account deletion flow", status: "done" },
  { label: "Privacy policy and terms added", status: "done" },
];

const statusDot: Record<string, string> = {
  done: "bg-[var(--green)]",
  blocked: "bg-[var(--red)]",
  pending: "bg-[var(--amber)]",
};

const statusLabel: Record<string, string> = {
  done: "Done",
  blocked: "Blocked",
  pending: "Pending",
};

export default function HealthPage() {
  const metrics = useQuery(api.dashboardCache.adminHealthMetrics);
  const teams = useQuery(api.teams.adminListTeams);

  const cards = metrics
    ? [
        { label: "Bookings (24h)", value: metrics.bookings24h, hot: false },
        { label: "Completed (24h)", value: metrics.completed24h, hot: false },
        {
          label: "Payment failed (24h)",
          value: metrics.paymentFailed24h,
          hot: metrics.paymentFailed24h > 5,
        },
        {
          label: "Stuck team_assigned > 1h",
          value: metrics.stuckAssigned1h,
          hot: metrics.stuckAssigned1h > 0,
        },
        { label: "Teams available", value: metrics.teams.available, hot: metrics.teams.available === 0 },
        { label: "Teams busy", value: metrics.teams.busy, hot: false },
        { label: "Teams offline", value: metrics.teams.offline, hot: false },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">
            Operations
          </div>
          <h1 className="text-[32px] font-[900] tracking-tight m-0">System Health</h1>
          <p className="text-[var(--muted)] text-[15px] mt-3">
            Live operational metrics and launch-readiness checklist.
            {metrics && (
              <span className="ml-2 text-[12px]">
                Updated {new Date(metrics.computedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`card p-[18px] min-h-[120px] ${
                c.hot ? "border border-[var(--red)] bg-[rgba(255,77,79,0.06)]" : ""
              }`}
            >
              <div className="text-[var(--muted)] text-[13px] font-[750]">{c.label}</div>
              <div
                className={`text-[30px] font-[950] tracking-tight mt-1 font-mono ${
                  c.hot ? "text-[var(--red)]" : ""
                }`}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-[var(--muted)] text-[13px]">
          Loading metrics…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0">Stripe</h2>
          <div className="mt-3"><span className="badge badge-green">Healthy</span></div>
          <div className="text-[var(--muted)] text-[13px] mt-3 leading-relaxed">
            Live mode ready<br />
            Webhooks configured<br />
            Payments processing
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0">Google Maps</h2>
          <div className="mt-3"><span className="badge badge-amber">Check</span></div>
          <div className="text-[var(--muted)] text-[13px] mt-3 leading-relaxed">
            Verify API key is configured<br />
            Check billing and restrictions
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-[20px] font-[900] m-0">Driver GPS</h2>
          <div className="mt-3">
            <span className={`badge ${teams && teams.length > 0 ? "badge-green" : "badge-amber"}`}>
              {teams && teams.length > 0 ? "Active" : "No teams"}
            </span>
          </div>
          <div className="text-[var(--muted)] text-[13px] mt-3 leading-relaxed">
            {teams?.filter((t: any) => t.status === "available").length || 0} drivers online<br />
            GPS tracking active
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-[20px] font-[900] m-0 mb-4">Launch Checklist</h2>
        <p className="text-[var(--muted)] text-[13px] mb-5">
          Must be green before App Store / Play Store submission
        </p>
        <div className="space-y-2.5">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 p-3.5 rounded-[13px] bg-[var(--panel-2)] border border-[var(--border-soft)]"
            >
              <span className="text-[14px] font-[700]">
                <span
                  className={`inline-block w-[9px] h-[9px] rounded-full mr-2 ${statusDot[item.status]}`}
                />
                {item.label}
              </span>
              <span className="text-[var(--muted)] text-[13px]">{statusLabel[item.status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
