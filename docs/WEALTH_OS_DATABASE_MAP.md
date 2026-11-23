# WEALTH OS Database Map

## Migration foundation

The repository has 30 ordered SQL migrations, plus legacy `schema.sql` and `client-portal.sql`.
The primary migration set starts with `202611150001_base_schema.sql` and ends with
`202611220006_universal_search.sql`.

## Existing table groups

### Fund and public content

`funds`, `fund_metrics`, `fund_share_classes`, `platforms`, `platform_availability`,
`platform_availability_history`, `enquiries`, `newsletter_subscribers`, `insights`,
`site_pages`, `manager_updates`, `site_documents`, `site_studio_versions`.

### Client and adviser records

`client_portfolios`, `client_allocations`, `client_transactions`,
`client_support_messages`, `client_documents`, `client_portal_requests`,
`client_goals`, `client_crm_notes`, `client_crm_tasks`,
`adviser_client_relationships`, `adviser_reviews`,
`onboarding_checklists`, `onboarding_document_access`,
`portal_notifications`.

### Staff and compliance

`staff_profiles`, `support_threads`, `support_thread_messages`, `canned_replies`,
`personal_detail_verifications`, `staff_announcements`,
`staff_announcement_recipients`, `compliance_register_entries`,
`compliance_register_history`, `compliance_monthly_signoffs`,
`admin_audit_log`, `admin_audit_logs`, `api_rate_limits`.

### WEALTH OS tenant and intelligence

`wealth_os_tenants`, `wealth_os_projects`, `wealth_os_scenarios`,
`wealth_os_requests`, `wealth_os_tasks`, `wealth_os_notes`,
`renewal_packs`, `renewal_pack_items`, `renewal_pack_audit`,
`tax_allowance_rules`, `client_contribution_logs`,
`wealth_financial_twins`, `wealth_consequence_nodes`,
`wealth_consequence_edges`, `wealth_consequence_analyses`,
`wealth_decisions`, `wealth_decision_events`, `wealth_parallel_plans`,
`wealth_risk_analyses`, `wealth_opportunities`, `wealth_relationship_nodes`,
`wealth_relationship_edges`, `wealth_knowledge_records`,
`wealth_crisis_scenarios`, `wealth_innovation_evaluations`,
`wealth_os_tenant_readiness`, `universal_search_records`.

## Tenant relationship status

- A partial tenant model exists in `wealth_os_tenants` and many recent tables using `tenant_id`.
- `wealth_os_tenants` uses text IDs with constrained slug-like format.
- Several legacy client tables are keyed by Auth user ID rather than explicit tenant ID; isolation depends on claim and ownership policies.
- The migration set does not yet define a complete firm/membership/role model for every portal record.
- The universal search migration includes tenant scoping and adviser relationship checks.

## Tenant foundation migration

`202611230001_tenant_foundation.sql` adds tenant status, primary domain, logo/favicon, colour, typography,
contact, website, login, email, document and platform settings to `wealth_os_tenants`.
It adds `wealth_os_domains` and `wealth_os_tenant_memberships` for domain verification and active user
roles. RLS policies isolate tenant reads/updates and expose platform operator and firm administrator
capabilities only to active memberships.

## RLS status

- RLS is enabled across many tenant and intelligence tables.
- Legacy client tables contain client-owned policies in `supabase/client-portal.sql` and the base migration.
- Staff tables use app metadata role claims or service-role operations in some areas.
- RLS verification is partial: `supabase/tests/tenant-isolation.sql` exists and is documented as not equivalent to Auth-issued-session or API-route testing.

