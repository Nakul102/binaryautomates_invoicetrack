"use client";
import { useState } from "react";
import { Invoice } from "@/types";

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onConfirm: (invoiceId: string) => Promise<void>;
}

export default function EmailPreviewModal({ invoice, onClose, onConfirm }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  if (!invoice) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  async function handleSend() {
    setSending(true);
    await onConfirm(invoice!.id);
    setSent(true);
    setSending(false);
    setTimeout(() => { setSent(false); onClose(); }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
            <p className="text-sm text-gray-400 mt-0.5">Review before sending to client</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">To:</span>
              <span className="font-medium text-gray-900">{invoice.customer.email}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">Subject:</span>
              <span className="font-medium text-gray-900">
                Payment Reminder: {invoice.invoiceNumber} — {fmt(invoice.balanceDue)} Balance Due
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#1a1a2e] px-6 py-4">
              <p className="text-white font-bold text-base">InvoiceTrack</p>
              <p className="text-[#8888aa] text-xs">Payment Reminder</p>
            </div>
            <div className="p-6 bg-white">
              <p className="text-gray-700 mb-4 text-sm">Dear <strong>{invoice.customer.name}</strong>,</p>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                This is a reminder that the following invoice has an outstanding balance.
              </p>
              <div className="bg-[#f8f9ff] border border-[#e0e4ff] rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice</p>
                    <p className="font-bold text-gray-900">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Due Date</p>
                    <p className="font-semibold text-red-600 text-sm">{dueDate}</p>
                  </div>
                </div>
                <div className="border-t border-[#e0e4ff] pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total</span>
                    <span>{fmt(invoice.totalAmount)}</span>
                  </div>
                  {invoice.amountPaid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Paid</span>
                      <span className="text-green-600">− {fmt(invoice.amountPaid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-[#e0e4ff] mt-1">
                    <span className="text-sm font-semibold text-gray-700">Balance Due</span>
                    <span className="text-xl font-extrabold text-gray-900">{fmt(invoice.balanceDue)}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-xs">This is an automated reminder. Reply if you have questions.</p>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || sent}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${sent ? "bg-green-500 text-white" : "bg-[#1a1a2e] text-white hover:bg-[#2a2a4e]"} disabled:opacity-70`}
          >
            {sent ? "✓ Sent!" : sending ? "Sending..." : "Send Real Email Now"}
          </button>
        </div>
      </div>
    </div>
  );
}