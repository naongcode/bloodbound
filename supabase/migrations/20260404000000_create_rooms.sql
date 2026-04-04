-- ============================================================
-- Bloodbound Realm — 멀티플레이 룸 테이블
-- ============================================================

create table if not exists public.rooms (
  id           text        primary key,                        -- 6자리 대문자 랜덤 ID (예: "AB12CD")
  name         text        not null,                           -- 룸 이름
  host_id      text        not null,                           -- 호스트 플레이어 myId
  player_count integer     not null default 1                  -- 현재 참가 인원 (1~5)
                           check (player_count between 1 and 5),
  in_game      boolean     not null default false,             -- 게임 진행 중 여부
  in_dungeon   boolean     not null default false,             -- 던전 모드 여부
  created_at   timestamptz not null default now()
);

-- ── 인덱스 ────────────────────────────────────────────────
-- 로비에서 in_game=false 룸만 조회하는 쿼리 최적화
create index if not exists rooms_in_game_idx
  on public.rooms (in_game, created_at desc);

-- ── RLS (Row Level Security) ──────────────────────────────
alter table public.rooms enable row level security;

-- anon 키로 모든 CRUD 허용 (클라이언트가 직접 관리)
create policy "rooms_select"
  on public.rooms for select
  using (true);

create policy "rooms_insert"
  on public.rooms for insert
  with check (true);

create policy "rooms_update"
  on public.rooms for update
  using (true)
  with check (true);

create policy "rooms_delete"
  on public.rooms for delete
  using (true);

-- ── Realtime 활성화 ───────────────────────────────────────
-- (Broadcast / Presence는 자동 지원, DB 변경 알림용 추가 설정)
alter publication supabase_realtime add table public.rooms;
