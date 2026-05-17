"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Invoice, PaymentLog, ReminderLog, DashboardStats } from "@/types";
import MetricCards from "@/components/MetricCards";
import StatusBadge from "@/components/StatusBadge";
import EmailPreviewModal from "@/components/EmailPreviewModal";
import CreateInvoiceModal from "@/components/CreateInvoiceModal";
import InvoiceDetailPanel from "@/components/InvoiceDetailPanel";

type DetailedInvoice = Invoice & { payments: PaymentLog[]; reminders: ReminderLog[] };

export default function Dashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<DetailedInvoice | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/invoices?${params}`);

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      setInvoices(data.invoices ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, router]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const stats: DashboardStats = {
    totalPipeline: invoices.reduce((s, i) => s + i.totalAmount, 0),
    pendingAmount: invoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + i.balanceDue, 0),
    partialAmount: invoices.filter((i) => i.status === "PARTIAL").reduce((s, i) => s + i.balanceDue, 0),
    overdueAmount: invoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.balanceDue, 0),
    collectedAmount: invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0),
    totalInvoices: invoices.length,
    pendingCount: invoices.filter((i) => i.status === "PENDING").length,
    partialCount: invoices.filter((i) => i.status === "PARTIAL").length,
    overdueCount: invoices.filter((i) => i.status === "OVERDUE").length,
    paidCount: invoices.filter((i) => i.status === "PAID").length,
  };

  async function handleSelectInvoice(invoice: Invoice) {
    const res = await fetch(`/api/invoices/${invoice.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setSelectedInvoice(data.invoice);
  }

  async function handleSendReminder(invoiceId: string) {
    const res = await fetch(`/api/invoices/${invoiceId}/remind`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      showToast("Reminder sent!");
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) {
        const updated = await fetch(`/api/invoices/${invoiceId}`);
        const d = await updated.json();
        setSelectedInvoice(d.invoice);
      }
    } else {
      showToast(data.error || "Failed to send reminder", "error");
    }
  }

  async function handleLogPayment(invoiceId: string, amount: number, note: string) {
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, note }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Payment logged!");
      setSelectedInvoice(data.invoice);
      fetchInvoices();
    } else {
      showToast(data.error || "Failed to log payment", "error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Invoice deleted");
      setSelectedInvoice(null);
      fetchInvoices();
    } else {
      showToast("Failed to delete", "error");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const filterTabs = ["ALL", "PENDING", "PARTIAL", "OVERDUE", "PAID"];

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {reminderTarget && (
        <EmailPreviewModal
          invoice={reminderTarget}
          onClose={() => setReminderTarget(null)}
          onConfirm={async (id) => { await handleSendReminder(id); }}
        />
      )}
      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchInvoices(); showToast("Invoice created!"); }}
        />
      )}
      {selectedInvoice && (
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRemind={(inv) => setReminderTarget(inv)}
          onPayment={handleLogPayment}
          onDelete={handleDelete}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-[#1a1a2e] min-h-screen p-6 fixed left-0 top-0">
          <div className="mb-8">
            <h1 className="text-white font-bold text-lg">InvoiceTrack</h1>
            <p className="text-[#8888aa] text-xs mt-0.5">Small Business Suite</p>
          </div>
          <nav className="space-y-1 flex-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium">
              <span>📊</span> Dashboard
            </a>
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[#8888aa] hover:text-white hover:bg-white/5 text-sm transition-colors mt-auto"
          >
            <span>🚪</span> Sign Out
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 lg:ml-56 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage invoices and track payments</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="lg:hidden px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a4e] transition-colors flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span> New Invoice
              </button>
            </div>
          </div>

          <MetricCards stats={stats} />

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search by client, invoice #, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/20 focus:border-[#1a1a2e]"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                {filterTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Invoice", "Client", "Total", "Paid", "Balance", "Due Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-12 text-sm">Loading...</td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-12 text-sm">No invoices found</td></tr>
                  ) : invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectInvoice(inv)}
                    >
                      <td className="px-4 py-3"><span className="text-sm font-mono font-semibold text-gray-900">{inv.invoiceNumber}</span></td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{inv.customer.name}</p>
                        <p className="text-xs text-gray-400">{inv.customer.email}</p>
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-700">{fmt(inv.totalAmount)}</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-green-700">{fmt(inv.amountPaid)}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm font-bold ${inv.balanceDue > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(inv.balanceDue)}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm ${inv.status === "OVERDUE" ? "text-red-600 font-medium" : "text-gray-600"}`}>{new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {inv.status !== "PAID" && (
                            <button
                              onClick={() => setReminderTarget(inv)}
                              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                            >
                              Remind
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="block sm:hidden divide-y divide-gray-100">
              {loading ? (
                <div className="text-center text-gray-400 py-12 text-sm">Loading...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">No invoices found</div>
              ) : invoices.map((inv) => (
                <div key={inv.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleSelectInvoice(inv)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-500">{inv.invoiceNumber}</span>
                      <p className="font-semibold text-gray-900 text-sm">{inv.customer.name}</p>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{fmt(inv.balanceDue)} <span className="text-xs font-normal text-gray-400">due</span></p>
                      <p className="text-xs text-gray-400">of {fmt(inv.totalAmount)} total · Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                    {inv.status !== "PAID" && (
                      <button onClick={(e) => { e.stopPropagation(); setReminderTarget(inv); }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 font-medium">
                        Remind
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">
                {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}{statusFilter !== "ALL" ? ` · ${statusFilter.toLowerCase()}` : ""}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}