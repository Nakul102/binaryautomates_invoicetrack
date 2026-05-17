"use client";
import { InvoiceStatus } from "@/types";

const config: Record<InvoiceStatus, { label: string; className: string; dot: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border border-amber-200",
    dot: "bg-amber-500",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
    dot: "bg-blue-500",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 border border-red-200",
    dot: "bg-red-500",
  },
  PAID: {
    label: "Paid",
    className: "bg-green-100 text-green-800 border border-green-200",
    dot: "bg-green-500",
  },
};

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className, dot } = config[status] ?? config["PENDING"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`} />
      {label}
    </span>
  );
}