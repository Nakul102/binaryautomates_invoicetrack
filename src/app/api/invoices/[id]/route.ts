import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  totalAmount: true,
  amountPaid: true,
  dueDate: true,
  description: true,
  status: true,
  customerId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, email: true, phone: true } },
  reminders: { orderBy: { sentAt: "desc" as const } },
  payments: { orderBy: { paymentDate: "desc" as const } },
} as const;

function shapeInvoice(inv: any) {
  return {
    ...inv,
    balanceDue: inv.totalAmount - inv.amountPaid,
    dueDate: inv.dueDate.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    reminders: inv.reminders.map((r: any) => ({ ...r, sentAt: r.sentAt.toISOString() })),
    payments: inv.payments.map((p: any) => ({ ...p, paymentDate: p.paymentDate.toISOString() })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: session.userId },
      select: invoiceSelect,
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ invoice: shapeInvoice(invoice) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.invoice.findFirst({ where: { id, userId: session.userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.invoice.update({
      where: { id },
      data: { ...body, updatedAt: new Date() },
      select: invoiceSelect,
    });

    return NextResponse.json({ invoice: shapeInvoice(updated) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.invoice.findFirst({ where: { id, userId: session.userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}