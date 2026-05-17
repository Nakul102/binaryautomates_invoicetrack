"use client";
import { DashboardStats } from "@/types";

function fmt(n: number) {
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function MetricCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm col-span-2 lg:col-span-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pipeline</p>
        <p className="text-2xl font-bold text-gray-900">{fmt(stats.totalPipeline)}</p>
        <p className="text-xs text-gray-400 mt-1">{stats.totalInvoices} invoices</p>
      </div>
      <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
        <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Pending</p>
        <p className="text-2xl font-bold text-amber-700">{fmt(stats.pendingAmount)}</p>
        <p className="text-xs text-amber-500 mt-1">{stats.pendingCount} invoices</p>
      </div>
      <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Partial</p>
        <p className="text-2xl font-bold text-blue-700">{fmt(stats.partialAmount)}</p>
        <p className="text-xs text-blue-500 mt-1">{stats.partialCount} invoices</p>
      </div>
      <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
        <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Overdue</p>
        <p className="text-2xl font-bold text-red-700">{fmt(stats.overdueAmount)}</p>
        <p className="text-xs text-red-500 mt-1">{stats.overdueCount} past due</p>
      </div>
      <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
        <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Collected</p>
        <p className="text-2xl font-bold text-green-700">{fmt(stats.collectedAmount)}</p>
        <p className="text-xs text-green-500 mt-1">{stats.paidCount} paid</p>
      </div>
    </div>
  );
}