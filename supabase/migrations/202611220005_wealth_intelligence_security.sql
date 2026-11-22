create table if not exists public.wealth_os_tenant_readiness (
  tenant_id text primary key references public.wealth_os_tenants(id) on delete cascade,
  financial_data_enabled boolean not null default false,
  authentication_mfa_verified boolean not null default false,
  tenant_isolation_verified boolean not null default false,
  relationship_authorization_verified boolean not null default false,
  private_storage_verified boolean not null default false,
  audit_controls_verified boolean not null default false,
  backup_restore_verified boolean not null default false,
  incident_retention_verified boolean not null default false,
  data_sources_verified boolean not null default false,
  legal_review_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (
    not financial_data_enabled
    or (
      tenant_id <> 'default'
      and authentication_mfa_verified
      and tenant_isolation_verified
      and relationship_authorization_verified
      and private_storage_verified
      and audit_controls_verified
      and backup_restore_verified
      and incident_retention_verified
      and data_sources_verified
      and legal_review_verified
      and verified_at is not null
      and verified_by is not null
    )
  )
);

alter table public.wealth_os_tenant_readiness enable row level security;
revoke all on public.wealth_os_tenant_readiness from anon, authenticated;
grant all on public.wealth_os_tenant_readiness to service_role;

create or replace function public.wealth_os_tenant_data_enabled(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_tenant_id is not null
    and p_tenant_id <> 'default'
    and p_tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and exists (
      select 1
      from public.wealth_os_tenant_readiness r
      where r.tenant_id = p_tenant_id
        and r.financial_data_enabled
    );
$$;

revoke all on function public.wealth_os_tenant_data_enabled(text) from public, anon;
grant execute on function public.wealth_os_tenant_data_enabled(text) to authenticated;

create index if not exists wealth_financial_twins_tenant_user_created_idx
  on public.wealth_financial_twins (tenant_id, user_id, created_at desc);
create index if not exists wealth_decisions_tenant_user_created_idx
  on public.wealth_decisions (tenant_id, user_id, created_at desc);
create index if not exists wealth_decision_events_tenant_user_created_idx
  on public.wealth_decision_events (tenant_id, user_id, created_at);
create index if not exists wealth_opportunities_tenant_user_created_idx
  on public.wealth_opportunities (tenant_id, user_id, created_at desc);
create index if not exists wealth_crisis_scenarios_tenant_user_created_idx
  on public.wealth_crisis_scenarios (tenant_id, user_id, created_at desc);

drop policy if exists "Clients manage own tenant scenarios" on public.wealth_os_scenarios;
drop policy if exists "Users manage own explicitly assigned tenant scenarios" on public.wealth_os_scenarios;
create policy "Users manage own explicitly assigned tenant scenarios"
  on public.wealth_os_scenarios for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage own tenant twin runs" on public.wealth_financial_twins;
drop policy if exists "Users read own assigned tenant twin runs" on public.wealth_financial_twins;
drop policy if exists "Users create own assigned tenant twin runs" on public.wealth_financial_twins;
create policy "Users read own assigned tenant twin runs"
  on public.wealth_financial_twins for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );
create policy "Users create own assigned tenant twin runs"
  on public.wealth_financial_twins for insert to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );
revoke update, delete on public.wealth_financial_twins from authenticated;
grant select, insert on public.wealth_financial_twins to authenticated;

drop policy if exists "Users manage own tenant consequence nodes" on public.wealth_consequence_nodes;
drop policy if exists "Users manage own explicitly assigned consequence nodes" on public.wealth_consequence_nodes;
create policy "Users manage own explicitly assigned consequence nodes"
  on public.wealth_consequence_nodes for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage own tenant consequence edges" on public.wealth_consequence_edges;
drop policy if exists "Users manage own explicitly assigned consequence edges" on public.wealth_consequence_edges;
create policy "Users manage own explicitly assigned consequence edges"
  on public.wealth_consequence_edges for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
    and exists (
      select 1 from public.wealth_consequence_nodes n
      where n.id = source_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_consequence_edges.tenant_id
    )
    and exists (
      select 1 from public.wealth_consequence_nodes n
      where n.id = target_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_consequence_edges.tenant_id
    )
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
    and exists (
      select 1 from public.wealth_consequence_nodes n
      where n.id = source_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_consequence_edges.tenant_id
    )
    and exists (
      select 1 from public.wealth_consequence_nodes n
      where n.id = target_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_consequence_edges.tenant_id
    )
  );

drop policy if exists "Users manage own tenant consequence analyses" on public.wealth_consequence_analyses;
drop policy if exists "Users read own assigned consequence analyses" on public.wealth_consequence_analyses;
drop policy if exists "Users create own assigned consequence analyses" on public.wealth_consequence_analyses;
create policy "Users read own assigned consequence analyses"
  on public.wealth_consequence_analyses for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );
create policy "Users create own assigned consequence analyses"
  on public.wealth_consequence_analyses for insert to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );
revoke update, delete on public.wealth_consequence_analyses from authenticated;
grant select, insert on public.wealth_consequence_analyses to authenticated;

drop policy if exists "Users manage own tenant decisions" on public.wealth_decisions;
drop policy if exists "Users read own assigned tenant decisions" on public.wealth_decisions;
drop policy if exists "Users create own assigned tenant decisions" on public.wealth_decisions;
create policy "Users read own assigned tenant decisions"
  on public.wealth_decisions for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );
create policy "Users create own assigned tenant decisions"
  on public.wealth_decisions for insert to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
    and status = 'open'
  );
revoke update, delete on public.wealth_decisions from authenticated;
grant select, insert on public.wealth_decisions to authenticated;

drop policy if exists "Users append own tenant decision events" on public.wealth_decision_events;
drop policy if exists "Users read own tenant decision events" on public.wealth_decision_events;
drop policy if exists "Users read own assigned tenant decision events" on public.wealth_decision_events;
drop policy if exists "Users append own assigned tenant decision events" on public.wealth_decision_events;
create policy "Users read own assigned tenant decision events"
  on public.wealth_decision_events for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );
create policy "Users append own assigned tenant decision events"
  on public.wealth_decision_events for insert to authenticated
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
    and event_type in ('context', 'alternative', 'assumption', 'comparison')
    and exists (
      select 1
      from public.wealth_decisions d
      where d.id = wealth_decision_events.decision_id
        and d.user_id = auth.uid()
        and d.tenant_id = wealth_decision_events.tenant_id
    )
  );
revoke update, delete on public.wealth_decision_events from authenticated;
grant select, insert on public.wealth_decision_events to authenticated;

drop policy if exists "Users manage own tenant parallel plans" on public.wealth_parallel_plans;
drop policy if exists "Users manage own explicitly assigned parallel plans" on public.wealth_parallel_plans;
create policy "Users manage own explicitly assigned parallel plans"
  on public.wealth_parallel_plans for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage own tenant risk analyses" on public.wealth_risk_analyses;
drop policy if exists "Users manage own explicitly assigned risk analyses" on public.wealth_risk_analyses;
create policy "Users manage own explicitly assigned risk analyses"
  on public.wealth_risk_analyses for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage tenant opportunities" on public.wealth_opportunities;
drop policy if exists "Users manage own explicitly assigned tenant opportunities" on public.wealth_opportunities;
create policy "Users manage own explicitly assigned tenant opportunities"
  on public.wealth_opportunities for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage own tenant crisis scenarios" on public.wealth_crisis_scenarios;
drop policy if exists "Users manage own explicitly assigned crisis scenarios" on public.wealth_crisis_scenarios;
create policy "Users manage own explicitly assigned crisis scenarios"
  on public.wealth_crisis_scenarios for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage own tenant innovation evaluations" on public.wealth_innovation_evaluations;
drop policy if exists "Users manage own explicitly assigned innovation evaluations" on public.wealth_innovation_evaluations;
create policy "Users manage own explicitly assigned innovation evaluations"
  on public.wealth_innovation_evaluations for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage own tenant relationship nodes" on public.wealth_relationship_nodes;
drop policy if exists "Users manage tenant relationship nodes" on public.wealth_relationship_nodes;
drop policy if exists "Users manage own explicitly assigned relationship nodes" on public.wealth_relationship_nodes;
create policy "Users manage own explicitly assigned relationship nodes"
  on public.wealth_relationship_nodes for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  )
  with check (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

drop policy if exists "Users manage tenant relationship edges" on public.wealth_relationship_edges;
drop policy if exists "Users manage own explicitly assigned relationship edges" on public.wealth_relationship_edges;
create policy "Users manage own explicitly assigned relationship edges"
  on public.wealth_relationship_edges for all to authenticated
  using (
    tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
    and exists (
      select 1 from public.wealth_relationship_nodes n
      where n.id = source_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_relationship_edges.tenant_id
    )
    and exists (
      select 1 from public.wealth_relationship_nodes n
      where n.id = target_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_relationship_edges.tenant_id
    )
  )
  with check (
    tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
    and exists (
      select 1 from public.wealth_relationship_nodes n
      where n.id = source_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_relationship_edges.tenant_id
    )
    and exists (
      select 1 from public.wealth_relationship_nodes n
      where n.id = target_node_id
        and n.user_id = auth.uid()
        and n.tenant_id = wealth_relationship_edges.tenant_id
    )
  );

drop policy if exists "Users read approved tenant knowledge" on public.wealth_knowledge_records;
drop policy if exists "Users read approved explicitly assigned tenant knowledge" on public.wealth_knowledge_records;
create policy "Users read approved explicitly assigned tenant knowledge"
  on public.wealth_knowledge_records for select to authenticated
  using (
    approved
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    and tenant_id <> 'default'
  );

create or replace function public.reject_wealth_decision_history_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Wealth decision history is append-only.';
end;
$$;

drop trigger if exists wealth_decisions_append_only on public.wealth_decisions;
create trigger wealth_decisions_append_only
  before update or delete on public.wealth_decisions
  for each row execute function public.reject_wealth_decision_history_mutation();

drop trigger if exists wealth_decision_events_append_only on public.wealth_decision_events;
create trigger wealth_decision_events_append_only
  before update or delete on public.wealth_decision_events
  for each row execute function public.reject_wealth_decision_history_mutation();

create or replace function public.record_wealth_decision(
  p_title text,
  p_event_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_tenant_id text := auth.jwt() -> 'app_metadata' ->> 'tenant_id';
  v_decision public.wealth_decisions;
  v_event public.wealth_decision_events;
begin
  if auth.uid() is null or v_tenant_id is null or v_tenant_id = 'default' then
    raise exception 'An authenticated user with an assigned tenant is required.';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 or length(p_title) > 160 then
    raise exception 'A valid decision title is required.';
  end if;
  if p_event_type is null
     or p_event_type not in ('context', 'alternative', 'assumption', 'comparison')
     or coalesce(jsonb_typeof(p_payload), '') <> 'object' then
    raise exception 'A supported decision context event is required.';
  end if;

  insert into public.wealth_decisions (tenant_id, user_id, title, status)
  values (v_tenant_id, auth.uid(), btrim(p_title), 'open')
  returning * into v_decision;

  insert into public.wealth_decision_events (
    tenant_id, decision_id, user_id, event_type, payload
  )
  values (
    v_tenant_id, v_decision.id, auth.uid(), p_event_type, p_payload
  )
  returning * into v_event;

  return jsonb_build_object(
    'decision', to_jsonb(v_decision),
    'event', to_jsonb(v_event)
  );
end;
$$;

revoke all on function public.record_wealth_decision(text, text, jsonb) from public, anon;
grant execute on function public.record_wealth_decision(text, text, jsonb) to authenticated;

drop policy if exists "Tenant readiness gates WEALTH OS scenarios" on public.wealth_os_scenarios;
create policy "Tenant readiness gates WEALTH OS scenarios"
  on public.wealth_os_scenarios as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates financial twins" on public.wealth_financial_twins;
create policy "Tenant readiness gates financial twins"
  on public.wealth_financial_twins as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates consequence nodes" on public.wealth_consequence_nodes;
create policy "Tenant readiness gates consequence nodes"
  on public.wealth_consequence_nodes as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates consequence edges" on public.wealth_consequence_edges;
create policy "Tenant readiness gates consequence edges"
  on public.wealth_consequence_edges as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates consequence analyses" on public.wealth_consequence_analyses;
create policy "Tenant readiness gates consequence analyses"
  on public.wealth_consequence_analyses as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates decisions" on public.wealth_decisions;
create policy "Tenant readiness gates decisions"
  on public.wealth_decisions as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates decision events" on public.wealth_decision_events;
create policy "Tenant readiness gates decision events"
  on public.wealth_decision_events as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates parallel plans" on public.wealth_parallel_plans;
create policy "Tenant readiness gates parallel plans"
  on public.wealth_parallel_plans as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates risk analyses" on public.wealth_risk_analyses;
create policy "Tenant readiness gates risk analyses"
  on public.wealth_risk_analyses as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates opportunities" on public.wealth_opportunities;
create policy "Tenant readiness gates opportunities"
  on public.wealth_opportunities as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates crisis scenarios" on public.wealth_crisis_scenarios;
create policy "Tenant readiness gates crisis scenarios"
  on public.wealth_crisis_scenarios as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates innovation evaluations" on public.wealth_innovation_evaluations;
create policy "Tenant readiness gates innovation evaluations"
  on public.wealth_innovation_evaluations as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates relationship nodes" on public.wealth_relationship_nodes;
create policy "Tenant readiness gates relationship nodes"
  on public.wealth_relationship_nodes as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates relationship edges" on public.wealth_relationship_edges;
create policy "Tenant readiness gates relationship edges"
  on public.wealth_relationship_edges as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
drop policy if exists "Tenant readiness gates knowledge records" on public.wealth_knowledge_records;
create policy "Tenant readiness gates knowledge records"
  on public.wealth_knowledge_records as restrictive for all to authenticated
  using (public.wealth_os_tenant_data_enabled(tenant_id))
  with check (public.wealth_os_tenant_data_enabled(tenant_id));
