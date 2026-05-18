# 오늘의 식판 — 식단 기록 & 영양 분석 앱

발달장애인과 지원인력(사회복지사·활동지원사)을 위한 식사 기록·영양 분석 앱.

## 프로젝트 배경

지원인력이 요리의 번거로움이나 익숙함 때문에 2~3가지 음식만 반복 제공하여 영양 불균형이 발생한다는 문제 의식에서 출발. 식단 다양성 확보와 영양 상태 분석을 목표로 한다.

**타겟 유저**
- 발달장애인 (본인 모드): 직관적·긍정적 피드백, 큰 이모지·그림 중심
- 지원인력 (지원인력 모드): 빠른 입력, 영양 통계, 멀티 케어 수급자 관리

## 기술 스택

| 영역 | 선택 |
|------|------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS v3, shadcn/ui 스타일 자체 컴포넌트 |
| 아이콘 | Lucide React |
| 상태 관리 | Zustand v4 (persist 미들웨어) — 인증·수급자 선택 |
| 데이터 패칭 | TanStack React Query v5 |
| DB / Backend | Supabase (PostgreSQL + Auth + RLS) |
| 차트 | Recharts v2 |
| AI | Anthropic Claude API (claude-haiku-4-5, 프롬프트 캐싱) |

## UI/UX 원칙

- **모바일 우선** (`max-w-md` 셸, 하단 네비 80px, 인풋·버튼 최소 44~56px 터치 타깃)
- **인지적 접근성**: 텍스트 최소화, 이모지·아이콘 중심, 큰 글자
- **고대비 색상**: 신호등 토큰(`signal.good/warn/bad`) 미리 정의
- **긍정적 강화**: 끼니 달성 시 칭찬 이모지·문구, 칭찬 배지
- **ARIA**: `role=tab`, `aria-current`, `aria-label`, `focus-visible` 링 완비

## 핵심 기능 (5단계)

| 기능 | 설명 | 상태 |
|------|------|------|
| 시간대별 식사 기록 | 아침·점심·저녁·간식, 자동완성, 최근/자주 빠른 선택, 수량·단위 | ✅ Step 1 |
| DB 연동 & 인증 | Supabase Auth, 멀티 케어 수급자, React Query CRUD | ✅ Step 2 |
| 반복 식단 경고 & 영양 분석 | 7일 경고 배너, 신호등 바 차트, 칭찬 배지 | ✅ Step 3 |
| 히스토리 대시보드 | 달력 뷰, 주간 Recharts, Top 5, CSV 다운로드 | ✅ Step 4 |
| AI 메뉴 추천 | Claude 스트리밍, 프롬프트 캐싱, 영양 갭 기반 추천 | ✅ Step 5 |

---

## 파일 구조

```
app/
  layout.tsx              모바일 셸 + 하단 네비 + QueryProvider + AuthProvider
  page.tsx                모드 감지 → 모드별 홈 렌더
  welcome/page.tsx        모드 선택 화면
  auth/page.tsx           이메일 로그인·회원가입
  onboarding/page.tsx     첫 케어 수급자 등록
  log/page.tsx            식사 입력 (Suspense)
  analysis/page.tsx       영양 분석 (날짜 선택, 신호등 바, 칭찬 배지)
  recommend/page.tsx      AI 메뉴 추천 (스트리밍 UI)
  history/page.tsx        히스토리 (달력, Recharts, CSV)
  api/recommend/route.ts  Anthropic 스트리밍 API 라우트
components/
  bottom-nav.tsx
  home-self.tsx           본인 모드 홈
  home-supporter.tsx      지원인력 모드 홈
  meal-logger.tsx         핵심 입력 UI (Supabase 훅 기반)
  recipient-selector.tsx  케어 수급자 탭 선택·추가
  repeated-meal-warning.tsx  반복 식단 경고 배너
  praise-badges.tsx       식품군 달성 배지
  meal-calendar.tsx       월 달력 그리드
  history-charts.tsx      Recharts 차트 3종
  auth-provider.tsx       Supabase 세션 구독
  query-provider.tsx      TanStack QueryClient
  ui/                     button / input / card / badge
lib/
  supabase.ts             Supabase 클라이언트
  database.types.ts       Supabase 자동 생성 TypeScript 타입
  auth-store.ts           Zustand — 세션·유저
  recipient-store.ts      Zustand — 선택된 케어 수급자
  user-mode.ts            Zustand — 본인/지원인력 모드
  store.ts                Zustand — (레거시, todayKey 재사용)
  food-data.ts            한식 시드 카탈로그 + unitFor()
  utils.ts                cn / todayKey / MEAL_SLOTS
  hooks/
    use-meal-db.ts        React Query — 식사 CRUD, 최근 음식, 수급자 관리
    use-nutrition.ts      React Query — 영양 분석, 반복 식단 감지
    use-history.ts        React Query — 달력, 주간 통계, Top 5, CSV
```

---

## Supabase 스키마

프로젝트 ID: `rqxittqcgocgsocqsroh` (ap-northeast-1)

```
supporters             (auth.users 연동, 가입 트리거로 자동 생성)
care_recipients        (supporter_id FK, 1:N)
food_items             (한식 22종 시드 + 칼로리·탄단지 영양 메타)
meal_logs              (recipient_id, date, slot — UNIQUE)
meal_log_entries       (log_id FK, food_id FK, quantity, unit)
nutrition_snapshots    (일별 영양 집계 캐시 — 미래 확장용)
```

RLS: 지원인력은 자신의 수급자 데이터만 접근 가능.

---

## 영양 목표값 (DAILY_TARGETS)

| 영양소 | 목표 |
|--------|------|
| 칼로리 | 2000 kcal |
| 탄수화물 | 300 g |
| 단백질 | 65 g |
| 지방 | 55 g |
| 식이섬유 | 25 g |

신호등 기준: 70~120% → 🟢 good / 40~70% or 120~150% → 🟡 warn / 그 외 → 🔴 bad

---

## 개발 명령어

```bash
npm run dev        # 개발 서버 (http://localhost:3000)
npm run build      # 프로덕션 빌드
npm run typecheck  # TypeScript 검사
```

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://rqxittqcgocgsocqsroh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
ANTHROPIC_API_KEY=<sk-ant-...>   # /api/recommend 라우트에서 사용
```
