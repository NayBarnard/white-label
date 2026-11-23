# WEALTH OS Testing

## Local checks

```bash
npm install
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
```

For the standalone acceptance run, execute build and E2E with Supabase
environment variables unset. The browser acceptance test also checks that
standalone workflows do not make external requests. See
`WEALTH_OS_MASTER_CHECKLIST.md` for current results and incomplete gates.

## Unit and component tests

Vitest covers route guards, role permissions, tenant context, calculations, Supabase environment handling and React portal components.

## Optional hosted integration checks

The local Supabase/RLS suite is an additional hosted-integration check, not a
requirement for the standalone workflows:

```bash
npx supabase start
npx supabase db reset
npm run test:supabase:rls
```

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

Standalone acceptance requires the local install, lint, TypeScript, unit,
production build, and E2E checks to pass without Supabase credentials. Hosted
release readiness is a separate optional gate requiring Supabase Auth sessions,
MFA and storage tests, live synthetic workflow tests, Vercel deployment
verification, and external domain/DNS verification.
