# Fonitas Accounting standards

The user explicitly requires all frontend work to follow the architecture and UI of `/Users/ali/projects/fonitas_superadmin_dashboard`. This is the canonical frontend reference. Inspect the corresponding reference components before introducing a new pattern.

- The active finance frontend is `frontend/`. Root `src/` is the preserved legacy accounting application, accessible with `npm run dev:legacy`; do not add new product UI there. New functionality and migrations belong in the standard frontend.
- Use React 19, TypeScript, Vite, Tailwind 4 and the reference's shared Radix/shadcn-style components, tokens, fonts and logo. No DaisyUI, alternate component kit, ad-hoc tab dashboard, or hard-coded replacement theme in the active frontend.
- Organize feature code under `src/app/<feature>/{api,hooks,model,pages,ui}`. Keep network transport under `src/services`, sessions under `src/context`, route definitions under `src/routes`, and reusable UI under `src/components`.
- Use React Query hooks for server state and invalidation. Use React Hook Form with Zod schemas and the reference's Field/Input/Select/Button primitives for forms. Use shared TableWrapper/TableView and TanStack Table for record lists.
- Use the reference SidebarProvider/SidebarInset layout, collapsible sidebar, header controls, light/dark/system themes and responsive behavior.
- Use i18next/react-i18next with JSON locale catalogs and LocaleProvider. Preserve English, German, Persian, Arabic and Turkish. Use logical spacing, RTL direction and localized numbers. Do not put translated strings in components or parallel custom dictionaries.
- Match the reference's structure and design while retaining the Accounting API contract. Auth uses ordinary Fonitas Auth login/refresh and finance-scoped Bearer tokens; do not copy the superadmin Slogin authentication lane.
- Preserve backend behavior, customer ownership checks, financial precision, existing records and invoice originals during UI refactors.
- Verify builds and actual browser workflows, including an RTL locale and dark mode, after meaningful frontend changes.
