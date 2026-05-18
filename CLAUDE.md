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
| 상태 관리 | Zustand v4 (persist 미들웨어) |
| 데이터 패칭 | React Query (Step 2 이후) |
| DB / Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| 차트 | Recharts (Step 4) |
| AI | OpenAI API (Step 5) |

## UI/UX 원칙

- **모바일 우선** (`max-w-md` 셸, 하단 네비 80px, 인풋·버튼 최소 44~56px 터치 타깃)
- **인지적 접근성**: 텍스트 최소화, 이모지·아이콘 중심, 큰 글자
- **고대비 색상**: 신호등 토큰(`signal.good/warn/bad`) 미리 정의
- **긍정적 강화**: 끼니 달성 시 칭찬 이모지·문구, 칭찬 배지 (Step 3 예정)
- **ARIA**: `role=tab`, `aria-current`, `aria-label`, `focus-visible` 링 완비

## 핵심 기능 (5단계)

| 기능 | 설명 | 상태 |
|------|------|------|
| 시간대별 식사 기록 | 아침·점심·저녁·간식, 자동완성, 최근/자주 빠른 선택, 수량·단위 | ✅ Step 1 완료 |
| 반복 식단 경고 | 7일 내 동일 음식 3회↑ 경고, 더미 데이터 화면 | 🔜 Step 3 |
| 영양 분석 리포트 | 탄단지·비타민 신호등 색상, 스마일 피드백 | 🔜 Step 3 |
| 음식·식재료 추천 | 부족 영양소 기반 OpenAI 추천, 간편 조리법 | 🔜 Step 5 |
| 데이터 히스토리 | 달력 뷰, 주간/월간 통계, CSV 추출 | 🔜 Step 4 |

---

## 진행 현황

### ✅ Step 1 — 기본 레이아웃 & 식사 입력 UI

브랜치: `claude/nutrition-tracking-app-muCpy`

**구현 내용**

- **라우팅**: `/welcome` → `/` (홈) → `/log` → `/analysis` · `/recommend` · `/history` (플레이스홀더)
- **하단 네비**: 5탭(홈/기록/영양/추천/히스토리), `/welcome`에서는 숨김
- **모드 분기** (`lib/user-mode.ts`, Zustand persist)
  - `/welcome`: 본인 모드 / 지원인력 모드 선택, 첫 진입 시 자동 진입, 재선택 가능
  - **본인 모드 홈** (`home-self.tsx`): 큰 표정 이모지(끼니 수에 따라 변화), 격려 문구, 2×2 큰 슬롯 카드
  - **지원인력 모드 홈** (`home-supporter.tsx`): 통계 카드 3종, 컴팩트 슬롯 리스트(수량 요약), 영양 분석·추천 진입 버튼
- **식사 입력** (`/log`, `meal-logger.tsx`)
  - 시간대 탭 선택 (아침·점심·저녁·간식)
  - 자동완성 텍스트 검색
  - "최근 / 자주" 빠른 선택 그리드 (Zustand에서 집계)
  - **수량·단위**: entry 카드에 `[−] 1 공기 [+]` 컨트롤, 카테고리별 기본 단위·step
  - **간식 다회 입력**: `slot === "snack"` 안내 문구, 슬롯 카운트 배지, 시간순 정렬
  - 모드에 따라 폰트·터치 타깃 사이즈 자동 조정

**파일 구조**
```
app/
  layout.tsx            모바일 셸 + 하단 네비
  page.tsx              모드 감지 → 모드별 홈 렌더
  welcome/page.tsx      모드 선택 화면
  log/page.tsx          식사 입력 (Suspense)
  analysis/page.tsx     플레이스홀더 (Step 3)
  recommend/page.tsx    플레이스홀더 (Step 5)
  history/page.tsx      플레이스홀더 (Step 4)
components/
  bottom-nav.tsx
  home-self.tsx         본인 모드 홈
  home-supporter.tsx    지원인력 모드 홈
  meal-logger.tsx       핵심 입력 UI
  coming-soon.tsx       플레이스홀더
  ui/                   button / input / card / badge
lib/
  food-data.ts          한식 시드 카탈로그 + unitFor()
  store.ts              Zustand persist v2 (qty/unit 포함, migrate)
  user-mode.ts          Zustand persist (본인/지원인력 모드)
  utils.ts              cn / todayKey / MEAL_SLOTS
```

---

## 향후 계획

### 🔜 Step 2 — DB 스키마 설계 & Supabase 연동

확정 방향:
- **Supabase** 사용 (PostgreSQL + RLS + Auth)
- **멀티 케어 수급자** 구조: `supporters` 1명이 N명의 `care_recipients` 관리

설계 예정 테이블:
```
users                  (Supabase Auth 연동)
supporters             (지원인력 프로필)
care_recipients        (케어 수급자, supporter_id FK)
food_items             (음식 카탈로그, 영양 메타 포함)
meal_logs              (식사 기록 헤드: recipient_id, date, slot)
meal_log_entries       (슬롯 내 각 음식: log_id, food_id, quantity, unit)
nutrition_snapshots    (일별 영양 집계 캐시, 분석 성능용)
```

작업 목록:
- Supabase 프로젝트 연결, `.env.local` 설정
- 마이그레이션 SQL 작성 + RLS 정책
- TypeScript 타입 자동 생성 (`supabase gen types`)
- Zustand store → Supabase 기반 React Query hooks로 교체
- care_recipient 선택 UI (지원인력 모드)

### 🔜 Step 3 — 반복 식단 경고 & 영양 분석 화면

- 최근 7일 `meal_log_entries` 집계 → 동일 음식 3회↑ 경고 배너
- 탄수화물·단백질·지방·비타민별 목표 대비 현황 바 차트
- 신호등 색상(`signal.good/warn/bad`) + 스마일 이모지 피드백
- 칭찬 배지 (다양한 식품군 섭취 달성 시)

### 🔜 Step 4 — 히스토리 대시보드 & 차트

- 달력 뷰: 날짜별 기록 여부 / 영양 점수 색상 표시
- 주간·월간 통계: 가장 많이 먹은 음식 Top 5, 영양 균형 점수 Recharts
- CSV 다운로드 (복지센터·의료기관 제출용)

### 🔜 Step 5 — OpenAI API 연동

- `/api/recommend` Edge Route: 최근 식단 + 부족 영양소 → OpenAI 프롬프트
- 응답: 음식 추천 3~5개 + 간편 조리법 텍스트
- 스트리밍 응답으로 UX 개선
- 프롬프트 캐싱으로 비용 절감

---

## 개발 명령어

```bash
npm run dev        # 개발 서버 (http://localhost:3000)
npm run build      # 프로덕션 빌드
npm run typecheck  # TypeScript 검사
```

## 환경 변수 (Step 2 이후 필요)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 서버 전용
OPENAI_API_KEY=              # Step 5
```
