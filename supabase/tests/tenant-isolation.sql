do $test$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_tenant_a text := 'test-a-' || v_suffix;
  v_tenant_b text := 'test-b-' || v_suffix;
  v_tenant_unready text := 'test-unready-' || v_suffix;
  v_adviser_a uuid := gen_random_uuid();
  v_admin_a uuid := gen_random_uuid();
  v_adviser_b uuid := gen_random_uuid();
  v_admin_b uuid := gen_random_uuid();
  v_unready_user uuid := gen_random_uuid();
  v_node_a uuid := gen_random_uuid();
  v_node_b uuid := gen_random_uuid();
  v_edge_a uuid := gen_random_uuid();
  v_edge_b uuid := gen_random_uuid();
  v_decision jsonb;
  v_decision_id uuid;
  v_count integer;
  v_tenants text[];
  v_projects text[];
  v_visible_user_ids uuid[];
  v_verified_at timestamptz := now();
begin
  begin
    if not has_table_privilege('authenticated', 'public.wealth_financial_twins', 'INSERT')
      or not has_table_privilege('authenticated', 'public.wealth_relationship_edges', 'INSERT')
      or not has_table_privilege('authenticated', 'public.wealth_decision_events', 'INSERT')
      or not has_table_privilege('service_role', 'public.wealth_decisions', 'UPDATE')
      or not has_table_privilege('service_role', 'public.wealth_decision_events', 'DELETE')
      or has_table_privilege('authenticated', 'public.wealth_decisions', 'UPDATE')
      or has_table_privilege('authenticated', 'public.wealth_decision_events', 'DELETE')
    then
      raise exception 'Unexpected table grants prevent meaningful RLS and append-only assertions';
    end if;

    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    values
      (v_adviser_a, 'authenticated', 'authenticated',
       v_suffix || '-adviser-a@example.test', '', now(),
       jsonb_build_object('tenant_id', v_tenant_a, 'role', 'adviser'), '{}', now(), now()),
      (v_admin_a, 'authenticated', 'authenticated',
       v_suffix || '-admin-a@example.test', '', now(),
       jsonb_build_object('tenant_id', v_tenant_a, 'role', 'admin'), '{}', now(), now()),
      (v_adviser_b, 'authenticated', 'authenticated',
       v_suffix || '-adviser-b@example.test', '', now(),
       jsonb_build_object('tenant_id', v_tenant_b, 'role', 'adviser'), '{}', now(), now()),
      (v_admin_b, 'authenticated', 'authenticated',
       v_suffix || '-admin-b@example.test', '', now(),
       jsonb_build_object('tenant_id', v_tenant_b, 'role', 'admin'), '{}', now(), now()),
      (v_unready_user, 'authenticated', 'authenticated',
       v_suffix || '-unready@example.test', '', now(),
       jsonb_build_object('tenant_id', v_tenant_unready, 'role', 'adviser'), '{}', now(), now());

    insert into public.wealth_os_tenants (id, name, trading_name, configuration)
    values
      (v_tenant_a, v_tenant_a, v_tenant_a, '{}'),
      (v_tenant_b, v_tenant_b, v_tenant_b, '{}'),
      (v_tenant_unready, v_tenant_unready, v_tenant_unready, '{}');

    insert into public.wealth_os_tenant_readiness (
      tenant_id, financial_data_enabled, authentication_mfa_verified,
      tenant_isolation_verified, relationship_authorization_verified,
      private_storage_verified, audit_controls_verified, backup_restore_verified,
      incident_retention_verified, data_sources_verified, legal_review_verified,
      verified_at, verified_by
    )
    values
      (v_tenant_a, true, true, true, true, true, true, true, true, true, true, v_verified_at, v_admin_a),
      (v_tenant_b, true, true, true, true, true, true, true, true, true, true, v_verified_at, v_admin_a);

    insert into public.wealth_os_projects (id, tenant_id, status, configuration)
    values
      (v_tenant_a || '-project', v_tenant_a, 'published', '{}'),
      (v_tenant_b || '-project', v_tenant_b, 'published', '{}');

    insert into public.wealth_financial_twins (
      tenant_id, user_id, name, calculation_version, seed,
      assumptions, observed_data, result, methodology
    )
    values
      (v_tenant_a, v_adviser_a, 'Tenant A test twin', 'local-rls-test', 1, '{}', '{}', '{}', '{}'),
      (v_tenant_b, v_adviser_b, 'Tenant B test twin', 'local-rls-test', 1, '{}', '{}', '{}', '{}');

    insert into public.wealth_relationship_nodes (
      id, tenant_id, user_id, entity_type, label, metadata
    )
    values
      (v_node_a, v_tenant_a, v_adviser_a, 'person', 'Tenant A test node', '{}'),
      (v_node_b, v_tenant_b, v_adviser_b, 'person', 'Tenant B test node', '{}');

    insert into public.wealth_relationship_edges (
      id, tenant_id, source_node_id, target_node_id, relationship, evidence
    )
    values
      (v_edge_a, v_tenant_a, v_node_a, v_node_a, 'test', '[]'),
      (v_edge_b, v_tenant_b, v_node_b, v_node_b, 'test', '[]');

    insert into public.wealth_knowledge_records (
      tenant_id, user_id, record_type, title, summary, source_reference, approved
    )
    values
      (v_tenant_a, v_adviser_a, 'process', 'Tenant A approved', 'Test record', 'local-test', true),
      (v_tenant_a, v_adviser_a, 'process', 'Tenant A pending', 'Test record', 'local-test', false),
      (v_tenant_b, v_adviser_b, 'process', 'Tenant B approved', 'Test record', 'local-test', true);

    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', v_adviser_a::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_adviser_a,
        'role', 'authenticated',
        'aud', 'authenticated',
        'app_metadata', jsonb_build_object('tenant_id', v_tenant_a, 'role', 'adviser')
      )::text,
      true
    );

    select array_agg(id order by id) into v_tenants
    from public.wealth_os_tenants;
    if v_tenants is distinct from array[v_tenant_a] then
      raise exception 'Tenant A user observed tenant rows: %', v_tenants;
    end if;

    select array_agg(user_id order by user_id) into v_visible_user_ids
    from public.wealth_financial_twins;
    if v_visible_user_ids is distinct from array[v_adviser_a] then
      raise exception 'Tenant A expected owner %, observed %, auth.uid % and tenant %',
        array[v_adviser_a], v_visible_user_ids, auth.uid(), auth.jwt() -> 'app_metadata' ->> 'tenant_id';
    end if;

    select array_agg(tenant_id order by tenant_id) into v_projects
    from public.wealth_os_projects;
    if v_projects is not null then
      raise exception 'Adviser role unexpectedly read tenant projects: %', v_projects;
    end if;

    select count(*) into v_count from public.wealth_relationship_edges;
    if v_count <> 1 then
      raise exception 'Tenant A adviser observed % relationship edges, expected 1', v_count;
    end if;

    select count(*) into v_count
    from public.wealth_knowledge_records
    where approved;
    if v_count <> 1 then
      raise exception 'Tenant A adviser observed % approved knowledge records, expected 1', v_count;
    end if;

    if not public.wealth_os_tenant_data_enabled(v_tenant_a) then
      raise exception 'Ready tenant A was not enabled';
    end if;

    begin
      insert into public.wealth_financial_twins (
        tenant_id, user_id, name, calculation_version, seed,
        assumptions, observed_data, result, methodology
      )
      values (v_tenant_b, v_adviser_a, 'Cross-tenant attempt', 'local-rls-test', 3, '{}', '{}', '{}', '{}');
      raise exception using errcode = 'ZX001', message = 'Cross-tenant twin insert unexpectedly succeeded';
    exception
      when insufficient_privilege then null;
    end;

    begin
      insert into public.wealth_relationship_edges (
        tenant_id, source_node_id, target_node_id, relationship
      )
      values (v_tenant_a, v_node_a, v_node_b, 'cross-user test');
      raise exception using errcode = 'ZX002', message = 'Cross-tenant relationship edge unexpectedly succeeded';
    exception
      when insufficient_privilege then null;
    end;

    perform set_config('request.jwt.claim.sub', v_admin_a::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_admin_a,
        'role', 'authenticated',
        'aud', 'authenticated',
        'app_metadata', jsonb_build_object('tenant_id', v_tenant_a, 'role', 'admin')
      )::text,
      true
    );

    select array_agg(tenant_id order by tenant_id) into v_projects
    from public.wealth_os_projects;
    if v_projects is distinct from array[v_tenant_a] then
      raise exception 'Tenant A admin observed unexpected projects: %', v_projects;
    end if;

    select count(*) into v_count from public.wealth_financial_twins;
    if v_count <> 0 then
      raise exception 'Tenant A admin bypassed financial twin ownership';
    end if;

    perform set_config('request.jwt.claim.sub', v_admin_b::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_admin_b,
        'role', 'authenticated',
        'aud', 'authenticated',
        'app_metadata', jsonb_build_object('tenant_id', v_tenant_b, 'role', 'admin')
      )::text,
      true
    );

    select array_agg(tenant_id order by tenant_id) into v_projects
    from public.wealth_os_projects;
    if v_projects is distinct from array[v_tenant_b] then
      raise exception 'Tenant B admin observed unexpected projects: %', v_projects;
    end if;

    perform set_config('request.jwt.claim.sub', v_adviser_b::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_adviser_b,
        'role', 'authenticated',
        'aud', 'authenticated',
        'app_metadata', jsonb_build_object('tenant_id', v_tenant_b, 'role', 'adviser')
      )::text,
      true
    );

    select array_agg(user_id order by user_id) into v_visible_user_ids
    from public.wealth_financial_twins;
    if v_visible_user_ids is distinct from array[v_adviser_b] then
      raise exception 'Tenant B adviser observed unexpected twin owners: %', v_visible_user_ids;
    end if;

    perform set_config('request.jwt.claim.sub', v_unready_user::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_unready_user,
        'role', 'authenticated',
        'aud', 'authenticated',
        'app_metadata', jsonb_build_object('tenant_id', v_tenant_unready, 'role', 'adviser')
      )::text,
      true
    );

    if public.wealth_os_tenant_data_enabled(v_tenant_unready) then
      raise exception 'Unready tenant was enabled';
    end if;

    select count(*) into v_count from public.wealth_financial_twins;
    if v_count <> 0 then
      raise exception 'Unready tenant read financial twin records';
    end if;

    perform set_config('request.jwt.claim.sub', v_adviser_a::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object(
        'sub', v_adviser_a,
        'role', 'authenticated',
        'aud', 'authenticated',
        'app_metadata', jsonb_build_object('tenant_id', v_tenant_a, 'role', 'adviser')
      )::text,
      true
    );

    v_decision := public.record_wealth_decision(
      'Local append-only test',
      'context',
      '{"source":"local RLS integration test"}'::jsonb
    );
    v_decision_id := (v_decision -> 'decision' ->> 'id')::uuid;

    select count(*) into v_count
    from public.wealth_decision_events
    where decision_id = v_decision_id;
    if v_count <> 1 then
      raise exception 'Decision RPC did not atomically create its context event';
    end if;

    begin
      insert into public.wealth_decision_events (
        tenant_id, decision_id, user_id, event_type, payload
      )
      values (v_tenant_a, v_decision_id, v_adviser_a, 'approval', '{}');
      raise exception using errcode = 'ZX003', message = 'Direct approval event insert unexpectedly succeeded';
    exception
      when insufficient_privilege then null;
    end;

    perform set_config('role', 'service_role', true);

    begin
      update public.wealth_decisions
      set title = 'Mutated decision'
      where id = v_decision_id;
      if not found then
        raise exception using errcode = 'P0002', message = 'Decision fixture was not found';
      end if;
      raise exception using errcode = 'ZX004', message = 'Decision update unexpectedly succeeded';
    exception
      when sqlstate 'P0001' then null;
    end;

    begin
      delete from public.wealth_decision_events
      where decision_id = v_decision_id;
      if not found then
        raise exception using errcode = 'P0002', message = 'Decision event fixture was not found';
      end if;
      raise exception using errcode = 'ZX005', message = 'Decision event deletion unexpectedly succeeded';
    exception
      when sqlstate 'P0001' then null;
    end;

    perform set_config('role', 'postgres', true);
    raise exception using errcode = 'ZX006', message = 'Rollback local isolation fixtures';
  exception
    when sqlstate 'ZX006' then
      raise notice 'Tenant, role, readiness, and append-only checks passed; temporary fixtures rolled back.';
  end;
end;
$test$;
