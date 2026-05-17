import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        status: { notIn: ["PAID"] },
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE", updatedAt: now },
    });

    return NextResponse.json({ success: true, updated: result.count, ranAt: now.toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}