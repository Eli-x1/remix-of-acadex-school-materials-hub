create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_label text,
  user_id text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Anyone (anon) can register a subscription
create policy "anyone can insert subscriptions"
on public.push_subscriptions
for insert
to anon, authenticated
with check (true);

-- Anyone can delete by endpoint match (so a device can unsubscribe itself)
create policy "anyone can delete subscriptions"
on public.push_subscriptions
for delete
to anon, authenticated
using (true);

-- No public select; edge function uses service role to read
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);