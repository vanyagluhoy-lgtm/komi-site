create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^\+380[0-9]{9}$'),
  comment text not null check (char_length(comment) between 2 and 1000),
  color text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed'))
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Заявки створює лише сервер із секретним ключем, відвідувачі не мають доступу
revoke all on public.leads from anon;

drop policy if exists "admin reads leads" on public.leads;
create policy "admin reads leads" on public.leads
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com');

drop policy if exists "admin updates leads" on public.leads;
create policy "admin updates leads" on public.leads
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'admin@example.com')
  with check ((auth.jwt() ->> 'email') = 'admin@example.com');
