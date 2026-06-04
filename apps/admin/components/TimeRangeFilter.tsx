"use client";

export const TIME_RANGES = [
  { key: "24h", label: "24H", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7D", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30D", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "3m", label: "3M", ms: 90 * 24 * 60 * 60 * 1000 },
  { key: "6m", label: "6M", ms: 180 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "All time", ms: Infinity },
] as const;

export type TimeRangeKey = typeof TIME_RANGES[number]["key"];

export function getTimeRangeMs(range: TimeRangeKey): number {
  return TIME_RANGES.find((r) => r.key === range)!.ms;
}

export function filterByTimeRange(items: any[], range: TimeRangeKey): any[] {
  if (range === "all") return items;
  const ms = getTimeRangeMs(range);
  const cutoff = Date.now() - ms;
  return items.filter((item) => (item.createdAt ?? 0) >= cutoff);
}

export function getRangeLabel(range: TimeRangeKey): string {
  return TIME_RANGES.find((r) => r.key === range)?.label || range;
}

export function TimeRangeFilter({ value, onChange, summary }: { value: TimeRangeKey; onChange: (v: TimeRangeKey) => void; summary?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {TIME_RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={`h-[36px] px-4 rounded-full text-[13px] font-[800] transition-all duration-150 ${
            value === r.key
              ? "bg-[var(--green)] text-[#111] shadow-[0_0_20px_rgba(182,255,28,.15)]"
              : "bg-[var(--panel)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--green)]/30"
          }`}
        >
          {r.label}
        </button>
      ))}
      {summary && <span className="ml-3 text-[var(--muted)] text-[13px] font-[700]">{summary}</span>}
    </div>
  );
}
