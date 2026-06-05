import { ReactNode } from "react";

export type StatusVariant = "neutral" | "info" | "good" | "warn" | "hot";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  neutral: "bg-gray-100 text-gray-700 border-gray-300",
  info: "bg-blue-50 text-blue-700 border-blue-300",
  good: "bg-green-50 text-green-700 border-green-300",
  warn: "bg-amber-50 text-amber-700 border-amber-300",
  hot: "bg-red-50 text-red-700 border-red-300",
};

export default function StatusPill({
  variant = "neutral",
  children,
}: {
  variant?: StatusVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-mono uppercase tracking-wider border ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}

export function bookingStatusVariant(status: string): StatusVariant {
  if (["completed"].includes(status)) return "good";
  if (["canceled", "rejected", "payment_failed"].includes(status)) return "hot";
  if (["draft", "booked", "awaiting_payment"].includes(status)) return "warn";
  if (["on_the_way", "arrived", "washing_in_progress"].includes(status))
    return "info";
  return "neutral";
}

export function refundStatusVariant(status: string): StatusVariant {
  if (status === "approved") return "good";
  if (status === "rejected") return "hot";
  return "warn";
}
