-- ============================================================
-- Bloodbound Realm — 유저 프로필 & 게임 세이브 테이블
-- ============================================================

create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  name       text,                           -- 인게임 닉네임
  job_key    text        default 'warrior',  -- 직업
  save_data  jsonb       default '{}',       -- 게임 세이브 데이터 (레벨/스탯/인벤토리 등)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- 자신의 프로필만 읽기/쓰기 가능
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 신규 유저 가입 시 프로필 자동 생성 ────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
