"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

type SettingType = "number" | "string" | "json";

type SettingRow = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  type: SettingType;
};

type SettingSection = {
  title: string;
  description?: string;
  rows: SettingRow[];
};

const SECTIONS: SettingSection[] = [
  {
    title: "Pricing",
    description: "Affects checkout totals and customer-visible discounts.",
    rows: [
      {
        key: "default_service_fee_pct",
        label: "Default service fee (%)",
        description: "Added to subtotal on every booking.",
        defaultValue: "10",
        type: "number",
      },
      {
        key: "subscription_discount_pct",
        label: "Subscription discount (%)",
        description: "Discount applied to recurring bookings on an active subscription.",
        defaultValue: "10",
        type: "number",
      },
      {
        key: "currency",
        label: "Currency code",
        description: "ISO 4217 currency used across pricing and Stripe.",
        defaultValue: "AED",
        type: "string",
      },
    ],
  },
  {
    title: "Dispatch",
    description: "Tune auto-dispatch thresholds and default ETAs. Changes apply to new bookings.",
    rows: [
      {
        key: "default_eta_min",
        label: "Default ETA min (minutes)",
        description: "Lower bound used when no team location is known.",
        defaultValue: "30",
        type: "number",
      },
      {
        key: "default_eta_max",
        label: "Default ETA max (minutes)",
        description: "Upper bound used when no team location is known.",
        defaultValue: "45",
        type: "number",
      },
      {
        key: "max_per_window",
        label: "Max bookings per team per window",
        description: "Auto-dispatch will skip teams already at this load in a window.",
        defaultValue: "3",
        type: "number",
      },
      {
        key: "zone_etas",
        label: "Zone ETA overrides (JSON)",
        description:
          'Optional JSON of {"zoneName": {"min": 25, "max": 40}}. Address match is case-insensitive substring.',
        defaultValue: "{}",
        type: "json",
      },
    ],
  },
  {
    title: "Time windows",
    description: "Hours (0–23) bounding morning, afternoon, and evening booking slots.",
    rows: [
      {
        key: "time_window_morning_start",
        label: "Morning start (hour)",
        description: "0–23, inclusive.",
        defaultValue: "8",
        type: "number",
      },
      {
        key: "time_window_morning_end",
        label: "Morning end (hour)",
        description: "0–23, exclusive.",
        defaultValue: "12",
        type: "number",
      },
      {
        key: "time_window_afternoon_start",
        label: "Afternoon start (hour)",
        description: "0–23, inclusive.",
        defaultValue: "12",
        type: "number",
      },
      {
        key: "time_window_afternoon_end",
        label: "Afternoon end (hour)",
        description: "0–23, exclusive.",
        defaultValue: "16",
        type: "number",
      },
      {
        key: "time_window_evening_start",
        label: "Evening start (hour)",
        description: "0–23, inclusive.",
        defaultValue: "16",
        type: "number",
      },
      {
        key: "time_window_evening_end",
        label: "Evening end (hour)",
        description: "0–23, exclusive.",
        defaultValue: "20",
        type: "number",
      },
    ],
  },
];

const ALL_ROWS: SettingRow[] = SECTIONS.flatMap((s) => s.rows);

function validate(row: SettingRow, value: string) {
  if (row.type === "json") {
    JSON.parse(value || "{}");
    return;
  }
  if (row.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error("Must be a non-negative number");
    }
    if (row.key.startsWith("time_window_") && (n > 23 || !Number.isInteger(n))) {
      throw new Error("Hour must be an integer between 0 and 23");
    }
    if (row.key.endsWith("_pct") && n > 100) {
      throw new Error("Percent must be 0–100");
    }
    return;
  }
  // string
  if (!value || !value.trim()) throw new Error("Required");
}

export default function SettingsPage() {
  const settings = useQuery(api.settings.listSettings);
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const updateSetting = useMutation(api.settings.adminUpdateSystemSetting);

  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errorByKey, setErrorByKey] = useState<Record<string, string | null>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const isSuperadmin = currentUser?.role === "superadmin";
  const canEdit = isSuperadmin;

  useEffect(() => {
    if (!settings) return;
    const next: Record<string, string> = {};
    for (const row of ALL_ROWS) {
      const found = (settings as any[]).find((s) => s.key === row.key);
      next[row.key] = found?.value ?? row.defaultValue;
    }
    setValues((prev) => ({ ...next, ...prev }));
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (row: SettingRow) => {
    setErrorByKey((prev) => ({ ...prev, [row.key]: null }));
    setSavingKey(row.key);
    try {
      validate(row, values[row.key] ?? "");
      await updateSetting({ key: row.key, value: values[row.key] ?? "" });
      setSavedKey(row.key);
      setTimeout(
        () => setSavedKey((current) => (current === row.key ? null : current)),
        2000
      );
    } catch (e: any) {
      setErrorByKey((prev) => ({ ...prev, [row.key]: e.message || "Failed to save" }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="text-[var(--green)] text-xs font-[900] tracking-[.18em] uppercase mb-2">
          System settings
        </div>
        <h1 className="text-[32px] font-[900] tracking-tight m-0">Settings</h1>
        <p className="text-[var(--muted)] text-[15px] mt-3">
          Settings can only be edited by superadmin. Admins and operators see read-only values.
        </p>
        {currentUser && !isSuperadmin && (
          <div className="mt-3 card p-3 border border-[var(--amber)] text-[var(--amber)] text-[13px]">
            You are signed in as {currentUser.role}. Editing is disabled.
          </div>
        )}
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h2 className="text-[20px] font-[900] m-0">{section.title}</h2>
            {section.description && (
              <p className="text-[var(--muted)] text-[13px] mt-1">{section.description}</p>
            )}
          </div>

          {section.rows.map((row) => {
            const err = errorByKey[row.key];
            const disabled = !canEdit || savingKey === row.key;
            return (
              <div key={row.key} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-[900] text-[16px]">{row.label}</div>
                    <div className="text-[var(--muted)] text-[13px] mt-1">{row.description}</div>
                    <div className="text-[var(--muted)] text-[11px] mt-1 font-mono">
                      key: {row.key}
                    </div>
                    {err && (
                      <div className="text-[var(--red)] text-[12px] mt-2">{err}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {row.type === "json" ? (
                      <textarea
                        value={values[row.key] ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => handleChange(row.key, e.target.value)}
                        className="bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] font-mono w-[320px] h-[80px] disabled:opacity-60"
                      />
                    ) : row.type === "number" ? (
                      <input
                        type="number"
                        value={values[row.key] ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => handleChange(row.key, e.target.value)}
                        className="bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] w-[140px] disabled:opacity-60"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[row.key] ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => handleChange(row.key, e.target.value)}
                        className="bg-[var(--panel-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] w-[140px] disabled:opacity-60"
                      />
                    )}
                    <button
                      onClick={() => handleSave(row)}
                      disabled={disabled}
                      className="btn-primary text-[13px] h-[40px] px-4 disabled:opacity-60"
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
            );
          })}
        </section>
      ))}
    </div>
  );
}
