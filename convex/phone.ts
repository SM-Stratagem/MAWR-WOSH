// Minimal phone normalization for UAE-centric flows.
// Keeps behavior predictable without pulling in a heavyweight library.
export function normalizePhone(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";

  // Remove common separators.
  const cleaned = raw.replace(/[\s().-]/g, "");

  // Preserve leading + if present.
  if (cleaned.startsWith("+")) {
    return "+" + cleaned.slice(1).replace(/[^\d]/g, "");
  }

  const digits = cleaned.replace(/[^\d]/g, "");

  // UAE: convert local 05xxxxxxxx -> +9715xxxxxxxx
  if (digits.startsWith("05") && digits.length === 10) {
    return `+971${digits.slice(1)}`;
  }

  // UAE: 9715xxxxxxxx -> +9715xxxxxxxx
  if (digits.startsWith("971") && digits.length >= 11) {
    return `+${digits}`;
  }

  // Generic: if it's already country-code-like, prefix with +
  if (digits.length >= 10) {
    return `+${digits}`;
  }

  // Fallback: return digits as-is (better than storing separators).
  return digits;
}

