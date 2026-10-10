create table if not exists public.wearable_links (
  asciende_user_id uuid primary key references public.profiles(id) on delete cascade,
  ow_user_id uuid not null unique,
  consent_at timestamptz,
  consent_version text,
  created_at timestamptz not null default now()
);

alter table public.wearable_links enable row level security;

create policy "Users read own wearable link"
  on public.wearable_links for select to authenticated
  using (asciende_user_id = auth.uid());

create policy "Admins manage wearable links"
  on public.wearable_links for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant select on public.wearable_links to authenticated;
grant insert, update, delete on public.wearable_links to authenticated;
