import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function computeStatus(totalAmount: number, amountPaid: number, dueDate: Date): string {
  if (amountPaid >= totalAmount) return "PAID";
  const now = new Date();
  if (dueDate < now) return "OVERDUE";
  if (amountPaid > 0) return "PARTIAL";
  return "PENDING";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { amount, note } = await request.json();

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({ where: { id, userId: session.userId } });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Invoice is already fully paid" }, { status: 400 });
    }

    const paymentAmount = parseFloat(amount);
    const newAmountPaid = Math.min(invoice.amountPaid + paymentAmount, invoice.totalAmount);
    const newStatus = computeStatus(invoice.totalAmount, newAmountPaid, invoice.dueDate);

    const [paymentLog, updatedInvoice] = await prisma.$transaction([
      prisma.paymentLog.create({
        data: { invoiceId: id, amountPaid: paymentAmount, note: note ?? null },
      }),
      prisma.invoice.update({
        where: { id },
        data: { amountPaid: newAmountPaid, status: newStatus, updatedAt: new Date() },
        include: { customer: true, payments: { orderBy: { paymentDate: "desc" } }, reminders: { orderBy: { sentAt: "desc" } } },
      }),
    ]);

    return NextResponse.json({
      paymentLog: { ...paymentLog, paymentDate: paymentLog.paymentDate.toISOString() },
      invoice: {
        ...updatedInvoice,
        balanceDue: updatedInvoice.totalAmount - updatedInvoice.amountPaid,
        dueDate: updatedInvoice.dueDate.toISOString(),
        createdAt: updatedInvoice.createdAt.toISOString(),
        updatedAt: updatedInvoice.updatedAt.toISOString(),
        payments: updatedInvoice.payments.map((p: { paymentDate: Date; [key: string]: any }) => ({ ...p, paymentDate: p.paymentDate.toISOString() })),
        reminders: updatedInvoice.reminders.map((r: { sentAt: Date; [key: string]: any }) => ({ ...r, sentAt: r.sentAt.toISOString() })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}