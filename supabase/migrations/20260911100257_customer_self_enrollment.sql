-- Customer self-enrollment (DESIGN.md section D note on organization_members
-- and the Phase 6 roadmap item). A newly signed-up user has no
-- organization_members row yet, and the organizations table's own RLS
-- ("members read") means they can't even look up an org by slug via a plain
-- client SELECT before they're a member - so both the lookup and the insert
-- happen inside this SECURITY DEFINER function, which bypasses RLS as its
-- owner. Role is hardcoded to 'customer' and is not a caller-supplied
-- parameter, so this can never be used to self-grant a higher role.
create or replace function public.join_organization_as_customer(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select id into v_org_id from public.organizations where slug = p_slug;

  if v_org_id is null then
    raise exception 'Organization not found: %', p_slug;
  end if;

  insert into public.organization_members (organization_id, profile_id, role)
  values (v_org_id, auth.uid(), 'customer')
  on conflict (organization_id, profile_id, role) do nothing;

  return v_org_id;
end;
$$;

grant execute on function public.join_organization_as_customer(text) to authenticated;
