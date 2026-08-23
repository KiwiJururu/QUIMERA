create extension if not exists pgcrypto;

create type public.campaign_role as enum ('master','player');
create type public.character_kind as enum ('player','npc','monster');
create type public.folder_kind as enum ('npc','monster','mixed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.campaign_role not null default 'player',
  joined_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  kind public.folder_kind not null default 'mixed',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  kind public.character_kind not null default 'player',
  name text not null check (char_length(trim(name)) between 1 and 160),
  player_name text,
  level integer not null default 1 check (level between 1 and 20),
  sheet jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  is_in_scene boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index characters_campaign_idx on public.characters(campaign_id);
create index characters_owner_idx on public.characters(owner_user_id);
create index characters_folder_idx on public.characters(folder_id);
create index folders_campaign_idx on public.folders(campaign_id);
create index folders_parent_idx on public.folders(parent_id);
create index campaign_members_user_idx on public.campaign_members(user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger folders_set_updated_at before update on public.folders for each row execute function public.set_updated_at();
create trigger characters_set_updated_at before update on public.characters for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_new_campaign()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.campaign_members (campaign_id,user_id,role)
  values (new.id,new.owner_id,'master') on conflict do nothing;
  return new;
end;
$$;
create trigger on_campaign_created after insert on public.campaigns for each row execute function public.handle_new_campaign();

create or replace function public.is_campaign_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.campaign_members cm where cm.campaign_id=cid and cm.user_id=auth.uid());
$$;

create or replace function public.is_campaign_master(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.campaign_members cm where cm.campaign_id=cid and cm.user_id=auth.uid() and cm.role='master');
$$;

create or replace function public.join_campaign_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.campaigns where upper(invite_code)=upper(trim(code));
  if cid is null then raise exception 'Código de campanha inválido'; end if;
  insert into public.campaign_members(campaign_id,user_id,role) values(cid,auth.uid(),'player') on conflict do nothing;
  return cid;
end;
$$;
grant execute on function public.join_campaign_by_code(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.folders enable row level security;
alter table public.characters enable row level security;

create policy profiles_read_own on public.profiles for select to authenticated using (id=auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy campaigns_select_member on public.campaigns for select to authenticated using (public.is_campaign_member(id));
create policy campaigns_insert_owner on public.campaigns for insert to authenticated with check (owner_id=auth.uid());
create policy campaigns_update_master on public.campaigns for update to authenticated using (public.is_campaign_master(id)) with check (public.is_campaign_master(id));
create policy campaigns_delete_master on public.campaigns for delete to authenticated using (public.is_campaign_master(id));
create policy members_select_self_or_master on public.campaign_members for select to authenticated using (user_id=auth.uid() or public.is_campaign_master(campaign_id));
create policy members_insert_master on public.campaign_members for insert to authenticated with check (public.is_campaign_master(campaign_id));
create policy members_update_master on public.campaign_members for update to authenticated using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
create policy members_delete_self_or_master on public.campaign_members for delete to authenticated using (user_id=auth.uid() or public.is_campaign_master(campaign_id));
create policy folders_master_all_select on public.folders for select to authenticated using (public.is_campaign_master(campaign_id));
create policy folders_master_insert on public.folders for insert to authenticated with check (public.is_campaign_master(campaign_id));
create policy folders_master_update on public.folders for update to authenticated using (public.is_campaign_master(campaign_id)) with check (public.is_campaign_master(campaign_id));
create policy folders_master_delete on public.folders for delete to authenticated using (public.is_campaign_master(campaign_id));
create policy characters_select_allowed on public.characters for select to authenticated using (public.is_campaign_master(campaign_id) or (kind='player' and owner_user_id=auth.uid() and public.is_campaign_member(campaign_id)));
create policy characters_insert_allowed on public.characters for insert to authenticated with check (public.is_campaign_master(campaign_id) or (kind='player' and owner_user_id=auth.uid() and created_by=auth.uid() and public.is_campaign_member(campaign_id)));
create policy characters_update_allowed on public.characters for update to authenticated using (public.is_campaign_master(campaign_id) or (kind='player' and owner_user_id=auth.uid() and public.is_campaign_member(campaign_id))) with check (public.is_campaign_master(campaign_id) or (kind='player' and owner_user_id=auth.uid() and public.is_campaign_member(campaign_id)));
create policy characters_delete_allowed on public.characters for delete to authenticated using (public.is_campaign_master(campaign_id) or (kind='player' and owner_user_id=auth.uid() and public.is_campaign_member(campaign_id)));

alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.campaign_members;
alter publication supabase_realtime add table public.folders;
alter publication supabase_realtime add table public.characters;
