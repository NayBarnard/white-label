# WEALTH OS Route Map

## Public website

- `/`, `/about`, `/contact`, `/portfolios`, `/insights`, `/insights/[slug]`, `/insights/library`
- `/resources`, `/planning`, `/onboarding`, `/product`, `/licensing`, `/welcome`
- `/privacy`, `/terms`, `/renewal/[token]`, `/unsubscribe`, `/offline`, `/site/[slug]`

## Client portal

- `/portal` - client/local portal entry
- `/portal/dashboard` - client sign-in/dashboard route
- `/api/portal/adviser`
- `/api/portal/notifications`
- `/api/portal/reviews`
- `/client` - legacy/browser-local client demonstration

## Adviser portal

- `/advisor/login`
- `/advisor`
- `/advisor/clients`
- `/advisor/clients/[clientId]`
- `/advisor/clients/[clientId]/pack`
- `/advisor/search`
- `/advisor/platforms`
- `/api/advisor/clients`
- `/api/advisor/clients/[clientId]`
- `/api/advisor/clients/[clientId]/reviews`
- `/api/advisor/clients/[clientId]/pack`
- `/api/advisor/clients/[clientId]/renewal-packs/*`
- `/api/advisor/platforms`
- `/api/advisor/search`

## Administration

- `/admin/login`
- `/admin`
- `/admin/people`
- `/admin/platforms`
- `/admin/setup`
- `/admin/manager-updates`
- `/api/admin/*` - people, clients, portfolios, documents, compliance, onboarding, audit, MFA, support, platforms, setup, and system status

## Studio

- `/studio`
- `/api/studio/*`

## Authentication and public APIs

- `/auth/callback`
- `/api/auth/staff-signin`
- `/api/enquiry`
- `/api/subscribe`
- `/api/unsubscribe`
- `/api/chat`
- `/api/documents/[slug]`
- `/api/insights/*`
- `/api/fund-comparison`
- `/api/fund-metrics`
- `/api/tax-allowance`
- `/api/wealth-os/*`

## Routing state

- `src/proxy.ts` changes route availability based on public/staff mode and standalone credentials.
- Standalone local mode explicitly enables selected browser-local route demos.
- Hosted staff mode is expected to separate the public site from staff routes; public/staff route disposition is not itself a substitute for page/API authorization.

