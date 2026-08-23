create index if not exists campaigns_owner_idx on public.campaigns(owner_id);
create index if not exists characters_created_by_idx on public.characters(created_by);

create or replace function public.is_campaign_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.campaign_members cm
    where cm.campaign_id = cid
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_campaign_master(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.campaign_members cm
    where cm.campaign_id = cid
      and cm.user_id = (select auth.uid())
      and cm.role = 'master'
  );
$$;

alter policy profiles_read_own on public.profiles
  using (id = (select auth.uid()));

alter policy profiles_update_own on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy campaigns_insert_owner on public.campaigns
  with check (owner_id = (select auth.uid()));

alter policy campaigns_select_member on public.campaigns
  using ((owner_id = (select auth.uid())) or public.is_campaign_member(id));

alter policy members_select_self_or_master on public.campaign_members
  using ((user_id = (select auth.uid())) or public.is_campaign_master(campaign_id));

alter policy members_delete_self_or_master on public.campaign_members
  using ((user_id = (select auth.uid())) or public.is_campaign_master(campaign_id));

alter policy characters_select_allowed on public.characters
  using (
    public.is_campaign_master(campaign_id)
    or (
      kind = 'player'::public.character_kind
      and owner_user_id = (select auth.uid())
      and public.is_campaign_member(campaign_id)
    )
  );

alter policy characters_insert_allowed on public.characters
  with check (
    public.is_campaign_master(campaign_id)
    or (
      kind = 'player'::public.character_kind
      and owner_user_id = (select auth.uid())
      and created_by = (select auth.uid())
      and public.is_campaign_member(campaign_id)
    )
  );

alter policy characters_update_allowed on public.characters
  using (
    public.is_campaign_master(campaign_id)
    or (
      kind = 'player'::public.character_kind
      and owner_user_id = (select auth.uid())
      and public.is_campaign_member(campaign_id)
    )
  )
  with check (
    public.is_campaign_master(campaign_id)
    or (
      kind = 'player'::public.character_kind
      and owner_user_id = (select auth.uid())
      and public.is_campaign_member(campaign_id)
    )
  );

alter policy characters_delete_allowed on public.characters
  using (
    public.is_campaign_master(campaign_id)
    or (
      kind = 'player'::public.character_kind
      and owner_user_id = (select auth.uid())
      and public.is_campaign_member(campaign_id)
    )
  );
