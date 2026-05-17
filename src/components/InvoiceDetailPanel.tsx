"use client";
import { useState } from "react";
import { Invoice, PaymentLog, ReminderLog } from "@/types";
import StatusBadge from "./StatusBadge";

interface Props {
  invoice: Invoice & { payments: PaymentLog[]; reminders: ReminderLog[] };
  onClose: () => void;
  onRemind: (invoice: Invoice) => void;
  onPayment: (invoiceId: string, amount: number, note: string) => Promise<void>;
  onDelete: (id: string) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function InvoiceDetailPanel({ invoice, onClose, onRemind, onPayment, onDelete }: Props) {
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");

  const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const balanceDue = invoice.totalAmount - invoice.amountPaid;

  async function handleLogPayment() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setPayError("Enter a valid amount"); return; }
    if (amount > balanceDue) { setPayError(`Cannot exceed balance due of ${fmt(balanceDue)}`); return; }
    setPayLoading(true);
    setPayError("");
    await onPayment(invoice.id, amount, payNote);
    setPayAmount("");
    setPayNote("");
    setPayLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[460px] bg-white shadow-2xl h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{invoice.invoiceNumber}</p>
            <h2 className="text-xl font-bold text-gray-900">{invoice.customer.name}</h2>
            <p className="text-sm text-gray-500">{invoice.customer.email}</p>
            {invoice.customer.phone && <p className="text-sm text-gray-400">{invoice.customer.phone}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">&times;</button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          {/* Status + amounts */}
          <div className="flex items-center justify-between">
            <StatusBadge status={invoice.status} />
            <div className="text-right">
              <p className="text-2xl font-extrabold text-gray-900">{fmt(balanceDue)}</p>
              <p className="text-xs text-gray-400">balance due</p>
            </div>
          </div>

          {/* Financial breakdown */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice Total</span>
              <span className="font-semibold text-gray-900">{fmt(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-semibold text-green-700">{fmt(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
              <span className="font-semibold text-gray-700">Balance Due</span>
              <span className={`font-bold ${balanceDue > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(balanceDue)}</span>
            </div>
          </div>

          {/* Due date */}
          <div className={`rounded-lg p-3 ${invoice.status === "OVERDUE" ? "bg-red-50" : "bg-gray-50"}`}>
            <p className={`text-xs uppercase tracking-wide mb-1 ${invoice.status === "OVERDUE" ? "text-red-400" : "text-gray-400"}`}>Due Date</p>
            <p className={`text-sm font-semibold ${invoice.status === "OVERDUE" ? "text-red-700" : "text-gray-900"}`}>{dueDate}</p>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed">{invoice.description}</p>
          </div>

          {/* Log a payment */}
          {invoice.status !== "PAID" && (
            <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/30">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Log a Payment</p>
              <div className="space-y-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`Amount (max ${fmt(balanceDue)})`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Note (e.g. bank transfer, cheque)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
                {payError && <p className="text-red-600 text-xs">{payError}</p>}
                <button
                  onClick={handleLogPayment}
                  disabled={payLoading}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {payLoading ? "Logging..." : "Log Payment"}
                </button>
              </div>
            </div>
          )}

          {/* Payment sub-ledger */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Payment History</p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                {invoice.payments.length} log{invoice.payments.length !== 1 ? "s" : ""}
              </span>
            </div>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 text-sm bg-green-50 rounded-lg p-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-green-800">{fmt(p.amountPaid)}</span>
                        <span className="text-gray-400 text-xs">{new Date(p.paymentDate).toLocaleDateString()}</span>
                      </div>
                      {p.note && <p className="text-gray-500 text-xs mt-0.5">{p.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminder audit log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Reminder History</p>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {invoice.reminders.length} sent
              </span>
            </div>
            {invoice.reminders.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No reminders sent yet</p>
            ) : (
              <div className="space-y-2">
                {invoice.reminders.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-700 font-medium">Email reminder → {r.recipient}</p>
                      <p className="text-gray-400 text-xs">{new Date(r.sentAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 space-y-2">
          {invoice.status !== "PAID" && (
            <button
              onClick={() => onRemind(invoice)}
              className="w-full px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a4e] transition-colors"
            >
              Send Reminder Email
            </button>
          )}
          <button
            onClick={() => onDelete(invoice.id)}
            className="w-full px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Delete Invoice
          </button>
        </div>
      </div>
    </div>
  );
}