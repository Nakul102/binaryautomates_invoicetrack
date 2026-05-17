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
} as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const statusFilter = searchParams.get("status") ?? "ALL";

    const where: any = { userId: session.userId };

    if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { description: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: invoiceSelect,
      orderBy: { createdAt: "desc" },
    });

    const shaped = invoices.map((inv: typeof invoices[number]) => ({
      ...inv,
      balanceDue: inv.totalAmount - inv.amountPaid,
      dueDate: inv.dueDate.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    }));

    return NextResponse.json({ invoices: shaped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoiceNumber, totalAmount, dueDate, description, customerId } = body;

    if (!invoiceNumber || !totalAmount || !dueDate || !description || !customerId) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const dueDateObj = new Date(dueDate);
    const status = computeStatus(parseFloat(totalAmount), 0, dueDateObj);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        totalAmount: parseFloat(totalAmount),
        amountPaid: 0,
        dueDate: dueDateObj,
        description,
        status,
        customerId,
        userId: session.userId,
      },
      select: invoiceSelect,
    });

    return NextResponse.json({
      invoice: {
        ...invoice,
        balanceDue: invoice.totalAmount - invoice.amountPaid,
        dueDate: invoice.dueDate.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Invoice number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}