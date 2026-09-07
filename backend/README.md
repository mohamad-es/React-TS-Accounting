# Fonitas Accounting API — implementation status

This is an initial working backend, **not a production-complete finance system**.

## Implemented

- NestJS/TypeScript REST API and generated endpoint documentation at `/api/docs`.
- PostgreSQL/Prisma schema and two versioned migrations.
- Fonitas RS256/JWKS verification with issuer, expiration, token type, project audience and role checks. No private Auth keys or Auth database access.
- Central staff roles: `admin`, `accountant`, `viewer`. Customer endpoints enforce `user_id` ownership. These are proposed Accounting role codes and must be provisioned in Fonitas Auth.
- Create/list projects, customers, contributors, percentage contracts and expenses through API and multilingual forms; create multi-line invoice drafts from central seller settings with exact decimal totals and contract snapshots.
- Customer invoice/payment lists and authorized XML downloads/print previews with private contract economics excluded. Browser print supports printing or saving the visual invoice as PDF; the XML is the structured e-invoice original.
- Test-mode Mollie checkout creation and authoritative payment webhook lookup, duplicate-safe payment journals and pending percentage accruals. No live Mollie calls were made; integration tests use a test-only transport fixture, including duplicate webhook delivery.
- Admin approval of accruals with an audit event. Approval does not transfer funds.
- Localized API error messages in English, German, Persian, Arabic and Turkish.
- `/finance` frontend route with ordinary Fonitas Auth login, TOTP, in-memory access tokens, single-flight refresh, staff/customer record views and five-language RTL/LTR support.

## Incomplete / disabled

- Invoice issuance now validates UBL XRechnung 3.0 against the local KoSIT validator before assigning its permanent number and journal. Issued XML, HTML, validation report and XML hash are stored together. Supported tax scope is domestic German sales at 7% or 19% VAT only. Reverse charge, exemptions, cross-border/OSS, ZUGFeRD and credit/correction documents remain to implement. Form settings require a German VAT ID; sellers using only a tax number need a future supported profile.
- Mollie currently permits only `test_` API keys. Refunds, chargebacks, failed/refunded commission reversals, expiry/reconciliation jobs and real Mollie sandbox verification remain to implement.
- The working percentage contract basis is explicitly `NET_SALES_BEFORE_FEES`. Fixed fees, payroll, investor distributions, overlapping agreement rules, attribution and line-level third-party allocations remain to implement. Aggregate percentage validation is an initial safeguard, not a complete allocation policy.
- Bank/crypto transfers, payout destinations, approval segregation and provider integrations are not implemented.
- Expenses are recorded with recurrence metadata; recurring expense generation and ledger posting are not implemented.
- Existing legacy accounting screens still call their original API. Only the new `/finance` route uses this backend. Legacy endpoint migration and final superadmin design alignment remain; the new finance forms are implemented.
- Lists are capped at 100; pagination, search and full audit coverage remain. The current staff model grants central access across Fonitas projects; departmental/project-restricted staff policies remain to define.
- Original frontend dependencies have existing audit findings. Backend audit passed with zero findings after a `deepmerge-ts` override; retain regression checks on Prisma configuration.

## Local setup

Use Node 22+ and Docker. Copy `.env.example` to `.env`, set the Auth URL, issuer and project key, then:

```sh
npm ci
npm run db:generate
docker compose up -d
npm run db:migrate
npm run build
npm start
```

`npm start` loads `.env`; this file is ignored by Git. The local PostgreSQL port is 5433 and bound to loopback. The default password is only for local development. Auth's public JWKS endpoint is `https://authapi.fonitas.com/api/Keys/jwks`; verify the configured issuer against the deployed Auth setting. No real credentials are bundled.

Frontend: set `VITE_FONITAS_AUTH_URL=https://authapi.fonitas.com/api`, `VITE_FONITAS_PROJECT_KEY=accounting`, and `VITE_FINANCE_API_URL=http://127.0.0.1:3100/api/v1` in a local environment file. Run the existing Vite app and open `/finance`. Match `FRONTEND_ORIGIN` to its actual origin (comma-separated allowlist supported).

The Auth project and user memberships must exist. Browser cookie policy may require same-site staging for refresh. CORS preflight was checked for the local preview; real login has not been tested with a user account.

## Verification

```sh
npm test
# Create a dedicated empty database, apply migrations with DATABASE_URL pointing to it.
TEST_DATABASE_URL=postgresql://.../accounting_test npm run test:integration
```

Integration tests use a temporary local signing-key server, a separate API process and the specified test database. They create synthetic records and clean up after success. Never set TEST_DATABASE_URL to a production database.

Verified: backend/frontend builds, seven domain tests, and a database-backed sale scenario covering rejected invoice rollback, real KoSIT validation, idempotent issuance, authorized XML downloads, simulated Mollie checkout, duplicate webhook delivery and a single contributor accrual. Verified admin login against deployed Fonitas Auth and project creation through the browser. Visual review includes German printable invoices and Persian RTL forms.

## Invoice workflow

1. In `/finance`, open Seller settings and save Fonitas's real legal details. No real seller details were invented or prefilled.
2. Create a customer linked to their Fonitas user ID, third party and percentage contract, then create an invoice with its project, customer, dates, buyer reference and selected contracts.
3. Preview the draft. Issue runs local validation; invalid invoices remain drafts without a number or journal. Issued originals are immutable through the API.
4. Customers can download the XRechnung and print its visual representation, and start payment when Mollie test configuration is present.
5. Verified paid notifications create the receivable settlement and pending contributor share once. Admins may approve the share; no money is transferred by that approval.

Set `INVOICE_VALIDATOR_URL=http://127.0.0.1:8087/invoice.xml` and run `docker compose up -d --build validator`. The loopback-only container packages KoSIT Validator 1.6.3 and XRechnung configuration 3.0.2 / 2026-08-31. Invoice contents stay local. This verifies technical conformance, not the truth of tax details or all legal obligations.

Mollie sandbox needs a `test_` API key in `.env`, plus an externally reachable `PUBLIC_API_URL` for webhook delivery; localhost alone cannot receive Mollie webhooks. Never enable the test transport outside the integration test command.

Official validator setup: https://github.com/itplr-kosit/validator-configuration-xrechnung/blob/master/docs/usage.md

## Frontend standard

The active UI now lives in `../frontend/` and follows `fonitas_superadmin_dashboard`. Run `npm ci` there once, then `npm run dev` from the repository root. The legacy screens are preserved under root `src/` and run separately with `npm run dev:legacy`. See `../AGENTS.md` for mandatory frontend conventions.
