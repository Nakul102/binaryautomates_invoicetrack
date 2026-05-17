# InvoiceTrack

> A full-stack, local-first financial ledger and invoice management platform — zero cloud dependencies, production-grade security, runs entirely on your machine.

---

## What is InvoiceTrack?

InvoiceTrack is a self-hosted invoicing system built for developers and businesses who want full control over their billing data. It runs entirely on your local machine with a SQLite database, meaning no external cloud setup, no subscription, and no data leaving your environment.

**Core capabilities:**
- Create and manage invoices across `PENDING`, `PARTIAL`, `OVERDUE`, and `PAID` states
- Log full or partial payments with a permanent audit trail
- Automated overdue detection via a token-gated background task
- Send real payment reminder emails via [Resend](https://resend.com) (optional)
- Secure session-based authentication with HTTP-only cookies and bcrypt-hashed passwords

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Database | SQLite via Prisma ORM v5 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Email | Resend API |

---

## Getting Started

### 1. Navigate to the project root

```bash
cd invoicetrack
```

### 2. Set up your environment file

Create a `.env` file at the root of the project. You can copy the example below:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="3e1723b8dc1d974590524cfedaba1c89fcb32bd35d768b0375013044a4c9b74d"
CRON_SECRET="270fbf0670dc4c3720ecef527d8f8f5b68a993ff9a95deeb43f00b68e6c31f92"
RESEND_API_KEY="re_placeholder"
FROM_EMAIL="onboarding@resend.dev"
BUSINESS_NAME="InvoiceTrack"
SEED_ADMIN_EMAIL="admin@invoicetrack.dev"
SEED_ADMIN_PASSWORD="admin@1543"
```

> **Tip — Custom credentials:** You can change `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to whatever you want *before* running setup. The seed script will use whatever values are set here to create your admin account.

> **Tip — Real emails:** `RESEND_API_KEY` is set to `re_placeholder` by default, which disables email sending. To send real payment reminder emails, sign up at [resend.com](https://resend.com), generate a free API key from your dashboard, and replace `re_placeholder` with it.

### 3. Install dependencies

```bash
npm install
```

### 4. Run the setup pipeline

This single command generates your Prisma types, creates the SQLite database, and seeds it with mock data (users, customers, invoices, payment logs) so the dashboard opens with a rich, interactive dataset.

```bash
npm run setup
```

### 5. Launch the app

```bash
npm run demo
```

Open [http://localhost:3000/login](http://localhost:3000/login) in your browser and sign in with the credentials you configured in your `.env` file (defaults: `admin@invoicetrack.dev` / `admin@1543`).

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Path to the local SQLite file. Keep as `file:./prisma/dev.db`. |
| `JWT_SECRET` | ✅ | Secret used to sign and verify session tokens. Use a long random string in production. |
| `CRON_SECRET` | ✅ | Bearer token required to trigger the `/api/cron/overdue` background route. |
| `RESEND_API_KEY` | ⚙️ Optional | Your Resend API key for sending real emails. Defaults to `re_placeholder` (email disabled). |
| `FROM_EMAIL` | ⚙️ Optional | The sender address for outgoing email reminders. |
| `BUSINESS_NAME` | ⚙️ Optional | Appears in email templates and the UI. |
| `SEED_ADMIN_EMAIL` | ✅ | Email address for the seeded admin account. Set this before running `npm run setup`. |
| `SEED_ADMIN_PASSWORD` | ✅ | Password for the seeded admin account. Set this before running `npm run setup`. |

---

## Project Structure

```
invoicetrack/
├── .env                          # Local private config (git-ignored)
├── .env.example                  # Template for required variables
├── middleware.ts                 # Route guard — checks session cookie presence
│
├── prisma/
│   ├── schema.prisma             # Database models (User, Customer, Invoice, Payment)
│   ├── seed.ts                   # Seeds mock data using values from .env
│   └── dev.db                    # SQLite binary (git-ignored, generated on setup)
│
├── lib/
│   ├── auth.ts                   # JWT sign/verify, password hashing, session extraction
│   ├── email.ts                  # Resend integration for payment reminder emails
│   └── prisma.ts                 # Singleton Prisma client (prevents connection leaks)
│
├── components/
│   ├── CreateInvoiceModal.tsx    # New invoice form with customer picker
│   ├── InvoiceDetailPanel.tsx    # Sidebar with payment history and audit log
│   ├── EmailPreviewModal.tsx     # Email preview with running balance calculations
│   ├── MetricCards.tsx           # Dashboard summary cards (total, paid, overdue, etc.)
│   └── StatusBadge.tsx           # Color-coded invoice status indicator
│
└── app/
    ├── (auth)/login/page.tsx     # Login page
    ├── dashboard/page.tsx        # Main invoice dashboard
    └── api/
        ├── auth/login/route.ts   # Issues JWT session cookie on valid credentials
        ├── auth/logout/route.ts  # Clears session cookie
        ├── customers/route.ts    # Lists customers for invoice creation
        ├── invoices/route.ts     # GET (filtered list) + POST (create invoice)
        ├── invoices/[id]/route.ts         # GET, PATCH, DELETE for a single invoice
        ├── invoices/[id]/payments/        # POST to log a payment against an invoice
        ├── invoices/[id]/remind/          # POST to send a payment reminder email
        └── cron/overdue/route.ts          # Bearer-token-gated overdue status updater
```

---

## How Payments & Status Work

Every payment logged against an invoice is stored permanently in an audit log. The remaining balance is calculated server-side:

```
Remaining Balance = Total Invoice Amount − Sum of All Payments Logged
```

Based on this balance and the invoice due date, the system automatically transitions status:

| Condition | Status |
|---|---|
| No payments made, not yet due | `PENDING` |
| Partial payment received | `PARTIAL` |
| Balance unpaid and due date passed | `OVERDUE` |
| Balance reaches zero | `PAID` |

The `/api/cron/overdue` endpoint can be called on a schedule (e.g., via cron job or Vercel Cron) to sweep and update all overdue invoices automatically. It requires the `CRON_SECRET` as a `Bearer` token in the `Authorization` header.

---

## Security Notes

- **Passwords** are hashed with bcrypt (12 salt rounds) before being stored. The plaintext password is never saved.
- **Sessions** are managed via signed JWTs stored in HTTP-only cookies — inaccessible to client-side JavaScript.
- **The `.env` file** is git-ignored by default. Never commit it to version control.
- **The `dev.db` file** is also git-ignored. It contains your local data and should not be shared publicly.
- **Middleware** checks for a valid session cookie on every protected route before any database access occurs.

---

## Resetting the Database

To wipe and re-seed everything from scratch:

```bash
npm run setup
```

This drops the existing schema, recreates it, and re-injects all mock data using your current `.env` values.

---
