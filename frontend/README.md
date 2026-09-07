# Fonitas standard accounting frontend

This is the active frontend, refactored against `/Users/ali/projects/fonitas_superadmin_dashboard`.

Run `npm ci` and `npm run dev` here, or `npm run dev` in the parent directory. The preview uses port 5174; backend remains on port 3100. Copy the parent `.env.example` into a local environment file and configure the same Fonitas Auth/project settings. No credentials belong in source control.

Reference components copied directly: theme tokens and fonts, UI primitives, sidebar primitives, layout/header, theme and language controls, DynamicNav, LocaleProvider, TableWrapper and TableView. Accounting-specific adaptations: role-filtered navigation, ordinary Auth session lane, five-language finance catalogs, translated empty state, customer invoice actions and finance forms.

Feature code follows `app/finance/{api,hooks,model,pages,ui}`. Auth/session logic lives in `context` and `services`; navigation is routed, not component-local tab state. Server state uses React Query; record forms use React Hook Form + Zod. Backend endpoints and access controls are unchanged.

The old accounting screens are preserved in the parent `src/` and run through `npm run dev:legacy`; they are not loaded by this frontend. The superseded finance prototype has been removed. Future migrations must use this implementation and the canonical reference, as specified in the parent AGENTS.md.

The sidebar/customer screens only expose records allowed by the backend. The initial list endpoint limit is still 100; filtering and pagination operate on those returned records. Backend pagination is a separate outstanding capability.

Verification: production build passed; browser checks passed for deployed Fonitas administrator login, the existing project list, routed create form, required-field validation, Persian RTL layout and light/dark themes. The reference sidebar uses logical start/end positioning, so its default side is retained in RTL.
