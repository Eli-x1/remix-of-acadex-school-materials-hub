create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count int;
  assigned_role public.app_role;
begin
  select count(*) into user_count from auth.users;
  if user_count <= 1 then
    assigned_role := 'super_admin';
  else
    assigned_role := 'staff';
  end if;

  insert into public.profiles (id, email, name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'username', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    username = coalesce(excluded.username, public.profiles.username);

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
