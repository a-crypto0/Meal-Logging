-- =============================================================================
-- 오늘의 식판 — 초기 스키마 (Step 2)
-- 발달장애인 돌봄 현장용 식사 기록 · 분석 앱
--
-- 인증 모델: Supabase 익명 세션(signInAnonymously).
--   익명 로그인 사용자도 `authenticated` 역할을 가지며 JWT를 보유한다.
--   따라서 auth.uid() = 지원인력 ID(worker_id) 로 사용한다.
--   모든 정책은 `to authenticated` 로 한정한다(미인증 anon 요청은 차단).
--
-- 보안 원칙:
--   * 모든 테이블 RLS 활성화
--   * 본인(worker)이 소유한 데이터만 SELECT / INSERT / UPDATE / DELETE
--   * audit_logs 는 append-only (UPDATE/DELETE 정책 없음 → 변조 불가)
--   * SECURITY DEFINER 함수는 search_path 고정(빈 문자열) + 스키마 정규화
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. ENUM 타입
--    DB 안정성을 위해 영문 토큰을 저장하고, UI 한글 라벨은 주석/앱에서 매핑한다.
--    (기존 Step 1 코드도 'breakfast'/'snack' 등 영문 슬롯 토큰을 사용 중)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_type') then
    -- 아침 / 점심 / 저녁 / 간식
    create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
  end if;

  if not exists (select 1 from pg_type where typname = 'intake_status') then
    -- 다 먹음 / 일부 / 거부 / 건너뜀
    create type public.intake_status as enum ('all_eaten', 'partial', 'refused', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_action') then
    -- 생성 / 교체 / 수정
    create type public.audit_action as enum ('create', 'replace', 'update');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- 1. care_recipients — 케어 대상자 프로필 (안전 프로필 포함)
-- -----------------------------------------------------------------------------
create table if not exists public.care_recipients (
  id                      uuid primary key default gen_random_uuid(),
  worker_id               uuid not null default auth.uid()
                            references auth.users (id) on delete cascade,
  name                    text not null check (length(btrim(name)) > 0),
  age                     int  check (age is null or (age >= 0 and age <= 150)),

  -- 안전 프로필 -------------------------------------------------------------
  allergies               text[]      not null default '{}',  -- 알레르기 유발 식품
  texture_caution         text,                               -- 씹기/삼킴 주의사항(연하곤란 등)
  disliked_foods          text[]      not null default '{}',  -- 비선호 음식
  liked_foods             text[]      not null default '{}',  -- 선호 음식
  safe_snacks_memo        text,                               -- 안전 간식 메모
  constraints_confirmed_at timestamptz,                       -- 안전 제약 확인 시각

  created_at              timestamptz not null default now()
);

comment on table  public.care_recipients is '케어 대상자 프로필 + 안전 프로필(알레르기/연하주의 등)';
comment on column public.care_recipients.worker_id is '소유 지원인력 = auth.uid() (익명 세션)';
comment on column public.care_recipients.texture_caution is '씹기/삼킴(연하) 주의사항';
comment on column public.care_recipients.constraints_confirmed_at is '안전 제약(알레르기·연하)을 지원인력이 확인한 시각';

-- -----------------------------------------------------------------------------
-- 2. meal_records — 식사 기록
--    (recipient_id, date, meal_type) UNIQUE → 동일 끼니 중복 기록 방지
--    간식 다회 섭취는 한 레코드의 foods 배열(최대 5개)로 표현한다.
-- -----------------------------------------------------------------------------
create table if not exists public.meal_records (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid not null references public.care_recipients (id) on delete cascade,
  worker_id       uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  date            date not null,
  meal_type       public.meal_type not null,

  -- 음식 목록: [{ "name": text, "quantity": number, "unit": text }, ...] 최대 5개
  foods           jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(foods) = 'array' and jsonb_array_length(foods) <= 5),

  intake_status   public.intake_status not null,

  -- 반응 태그 8종(예: 잘먹음/즐김/거부/사레들림/남김/도움필요/천천히/알레르기반응)
  response_tags   text[] not null default '{}'
                    check (cardinality(response_tags) <= 8),

  fluid_ml        int  check (fluid_ml is null or fluid_ml >= 0),  -- 수분 섭취량(ml)
  memo            text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- 중복 기록 방지
  constraint meal_records_recipient_date_meal_unique
    unique (recipient_id, date, meal_type)
);

comment on table  public.meal_records is '식사 기록(한 대상자의 날짜·끼니별 1행). 중복은 UNIQUE로 차단.';
comment on column public.meal_records.foods is 'jsonb 배열 최대 5개: {name, quantity, unit}';
comment on column public.meal_records.response_tags is '반응 태그(최대 8종)';
comment on column public.meal_records.fluid_ml is '수분 섭취량(ml)';

-- -----------------------------------------------------------------------------
-- 3. audit_logs — 감사 로그 (append-only)
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null default auth.uid()
                  references auth.users (id) on delete cascade,
  recipient_id  uuid references public.care_recipients (id) on delete set null,
  action_type   public.audit_action not null,         -- 생성 / 교체 / 수정
  details       jsonb not null default '{}'::jsonb,    -- 변경 스냅샷(before/after 등)
  created_at    timestamptz not null default now()
);

comment on table public.audit_logs is '감사 로그(append-only). RPC가 자동 기록. 수정/삭제 정책 없음.';

-- -----------------------------------------------------------------------------
-- 4. 인덱스 (RLS 필터 + 조회 성능)
-- -----------------------------------------------------------------------------
create index if not exists idx_care_recipients_worker      on public.care_recipients (worker_id);
create index if not exists idx_meal_records_worker         on public.meal_records (worker_id);
create index if not exists idx_meal_records_recipient_date on public.meal_records (recipient_id, date);
create index if not exists idx_audit_logs_worker_created   on public.audit_logs (worker_id, created_at desc);
create index if not exists idx_audit_logs_recipient        on public.audit_logs (recipient_id);

-- -----------------------------------------------------------------------------
-- 5. updated_at 자동 갱신 트리거
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_meal_records_updated_at on public.meal_records;
create trigger trg_meal_records_updated_at
  before update on public.meal_records
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. Row Level Security
-- =============================================================================
alter table public.care_recipients enable row level security;
alter table public.meal_records    enable row level security;
alter table public.audit_logs      enable row level security;

-- (성능) auth.uid() 는 (select auth.uid()) 로 감싸 initplan 캐싱을 유도한다.

-- --- care_recipients ----------------------------------------------------------
create policy "care_recipients_select_own" on public.care_recipients
  for select to authenticated
  using (worker_id = (select auth.uid()));

create policy "care_recipients_insert_own" on public.care_recipients
  for insert to authenticated
  with check (worker_id = (select auth.uid()));

create policy "care_recipients_update_own" on public.care_recipients
  for update to authenticated
  using (worker_id = (select auth.uid()))
  with check (worker_id = (select auth.uid()));

create policy "care_recipients_delete_own" on public.care_recipients
  for delete to authenticated
  using (worker_id = (select auth.uid()));

-- --- meal_records -------------------------------------------------------------
-- 본인 소유 + 대상자도 본인 소유여야 INSERT/UPDATE 허용(타인 대상자에 기록 방지)
create policy "meal_records_select_own" on public.meal_records
  for select to authenticated
  using (worker_id = (select auth.uid()));

create policy "meal_records_insert_own" on public.meal_records
  for insert to authenticated
  with check (
    worker_id = (select auth.uid())
    and exists (
      select 1 from public.care_recipients cr
      where cr.id = recipient_id
        and cr.worker_id = (select auth.uid())
    )
  );

create policy "meal_records_update_own" on public.meal_records
  for update to authenticated
  using (worker_id = (select auth.uid()))
  with check (
    worker_id = (select auth.uid())
    and exists (
      select 1 from public.care_recipients cr
      where cr.id = recipient_id
        and cr.worker_id = (select auth.uid())
    )
  );

create policy "meal_records_delete_own" on public.meal_records
  for delete to authenticated
  using (worker_id = (select auth.uid()));

-- --- audit_logs (append-only) -------------------------------------------------
-- SELECT/INSERT 만 허용. UPDATE/DELETE 정책 없음 → 변조 불가.
create policy "audit_logs_select_own" on public.audit_logs
  for select to authenticated
  using (worker_id = (select auth.uid()));

create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated
  with check (worker_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 7. 권한 (Supabase 기본 default privilege 보강용 명시 grant)
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.care_recipients to authenticated;
grant select, insert, update, delete on public.meal_records    to authenticated;
grant select, insert                 on public.audit_logs       to authenticated;

-- =============================================================================
-- 8. RPC: save_meal_record
--    원자적 저장. 동일 (recipient, date, meal_type) 기록 존재 시:
--      - p_force_replace = false → 409(conflict) 에러 (PostgREST: SQLSTATE 'PT409')
--      - p_force_replace = true  → 기존 레코드 교체(UPDATE)
--    저장 시 audit_logs 자동 기록(생성=create / 교체=replace).
--    SECURITY DEFINER 이지만 내부에서 소유권을 직접 검증한다.
-- =============================================================================
create or replace function public.save_meal_record(
  p_recipient_id   uuid,
  p_date           date,
  p_meal_type      public.meal_type,
  p_foods          jsonb,
  p_intake_status  public.intake_status,
  p_response_tags  text[]  default '{}',
  p_fluid_ml       int     default null,
  p_memo           text    default null,
  p_force_replace  boolean default false
)
returns public.meal_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker   uuid := auth.uid();
  v_existing public.meal_records;
  v_result   public.meal_records;
  v_action   public.audit_action;
begin
  -- 1) 인증 확인
  if v_worker is null then
    raise exception 'authentication required'
      using errcode = 'PT401';
  end if;

  -- 2) 입력 검증
  if p_foods is null
     or jsonb_typeof(p_foods) <> 'array'
     or jsonb_array_length(p_foods) > 5 then
    raise exception 'foods must be a jsonb array of at most 5 items'
      using errcode = 'PT400';
  end if;

  -- 3) 대상자 소유권 확인 (타인 대상자에 기록 금지)
  if not exists (
    select 1 from public.care_recipients cr
    where cr.id = p_recipient_id and cr.worker_id = v_worker
  ) then
    raise exception 'recipient not found or not owned by current worker'
      using errcode = 'PT403';
  end if;

  -- 4) 기존 기록 조회 (행 잠금으로 동시성 보호)
  select * into v_existing
  from public.meal_records
  where recipient_id = p_recipient_id
    and date = p_date
    and meal_type = p_meal_type
  for update;

  if found and not p_force_replace then
    -- 5a) 충돌 → 409
    raise exception 'meal record already exists for this recipient/date/meal'
      using errcode = 'PT409',
            detail  = jsonb_build_object('existing_id', v_existing.id)::text,
            hint    = 'retry with p_force_replace => true to overwrite';
  elsif found then
    -- 5b) 교체(UPDATE)
    update public.meal_records
       set foods         = p_foods,
           intake_status = p_intake_status,
           response_tags = coalesce(p_response_tags, '{}'),
           fluid_ml      = p_fluid_ml,
           memo          = p_memo
           -- updated_at 은 트리거가 갱신
     where id = v_existing.id
     returning * into v_result;
    v_action := 'replace';
  else
    -- 5c) 신규(INSERT)
    insert into public.meal_records
      (recipient_id, worker_id, date, meal_type, foods,
       intake_status, response_tags, fluid_ml, memo)
    values
      (p_recipient_id, v_worker, p_date, p_meal_type, p_foods,
       p_intake_status, coalesce(p_response_tags, '{}'), p_fluid_ml, p_memo)
    returning * into v_result;
    v_action := 'create';
  end if;

  -- 6) 감사 로그 자동 기록
  insert into public.audit_logs (worker_id, recipient_id, action_type, details)
  values (
    v_worker,
    p_recipient_id,
    v_action,
    jsonb_build_object(
      'meal_record_id', v_result.id,
      'date',           p_date,
      'meal_type',      p_meal_type,
      'before',         case when v_action = 'replace' then to_jsonb(v_existing) else null end,
      'after',          to_jsonb(v_result)
    )
  );

  return v_result;
end;
$$;

comment on function public.save_meal_record is
  '식사 기록 원자적 저장. 중복 시 force_replace=false면 PT409, true면 교체. audit_logs 자동 기록.';

-- 실행 권한: 익명 세션 포함 인증 사용자에게만
revoke all on function public.save_meal_record(
  uuid, date, public.meal_type, jsonb, public.intake_status, text[], int, text, boolean
) from public;
grant execute on function public.save_meal_record(
  uuid, date, public.meal_type, jsonb, public.intake_status, text[], int, text, boolean
) to authenticated;
