# WEALTH OS Testing

## Local checks

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:supabase:rls
npm run build
npm run test:e2e
```

## Unit and component tests

Vitest covers route guards, role permissions, tenant context, calculations, Supabase environment handling and React portal components.

## Database RLS tests

The SQL suite creates synthetic tenants and users, switches JWT claims, and verifies:

- Tenant rows cannot cross between firms.
- Core portfolios and transactions cannot cross between clients/tenants.
- Adviser relationship and universal-search data is permission-aware.
- Financial readiness and append-only data controls remain enforced.

Run against the local stack:

```bash
npx supabase db reset
npm run test:supabase:rls
```

## End-to-end tests

Playwright validates public/staff deployment routing, responsive layouts, portal navigation, themes, PWA behavior, public research and standalone client/adviser/admin workflows.

## Release evidence

Production sign-off requires hosted Supabase Auth sessions, MFA and storage tests, live synthetic workflow tests, Vercel deployment verification and external domain/DNS verification.
