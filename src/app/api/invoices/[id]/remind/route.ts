import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendReminderEmail, buildEmailSubject } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: session.userId },
      include: { customer: true },
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Cannot send reminder for a paid invoice" }, { status: 400 });
    }

    const balanceDue = invoice.totalAmount - invoice.amountPaid;
    const emailData = {
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.customer.name,
      clientEmail: invoice.customer.email,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      balanceDue,
      dueDate: invoice.dueDate.toISOString(),
      description: invoice.description,
    };

    const result = await sendReminderEmail(emailData, session.businessName);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const log = await prisma.reminderLog.create({
      data: { invoiceId: id, recipient: invoice.customer.email, medium: "EMAIL" },
    });

    return NextResponse.json({ success: true, log: { ...log, sentAt: log.sentAt.toISOString() } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}