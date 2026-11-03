-- Track Mo, Pake ko! : tables, security (RLS), functions and seed data.
-- Paste this whole file into Supabase > SQL Editor > New query > Run.

-- ========== TABLES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  currency text not null default 'PHP',
  warn_80 boolean not null default true,
  warn_100 boolean not null default true,
  email_alerts boolean not null default false,
  daily_reminder boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id bigint generated always as identity primary key,
  slug text unique not null,
  name text not null check (char_length(name) between 1 and 30),
  icon text not null default 'coins',
  color text not null default '#0F766E',
  bg text not null default '#0F766E22',
  is_active boolean not null default true,
  show_in_picker boolean not null default true,
  sort_order int not null default 0
);
create unique index categories_name_key on public.categories (lower(name));

create table public.user_categories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id bigint not null references public.categories(id) on delete cascade,
  primary key (user_id, category_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id bigint not null references public.categories(id),
  amount numeric(12,2) not null check (amount > 0 and amount <= 9999999.99),
  spent_on date not null,
  payment_method text not null default 'Cash',
  note text check (char_length(note) <= 200),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index expenses_user_date_idx on public.expenses (user_id, spent_on);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id bigint not null references public.categories(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year smallint not null,
  amount numeric(12,2) not null check (amount > 0),
  unique (user_id, category_id, month, year)
);

create table public.archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,
  total numeric(12,2) not null default 0,
  archived_at timestamptz not null default now(),
  unique (user_id, period)
);

create table public.lessons (
  id bigint generated always as identity primary key,
  topic text not null,
  title text not null,
  body text not null,
  sort_order int not null default 0
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  created_at timestamptz not null default now()
);

-- ========== HELPER FUNCTIONS ==========
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  -- Admins must have passed the 6-digit code step (aal2), not only the password.
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active')
         and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- Create a profile row automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Stop normal users from changing their own role or status.
-- (Running SQL in the dashboard has no logged-in user, so it is allowed.)
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.status is distinct from old.status)
     and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  return new;
end; $$;

create trigger protect_profile_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.user_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.archives enable row level security;
alter table public.lessons enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles read own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles update admin" on public.profiles for update to authenticated
  using (public.is_admin());

create policy "categories read" on public.categories for select to authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "user_categories own" on public.user_categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_categories admin read" on public.user_categories for select to authenticated
  using (public.is_admin());

create policy "expenses own" on public.expenses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets own" on public.budgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "archives own" on public.archives for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lessons read" on public.lessons for select to authenticated using (true);
create policy "lessons admin write" on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "audit admin read" on public.audit_log for select to authenticated using (public.is_admin());
create policy "audit admin insert" on public.audit_log for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- ========== USER FUNCTIONS ==========
create or replace function public.archive_month(p_period text) returns void
language plpgsql as $$
declare s date := (p_period || '-01')::date; e date := (s + interval '1 month')::date; t numeric;
begin
  if s >= date_trunc('month', current_date)::date then
    raise exception 'Only finished months can be archived.';
  end if;
  if not exists (select 1 from public.expenses where user_id = auth.uid() and spent_on >= s and spent_on < e) then
    return;
  end if;
  select coalesce(sum(amount), 0) into t from public.expenses
    where user_id = auth.uid() and spent_on >= s and spent_on < e;
  update public.expenses set is_archived = true
    where user_id = auth.uid() and spent_on >= s and spent_on < e;
  insert into public.archives (user_id, period, total) values (auth.uid(), p_period, t)
    on conflict (user_id, period) do update set total = excluded.total, archived_at = now();
end $$;

create or replace function public.restore_archive(p_period text) returns void
language plpgsql as $$
declare s date := (p_period || '-01')::date; e date := (s + interval '1 month')::date;
begin
  update public.expenses set is_archived = false
    where user_id = auth.uid() and spent_on >= s and spent_on < e;
  delete from public.archives where user_id = auth.uid() and period = p_period;
end $$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- ========== ADMIN FUNCTIONS ==========
create or replace function public.admin_stats()
returns table (total_users bigint, active_users bigint, admins bigint, expenses_count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query select
    (select count(*) from public.profiles where role = 'user'),
    (select count(*) from public.profiles where role = 'user' and status = 'active'),
    (select count(*) from public.profiles where role = 'admin'),
    (select count(*) from public.expenses);
end $$;

-- p_end is exclusive
create or replace function public.admin_period_stats(p_start date, p_end date)
returns table (new_users bigint, expenses_count bigint, active_users bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query select
    (select count(*) from public.profiles where role = 'user' and created_at >= p_start and created_at < p_end),
    (select count(*) from public.expenses where spent_on >= p_start and spent_on < p_end),
    (select count(distinct user_id) from public.expenses where spent_on >= p_start and spent_on < p_end);
end $$;

create or replace function public.admin_top_categories(p_start date, p_end date)
returns table (category_id bigint, uses bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query select e.category_id, count(*) from public.expenses e
    where e.spent_on >= p_start and e.spent_on < p_end
    group by e.category_id order by count(*) desc limit 3;
end $$;

create or replace function public.admin_user_growth()
returns table (label text, total bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query
    select to_char(m, 'Mon'),
           (select count(*) from public.profiles p where p.role = 'user' and p.created_at < m + interval '1 month')
    from generate_series(date_trunc('month', current_date) - interval '5 months',
                         date_trunc('month', current_date), interval '1 month') m
    order by m;
end $$;

create or replace function public.admin_set_role(p_email text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  update public.profiles set role = p_role where lower(email) = lower(p_email);
  if not found then raise exception 'No account with that email.'; end if;
end $$;

-- ========== SEED DATA ==========
insert into public.categories (slug, name, icon, color, bg, sort_order) values
 ('transportation','Transportation','bus','#B45309','#FDECD2',1),
 ('medicine','Medicine','plus-square','#B42318','#FDE8E6',2),
 ('food-water','Food & Water','utensils','#0F766E','#DDF1EE',3),
 ('bills-utilities','Bills & Utilities','zap','#1E3A5F','#E1E9F4',4),
 ('entertainment','Entertainment','play','#6D28D9','#EDE5FB',5),
 ('shopping','Shopping','shopping-bag','#BE185D','#FCE4EE',6),
 ('rent','Rent','home','#854D0E','#F5EAD3',7),
 ('others-savings','Others / Savings','coins','#4B5563','#E8EAED',8);

insert into public.lessons (topic, title, body, sort_order) values
 ('budgeting','Needs vs wants','A budget is a plan for your money. The first step is knowing the difference between what you must pay and what you choose to buy.

Try these steps:
1. Write down your monthly income.
2. List your needs: rent, food, bills, transport and medicine.
3. List your wants: entertainment, shopping and eating out.
4. Set a limit for each category and review it at the end of the month.

Key takeaways:
- Needs come first, wants come after.
- A common rule of thumb splits income into needs, wants and savings.
- Tracking your spending shows where the money really goes.',1),
 ('budgeting','The 50/30/20 rule of thumb','A simple starting point is to give about half of your income to needs, about 30% to wants and about 20% to savings or paying off debt. Treat it as a guide and adjust it to your own life.',2),
 ('budgeting','Reviewing your budget monthly','At the end of each month, compare what you planned with what you spent. Look for categories that went over, and decide whether to raise the limit or change the habit.',3),
 ('saving','Emergency fund basics','An emergency fund is money set aside for surprises such as a medical bill or a lost job. Start small and build it up until it can cover a few months of basic costs.',1),
 ('saving','Setting a savings goal','Give your savings a name, an amount and a date. A clear goal, such as a laptop or a trip, makes it easier to keep going.',2),
 ('saving','Small habits that add up','Move money to savings as soon as you are paid, and round up small purchases. Small, regular amounts grow over time.',3),
 ('borrowing','Interest explained','Interest is the price of borrowing money. A higher rate or a longer time means you pay back more than you borrowed.',1),
 ('borrowing','Good debt vs risky debt','Debt that helps you earn more later, such as study costs, can make sense. Debt for things you cannot afford, with high interest, is risky.',2),
 ('borrowing','How to compare loans','Compare the total amount you will repay, not just the monthly payment. Check the interest rate, fees and what happens if you pay late.',3),
 ('investing','Risk and return','Investments that can earn more usually carry more risk of loss. Only invest money you will not need soon.',1),
 ('investing','Diversification','Spreading money across different kinds of investments lowers the damage if one of them does badly.',2),
 ('investing','Short-term vs long-term goals','Money needed soon belongs in safe places. Money for goals many years away can handle more ups and downs.',3),
 ('insurance','Health, life and property cover','Insurance pays when something unexpected happens to your health, your life or your belongings. Different cover protects different things.',1),
 ('insurance','Premiums and deductibles','A premium is what you pay to keep the cover. A deductible is the part of a claim you pay yourself before insurance helps.',2),
 ('insurance','Choosing what you need','Start with the risks that would hurt you most financially, and compare plans before you choose.',3),
 ('safety','Spotting scams','Scams often create pressure, promise easy money or ask for personal details. Slow down and check with the real company before you act.',1),
 ('safety','Protecting your accounts','Use a different strong password for each account, turn on two-step checks, and never share your OTP with anyone.',2),
 ('safety','What to do if you are scammed','Contact your bank or e-wallet right away, change your passwords, keep screenshots, and report the scam to the authorities.',3);

-- ========== MAKE YOUR FIRST ADMIN ==========
-- 1) Sign up in the app with your email.
-- 2) Then run this line with your own email:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
