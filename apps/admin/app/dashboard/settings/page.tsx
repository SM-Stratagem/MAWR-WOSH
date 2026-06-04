"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

type SettingRow = { key: string; label: string; description: string; defaultValue: string };

const SETTINGS: SettingRow[] = [
  {
    key: "default_eta_min",
    label: "Default ETA min (minutes)",
    description: "Lower bound used when no team location is known.",
    defaultValue: "30",
  },
  {
    key: "default_eta_max",
    label: "Default ETA max (minutes)",
    description: "Upper bound used when no team location is known.",
    defaultValue: "45",
  },
  {
    key: "max_per_window",
    label: "Max bookings per team per window",
    description: "Auto-dispatch will skip teams already at this load in a window.",
    defaultValue: "3",
  },
  {
    key: "zone_etas",
    label: "Zone ETA overrides (JSON)",
    description:
      'Optional JSON of {"zoneName": {"min": 25, "max": 40}}. Address match is case-insensitive substring.',
    defaultValue: "{}",
  },
];

export default function DispatchSettingsPage() {
  const settings = useQuery(api.settings.listSettings);
  const updateSetting = useMutation(api.settings.adminUpdateSystemSetting);

  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, string> = {};
    for (const row of SETTINGS) {
      const found = settings.find((s: any) => s.key === row.key);
      next[row.key] = found?.value ?? row.defaultValue;
    }
    setValues((prev) => ({ ...next, ...prev }));
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setError(null);
    setSavingKey(key);
    try {
      if (key === "zone_etas") {
        JSON.parse(values[key] || "{}");
      } else {
        const n = Number(values[key]);
        if (!Number.isFinite(n) || n < 0) throw new Error("Must be a non-negative number");
      }
      await updateSetting({ key, value: values[key] });
      setSavedKey(key);
      setTimeout(() => setSavedKey((current) => (current === key ? null : current)), 2000);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">
          Superadmin only
        </div>
        <h1 className="text-[32px] font-[900] tracking-tight m-0">Dispatch Settings</h1>
        <p className="text-[var(--muted)] text-[15px] mt-3">
          Tune auto-dispatch thresholds and default ETAs. Changes apply to new bookings.
        </p>
      </div>

      {error && (
        <div className="card p-4 border border-[var(--red)] text-[var(--red)] text-[13px]">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {SETTINGS.map((row) => (
          <div key={row.key} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-[900] text-[16px]">{row.label}</div>
                <div className="text-[var(--muted)] text-[13px] mt-1">{row.description}</div>
                <div className="text-[var(--muted)] text-[11px] mt-1 font-mono">
                  key: {row.key}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {row.key === "zone_etas" ? (
                  <textarea
                    value={values[row.key] ?? ""}
                    onChange={(e) => handleChange(row.key, e.target.value)}
                    className="bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-mono w-[320px] h-[80px]"
                  />
                ) : (
                  <input
                    type="number"
                    value={values[row.key] ?? ""}
                    onChange={(e) => handleChange(row.key, e.target.value)}
                    className="bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] w-[140px]"
                  />
                )}
                <button
                  onClick={() => handleSave(row.key)}
                  disabled={savingKey === row.key}
                  className="btn-primary text-[13px] h-[40px] px-4"
                >
                  {savingKey === row.key
                    ? "Saving..."
                    : savedKey === row.key
                      ? "Saved ✓"
                      : "Save"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
