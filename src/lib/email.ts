import { Resend } from "resend";

export interface EmailInvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string;
  description: string;
}

export function buildEmailHtml(invoice: EmailInvoiceData, businessName: string = "InvoiceTrack"): string {
  const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Reminder - ${invoice.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${businessName}</h1>
            <p style="margin:4px 0 0;color:#8888aa;font-size:13px;">Payment Reminder</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;color:#333;font-size:16px;">Dear <strong>${invoice.clientName}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
              We hope this message finds you well. We're reaching out to kindly remind you that the following invoice has an outstanding balance awaiting your attention.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1px solid #e0e4ff;border-radius:10px;margin-bottom:24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Invoice Number</td>
                      <td align="right" style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-bottom:4px;">Due Date</td>
                    </tr>
                    <tr>
                      <td style="color:#1a1a2e;font-size:18px;font-weight:700;padding-bottom:20px;">${invoice.invoiceNumber}</td>
                      <td align="right" style="color:#e05252;font-size:15px;font-weight:600;padding-bottom:20px;">${dueDateFormatted}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="border-top:1px solid #e0e4ff;padding-top:20px;">
                        <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Description</p>
                        <p style="margin:0 0 20px;color:#333;font-size:14px;">${invoice.description}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="color:#555;font-size:14px;">Invoice Total</td>
                      <td align="right" style="color:#555;font-size:14px;">${fmt(invoice.totalAmount)}</td>
                    </tr>
                    <tr>
                      <td style="color:#555;font-size:14px;padding-bottom:12px;">Amount Paid</td>
                      <td align="right" style="color:#16a34a;font-size:14px;padding-bottom:12px;">− ${fmt(invoice.amountPaid)}</td>
                    </tr>
                    <tr>
                      <td style="color:#333;font-size:15px;font-weight:700;border-top:1px solid #e0e4ff;padding-top:12px;">Balance Due</td>
                      <td align="right" style="color:#1a1a2e;font-size:26px;font-weight:800;border-top:1px solid #e0e4ff;padding-top:12px;">${fmt(invoice.balanceDue)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 32px;color:#555;font-size:14px;line-height:1.6;">
              If you've already arranged payment, please disregard this notice — and thank you! If you have any questions about this invoice, please don't hesitate to reach out.
            </p>
            <p style="margin:0;color:#888;font-size:13px;border-top:1px solid #eee;padding-top:20px;">
              This is an automated reminder sent by ${businessName}.<br/>
              Please reply to this email if you need to discuss payment arrangements.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildEmailSubject(invoice: EmailInvoiceData): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  return `Payment Reminder: ${invoice.invoiceNumber} — ${fmt(invoice.balanceDue)} Balance Due`;
}

export async function sendReminderEmail(
  invoice: EmailInvoiceData,
  businessName: string = "InvoiceTrack"
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const html = buildEmailHtml(invoice, businessName);
  const subject = buildEmailSubject(invoice);

  if (!apiKey || apiKey === "re_placeholder") {
    console.log("\n========== [DEV MODE] EMAIL SIMULATION ==========");
    console.log(`To:      ${invoice.clientEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Invoice: ${invoice.invoiceNumber}`);
    console.log(`Balance: $${invoice.balanceDue}`);
    console.log("----- HTML Template Preview (truncated) -----");
    console.log(html.slice(0, 400) + "...");
    console.log("=================================================\n");
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: invoice.clientEmail,
      subject,
      html,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}