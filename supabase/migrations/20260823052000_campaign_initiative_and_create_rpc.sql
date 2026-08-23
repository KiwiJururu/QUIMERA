alter table public.campaigns
  add column if not exists initiative jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.campaigns'::regclass
      and conname = 'campaigns_initiative_is_array'
  ) then
    alter table public.campaigns
      add constraint campaigns_initiative_is_array
      check (jsonb_typeof(initiative) = 'array');
  end if;
end
$$;

create or replace function public.create_campaign(
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := trim(coalesce(p_name, ''));
begin
  if v_user is null then
    raise exception 'Você precisa estar autenticado para criar uma campanha.';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'O nome da campanha deve ter entre 1 e 120 caracteres.';
  end if;

  insert into public.campaigns (name, description, owner_id)
  values (v_name, nullif(trim(coalesce(p_description, '')), ''), v_user)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_campaign(text, text) from public;
revoke execute on function public.create_campaign(text, text) from anon;
grant execute on function public.create_campaign(text, text) to authenticated;
