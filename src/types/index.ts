export type InvoiceStatus = "PENDING" | "PARTIAL" | "OVERDUE" | "PAID";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string;
  description: string;
  status: InvoiceStatus;
  customerId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
}

export interface PaymentLog {
  id: string;
  invoiceId: string;
  amountPaid: number;
  paymentDate: string;
  note?: string | null;
}

export interface ReminderLog {
  id: string;
  invoiceId: string;
  sentAt: string;
  recipient: string;
  medium: string;
}

export interface DashboardStats {
  totalPipeline: number;
  pendingAmount: number;
  partialAmount: number;
  overdueAmount: number;
  collectedAmount: number;
  totalInvoices: number;
  pendingCount: number;
  partialCount: number;
  overdueCount: number;
  paidCount: number;
}

export interface SessionUser {
  userId: string;
  email: string;
  businessName: string;
}