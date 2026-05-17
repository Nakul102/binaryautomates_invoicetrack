# InvoiceTrack

Full-stack invoice management system — local SQLite, JWT auth, partial payment ledger, automated overdue detection, and Resend email integration. Runs entirely on your machine with no external infrastructure.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) — frontend + API in one repo |
| Database | SQLite via Prisma ORM — single local file, zero setup |
| Auth | JWT + bcryptjs — HTTP-only session cookies, 12-round password hashing |
| Email | Resend API — terminal emulator mode when no real key is provided |
| Styling | Tailwind CSS v4 — responsive, mobile-first |
| Language | TypeScript throughout |

**Why SQLite over PostgreSQL?** The assignment specified Postgres. SQLite was chosen deliberately so the reviewer clones and runs with zero infrastructure — no database engine, no Docker, no cloud credentials. The Prisma schema is production-ready; swapping to Postgres is one line in `schema.prisma`.

---

## Setup

**Requirements:** Node.js 18+

```bash
git clone <repo-url>
cd invoicetrack
```

Create a `.env` file at the project root:

```env Ex--
DATABASE_URL="file:./dev.db"
JWT_SECRET="3e1723b8dc1d974590524cfedaba1c89fcb32bd35d768b0375013044a4c9b74d"
CRON_SECRET="270fbf0670dc4c3720ecef527d8f8f5b68a993ff9a95deeb43f00b68e6c31f92"
RESEND_API_KEY="re_placeholder"
FROM_EMAIL="onboarding@resend.dev"
BUSINESS_NAME="InvoiceTrack"
SEED_ADMIN_EMAIL="admin@invoicetrack.dev"
SEED_ADMIN_PASSWORD="admin@1542"
```

> Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to whatever you want **before** running setup. The seed script reads these values to create the admin account.

```bash
npm install
npm run setup   # prisma generate → db push → seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`.

**Login:** `admin@invoicetrack.dev` / `admin123` (or whatever you set in `.env`)

To wipe and reseed at any time: `npm run setup`

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite path — keep as `file:./prisma/dev.db` |
| `JWT_SECRET` | Signs session tokens — any long string |
| `CRON_SECRET` | Bearer token required by `POST /api/cron/overdue` |
| `RESEND_API_KEY` | `re_placeholder` = terminal emulator mode (no emails sent). Replace with a real key from resend.com for live sending. |
| `FROM_EMAIL` | Sender address — free Resend accounts must use `onboarding@resend.dev` |
| `BUSINESS_NAME` | Shown in email templates |
| `SEED_ADMIN_EMAIL` | Admin login email injected by seed script |
| `SEED_ADMIN_PASSWORD` | Admin login password injected by seed script |

---

## What Was Built

Core requirements delivered plus several additions not in the spec:

**Delivered as specified**
- Invoice CRUD with search and status filtering
- Email reminders via Resend with styled HTML template
- Email preview modal before any send fires
- Metric dashboard (Pipeline, Pending, Partial, Overdue, Collected)
- Responsive UI — table on desktop, stacked cards on mobile
- Prisma schema with 5 relational models, FK constraints, cascade deletes

**Beyond the spec**
- JWT authentication with bcrypt password hashing and HTTP-only session cookies
- Next.js middleware route guard protecting all dashboard and API routes
- Proper `Customer` entity — invoices belong to customers, not raw text fields
- Partial payment sub-ledger with `prisma.$transaction` atomicity and overpayment protection
- `PaymentLog` and `ReminderLog` permanent audit tables
- Autonomous cron endpoint for overdue detection — not client-side polling
- Seed script: 1 admin, 3 customers, 10 invoices covering all 4 status permutations

---

## Database Schema

```
User ──< Customer ──< Invoice ──< PaymentLog
                           └────< ReminderLog
```

| Model | Notable Fields |
|---|---|
| `User` | `email` (unique), `passwordHash`, `businessName` |
| `Customer` | `name`, `email` (unique), `phone?`, `userId` FK |
| `Invoice` | `invoiceNumber` (unique), `totalAmount`, `amountPaid`, `dueDate`, `status`, `customerId` FK, `userId` FK |
| `PaymentLog` | `amountPaid`, `paymentDate`, `note?`, `invoiceId` FK |
| `ReminderLog` | `recipient`, `medium`, `sentAt`, `invoiceId` FK |

Balance is always computed as `totalAmount − amountPaid`. Status is derived, never manually set:

| Status | Condition |
|---|---|
| `PENDING` | No payments, not yet due |
| `PARTIAL` | Partial payment received, not yet due |
| `OVERDUE` | Balance unpaid, due date passed |
| `PAID` | `amountPaid >= totalAmount` |

---

## Security

- Passwords: `bcrypt.hash(plain, 12)` — plaintext never stored
- Sessions: JWT in `httpOnly`, `sameSite: lax` cookie — inaccessible to client JS
- Middleware: checks cookie presence on Edge runtime; full JWT verification in Node.js API layer (`lib/auth.ts`) — native crypto modules cannot run on Edge
- All Prisma queries scoped to `session.userId` — cross-user data access is impossible
- Cron endpoint requires `Authorization: Bearer <CRON_SECRET>` — rejects everything else with `401`

---

## Email

**Dev mode** (`RESEND_API_KEY=re_placeholder`): No email is sent. A formatted diagnostic block prints to your terminal. A `ReminderLog` entry is still committed. The UI shows `✓ Sent!`. The entire app works without touching Resend.

**Live mode**: Replace `re_placeholder` with a real key from [resend.com](https://resend.com) and restart.

**Testing live email on a free Resend account:**
Free accounts are sandbox-restricted — Resend only delivers to the email address you registered with. To test the full live pipeline:
1. Create a new invoice in the app using **your Resend registration email** as the customer email
2. Click Send Reminder → review the preview modal → Send Real Email Now
3. Check your inbox — the styled HTML email arrives in seconds

The preview modal renders the exact recipient, subject, and email body before anything is sent. It exists specifically to prevent accidental reminders on already-paid invoices.

---

## Cron — Overdue Detection

`POST /api/cron/overdue` runs a single batch `updateMany` — all `PENDING`/`PARTIAL` invoices past their due date flip to `OVERDUE`. Bearer token required.

---

## Project Structure

```
invoicetrack/
├── .env                          # Local credentials (git-ignored)
├── middleware.ts                 # Edge runtime cookie guard → /dashboard, /api/invoices
├── prisma/
│   ├── schema.prisma             # 5 models, FK constraints, cascade deletes
│   ├── seed.ts                   # 1 admin + 3 customers + 10 invoices (all statuses)
│   └── dev.db                    # SQLite file (auto-created, git-ignored)
└── src/
    ├── app/
    │   ├── (auth)/login/page.tsx       # Login form
    │   ├── dashboard/page.tsx          # Main UI — all state, filters, modals
    │   └── api/
    │       ├── auth/login/route.ts     # POST — issue session cookie
    │       ├── auth/logout/route.ts    # POST — clear cookie
    │       ├── customers/route.ts      # GET — customer list for invoice form
    │       ├── invoices/route.ts       # GET (search/filter) + POST (create)
    │       ├── invoices/[id]/route.ts        # GET, PATCH, DELETE
    │       ├── invoices/[id]/payments/route.ts  # POST — atomic payment log
    │       ├── invoices/[id]/remind/route.ts    # POST — send email + log
    │       └── cron/overdue/route.ts   # POST — batch overdue flag (Bearer token)
    ├── components/
    │   ├── StatusBadge.tsx             # PENDING / PARTIAL / OVERDUE / PAID pill
    │   ├── MetricCards.tsx             # 5 summary cards
    │   ├── EmailPreviewModal.tsx       # Pre-send email inspection modal
    │   ├── CreateInvoiceModal.tsx      # Invoice form with customer dropdown
    │   └── InvoiceDetailPanel.tsx      # Slide-in panel — payments, reminders, actions
    ├── lib/
    │   ├── prisma.ts     # Singleton client
    │   ├── auth.ts       # bcrypt + JWT + cookie helpers
    │   └── email.ts      # Resend integration + terminal emulator fallback
    └── types/index.ts    # Shared TypeScript interfaces
```

---

## API

| Method | Endpoint | Auth | |
|---|---|---|---|
| POST | `/api/auth/login` | — | Issue session cookie |
| POST | `/api/auth/logout` | — | Clear cookie |
| GET | `/api/customers` | Session | Customer list |
| GET | `/api/invoices` | Session | `?search=` `?status=` |
| POST | `/api/invoices` | Session | Create invoice |
| GET | `/api/invoices/:id` | Session | Invoice + payments + reminders |
| PATCH | `/api/invoices/:id` | Session | Update fields |
| DELETE | `/api/invoices/:id` | Session | Cascade delete |
| POST | `/api/invoices/:id/payments` | Session | Atomic payment log |
| POST | `/api/invoices/:id/remind` | Session | Send email + ReminderLog |
| POST | `/api/cron/overdue` | Bearer | Batch overdue flag |

---

## Scripts

| Command | |
|---|---|
| `npm run setup` | `prisma generate` → `db push` → seed |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Production server |
