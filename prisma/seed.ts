import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86400000);
}

async function main() {
  await prisma.reminderLog.deleteMany();
  await prisma.paymentLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      businessName: "InvoiceTrack Demo Co.",
    },
  });
  const [acme, globex, initech] = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Acme Corp",
        email: "billing@acme.com",
        phone: "+1-555-0101",
        userId: user.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "Globex Solutions",
        email: "accounts@globex.io",
        phone: "+1-555-0202",
        userId: user.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: "Initech Industries",
        email: "finance@initech.com",
        phone: "+1-555-0303",
        userId: user.id,
      },
    }),
  ]);

  // INV-0001 — PAID (amountPaid >= totalAmount)
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0001",
      totalAmount: 4500.0,
      amountPaid: 4500.0,
      dueDate: daysAgo(20),
      description: "Website redesign and SEO optimization package",
      status: "PAID",
      customerId: acme.id,
      userId: user.id,
    },
  });
  await prisma.paymentLog.create({
    data: { invoiceId: inv1.id, amountPaid: 4500.0, note: "Full payment received via bank transfer" },
  });

  // INV-0002 — PENDING (amountPaid = 0, dueDate in future)
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0002",
      totalAmount: 2200.0,
      amountPaid: 0.0,
      dueDate: daysFromNow(14),
      description: "Monthly IT support retainer — June 2025",
      status: "PENDING",
      customerId: initech.id,
      userId: user.id,
    },
  });

  // INV-0003 — PARTIAL (0 < amountPaid < totalAmount, dueDate in future)
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0003",
      totalAmount: 12800.0,
      amountPaid: 5000.0,
      dueDate: daysFromNow(10),
      description: "Enterprise software integration and data migration — Phase 1 & 2",
      status: "PARTIAL",
      customerId: globex.id,
      userId: user.id,
    },
  });
  await prisma.paymentLog.create({
    data: { invoiceId: inv3.id, amountPaid: 3000.0, note: "First instalment — project kickoff" },
  });
  await prisma.paymentLog.create({
    data: { invoiceId: inv3.id, amountPaid: 2000.0, note: "Second instalment — milestone 1 complete" },
  });

  // INV-0004 — OVERDUE (amountPaid < totalAmount, dueDate in past)
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0004",
      totalAmount: 7650.0,
      amountPaid: 0.0,
      dueDate: daysAgo(15),
      description: "Mobile app development — Phase 2 milestone delivery",
      status: "OVERDUE",
      customerId: acme.id,
      userId: user.id,
    },
  });

  // INV-0005 — OVERDUE (partial payment but still overdue)
  const inv5 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0005",
      totalAmount: 9000.0,
      amountPaid: 2000.0,
      dueDate: daysAgo(8),
      description: "Cloud infrastructure setup and DevOps pipeline configuration",
      status: "OVERDUE",
      customerId: globex.id,
      userId: user.id,
    },
  });
  await prisma.paymentLog.create({
    data: { invoiceId: inv5.id, amountPaid: 2000.0, note: "Partial deposit — remainder overdue" },
  });

  // INV-0006 — PENDING
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0006",
      totalAmount: 31000.0,
      amountPaid: 0.0,
      dueDate: daysFromNow(21),
      description: "AI-powered analytics dashboard — full build and deployment",
      status: "PENDING",
      customerId: initech.id,
      userId: user.id,
    },
  });

  // INV-0007 — PENDING
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0007",
      totalAmount: 3400.0,
      amountPaid: 0.0,
      dueDate: daysFromNow(30),
      description: "Brand identity refresh — logo, guidelines, and asset library",
      status: "PENDING",
      customerId: acme.id,
      userId: user.id,
    },
  });

  // INV-0008 — PAID
  const inv8 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0008",
      totalAmount: 6200.0,
      amountPaid: 6200.0,
      dueDate: daysAgo(5),
      description: "E-commerce platform integration — Stripe and inventory sync",
      status: "PAID",
      customerId: globex.id,
      userId: user.id,
    },
  });
  await prisma.paymentLog.create({
    data: { invoiceId: inv8.id, amountPaid: 6200.0, note: "Paid in full via wire transfer" },
  });

  // INV-0009 — OVERDUE
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0009",
      totalAmount: 1850.0,
      amountPaid: 0.0,
      dueDate: daysAgo(30),
      description: "Annual domain renewals and SSL certificates",
      status: "OVERDUE",
      customerId: initech.id,
      userId: user.id,
    },
  });

  // INV-0010 — PARTIAL
  const inv10 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-0010",
      totalAmount: 15500.0,
      amountPaid: 8000.0,
      dueDate: daysFromNow(7),
      description: "Custom CRM development — sales pipeline and reporting modules",
      status: "PARTIAL",
      customerId: acme.id,
      userId: user.id,
    },
  });
  await prisma.paymentLog.create({
    data: { invoiceId: inv10.id, amountPaid: 8000.0, note: "50% upfront — remainder due on delivery" },
  });

  console.log("Database seeded successfully.");
  console.log(" Admin credentials:");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });