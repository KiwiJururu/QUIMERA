alter function public.set_updated_at() set search_path = public;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_new_campaign() from anon, authenticated;
revoke execute on function public.is_campaign_member(uuid) from anon;
revoke execute on function public.is_campaign_master(uuid) from anon;
revoke execute on function public.join_campaign_by_code(text) from anon;
grant execute on function public.join_campaign_by_code(text) to authenticated;
