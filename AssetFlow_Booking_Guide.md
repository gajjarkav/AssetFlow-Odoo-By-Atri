# AssetFlow — Module E: Resource Booking
## Deep Dive Guide · Shared Resources · Overlap Validation · Cancel · List/Calendar · Logic & Contracts

**Prerequisite:** Module A Auth ✅ · B Org ✅ · C Assets ✅ · D Allocation/Transfer ✅  
**This module:** Resource Booking (Screen 6) — **Hero Feature #2**  
**Next after this:** Module F — Maintenance Workflow  
**Stack context:** FastAPI · existing `Booking` model · assets with `is_shared=true`  

---

# Table of Contents

1. [Why This Module Matters](#1-why-this-module-matters)
2. [Product Scope](#2-product-scope)
3. [Dependencies](#3-dependencies)
4. [Data Model](#4-data-model)
5. [Core Invariants](#5-core-invariants)
6. [Overlap Rule (Critical)](#6-overlap-rule-critical)
7. [Business Rules](#7-business-rules)
8. [Booking Status](#8-booking-status)
9. [RBAC](#9-rbac)
10. [API Catalog](#10-api-catalog)
11. [Request / Response Contracts](#11-request--response-contracts)
12. [Error Codes](#12-error-codes)
13. [Service Algorithms](#13-service-algorithms)
14. [Relationship to Allocation (Module D)](#14-relationship-to-allocation-module-d)
15. [Asset Status Policy](#15-asset-status-policy)
16. [List, Filters & Calendar Queries](#16-list-filters--calendar-queries)
17. [Seed Data](#17-seed-data)
18. [End-to-End Flows](#18-end-to-end-flows)
19. [Implementation Order](#19-implementation-order)
20. [Smoke Tests](#20-smoke-tests)
21. [Definition of Done](#21-definition-of-done)
22. [Handoff to F / Dashboard](#22-handoff-to-f--dashboard)
23. [Common Mistakes](#23-common-mistakes)
24. [Frontend Contract](#24-frontend-contract)
25. [Coding Checklist](#25-coding-checklist)

---

# 1. Why This Module Matters

Problem statement money quote:

> *Room B2 is booked 9:00–10:00. A request for 9:30–10:30 gets rejected since it overlaps; a request for 10:00–11:00 is fine since it starts right after.*

```
DONE                              THIS MODULE ★
A–D Auth/Org/Assets/Custody  →   Booking + OVERLAP engine
                                      ↓
                                 Second live demo wow moment
```

| Without Module E | With Module E |
|------------------|---------------|
| Shared rooms are just assets | Real resource scheduling |
| No conflict story for rooms | Live 409 overlap |
| Dashboard active_bookings = 0 | KPI can hydrate |

**Pair with Module D in demos:**  
Laptop custody conflict **and** room time conflict = complete hero story.

---

# 2. Product Scope

## 2.1 In scope

| Feature | Description |
|---------|-------------|
| List bookable resources | Assets where `is_shared=true` |
| Create booking | asset + start + end + optional purpose |
| Overlap validation | Server-side hard reject |
| Edge-adjacent allow | end == next start is OK |
| List bookings | By asset, date, user, status |
| Cancel booking | Free the slot |
| Status model | UPCOMING / ONGOING / COMPLETED / CANCELLED |
| Optional reschedule | PATCH with re-validation (P1) |
| Optional reminder flag | Stub for notifications later (P2) |

## 2.2 Out of scope for Module E

| Feature | Notes |
|---------|--------|
| Recurring bookings | Skip |
| Multi-resource batch book | Skip |
| Buffer times between meetings | Optional; default no buffer |
| Payment / room cost | Out of PS |
| Google Calendar sync | Skip |
| Allocate shared assets | Already blocked in Module D |
| Maintenance workflow | Module F |
| Real email reminder | Toast/notification later |

---

# 3. Dependencies

| Dependency | Use |
|------------|-----|
| `Asset` with `is_shared=true` | Bookable pool (Room B2 from seed) |
| `Asset.status` | Prefer AVAILABLE (or allow book even if not allocated — see §15) |
| `User` | booker = current user |
| Auth | Any active user can book (MVP) |
| Module D policy | Shared assets not allocated — rooms free for time slots |

### Required seed asset
| Tag (example) | Name | is_shared | status |
|---------------|------|-----------|--------|
| AF-000003 | Conference Room B2 | **true** | AVAILABLE |

If missing, create via Assets API or seed before testing E.

---

# 4. Data Model

Align with your existing `Booking` model. Migrate if fields missing.

## 4.1 Booking table

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | UUID | NO | PK |
| `asset_id` | UUID FK → assets | NO | Must be shared |
| `user_id` | UUID FK → users | NO | Booker |
| `start_at` | DateTime(tz) | NO | Inclusive start |
| `end_at` | DateTime(tz) | NO | Exclusive end recommended |
| `purpose` | String/Text | YES | e.g. "Procurement standup" |
| `status` | Enum | NO | See §8 |
| `created_at` | DateTime(tz) | NO | now |
| `updated_at` | DateTime(tz) | YES | |
| `cancelled_at` | DateTime(tz) | YES | When cancelled |
| `cancelled_by` | UUID FK | YES | Optional |

## 4.2 Indexes (strongly recommended)

| Index | Why |
|-------|-----|
| `(asset_id, start_at, end_at)` | Overlap query speed |
| `(user_id, start_at)` | My bookings |
| `(status)` | Filter active |

## 4.3 DB-level overlap (optional advanced)

PostgreSQL exclusion constraints with `tstzrange` are ideal in production.  
**Hackathon MVP:** enforce overlap in service SQL/query inside a transaction — sufficient if careful.

---

# 5. Core Invariants

| # | Invariant |
|---|-----------|
| 1 | Only `is_shared=true` assets can be booked |
| 2 | `end_at > start_at` always |
| 3 | No two **non-cancelled** bookings for the same asset may overlap in time |
| 4 | Adjacent bookings may touch at an endpoint (no overlap) |
| 5 | Cancelled bookings never block new bookings |
| 6 | Overlap checked **server-side** on every create/reschedule |

---

# 6. Overlap Rule (Critical)

## 6.1 Interval model

Use **half-open intervals**: **`[start_at, end_at)`**

| Meaning | |
|---------|--|
| Includes | `start_at` |
| Excludes | `end_at` |
| Touching | Booking A ends 10:00, B starts 10:00 → **NO overlap** |

## 6.2 Conflict predicate

Two intervals overlap when:

```
new_start < existing_end
AND new_end > existing_start
AND existing.status != CANCELLED
AND existing.asset_id == new.asset_id
```

(If you also exclude COMPLETED that ended in the past, still fine — CANCELLED is the important exclusion.)

## 6.3 Worked examples (memorize for demo)

Assume existing booking: **09:00 – 10:00** (non-cancelled)

| New request | Overlap? | Result |
|-------------|----------|--------|
| 09:30 – 10:30 | YES | **409 BOOKING_OVERLAP** |
| 09:00 – 10:00 | YES (exact) | **409** |
| 08:00 – 09:00 | NO (touch start) | **201 OK** |
| 10:00 – 11:00 | NO (touch end) | **201 OK** |
| 08:30 – 09:30 | YES | **409** |
| 10:00 – 10:00 | Invalid | **400** end <= start |
| 11:00 – 12:00 | NO | **201 OK** |

## 6.4 Same user double-book

Still reject overlap even if same user — one room cannot host two overlapping bookings.

## 6.5 Different assets

Room B2 and Projector (if shared) do **not** conflict with each other.

---

# 7. Business Rules

## 7.1 Create booking

| # | Rule |
|---|------|
| 1 | Actor must be authenticated ACTIVE user |
| 2 | Asset must exist |
| 3 | Asset `is_shared` must be **true** |
| 4 | Asset should be bookable status (see §15) — MVP: not RETIRED/DISPOSED/LOST |
| 5 | `end_at > start_at` |
| 6 | Prefer `start_at` not in far past (optional: reject start_at < now - 5 min) |
| 7 | Overlap check against all non-cancelled bookings for asset |
| 8 | On success: status = UPCOMING (or derive — see §8) |
| 9 | `user_id` = current user (don't allow booking as someone else in MVP) |

## 7.2 Cancel booking

| # | Rule |
|---|------|
| 1 | Booking exists |
| 2 | Status is not already CANCELLED |
| 3 | Actor is booker **OR** ADMIN **OR** ASSET_MANAGER |
| 4 | Set status=CANCELLED, cancelled_at=now |
| 5 | Slot becomes free for others |

Optional: disallow cancel after start (ONGOING) — or allow for hackathon simplicity.

## 7.3 Reschedule (optional P1)

| # | Rule |
|---|------|
| 1 | Only booker or AM/Admin |
| 2 | Not CANCELLED |
| 3 | Re-validate end > start |
| 4 | Overlap check **excluding this booking's own id** |
| 5 | Update start_at/end_at |

## 7.4 List resources

| # | Rule |
|---|------|
| 1 | Return assets where `is_shared=true` |
| 2 | Optional filter status=AVAILABLE |
| 3 | Any authenticated user |

---

# 8. Booking Status

## 8.1 Enum values

```
UPCOMING
ONGOING
COMPLETED
CANCELLED
```

## 8.2 How to set status

### Option A — Store + derive on read (recommended MVP)

On create: store `UPCOMING` (or store only CANCELLED as terminal and derive the rest).

On serialize/read:
```
if status == CANCELLED: CANCELLED
elif now < start_at: UPCOMING
elif start_at <= now < end_at: ONGOING
else: COMPLETED
```

You can either:
- Update DB lazily, or  
- Keep DB as `UPCOMING`/`CANCELLED` only and **derive** ONGOING/COMPLETED in response  

**Simplest MVP:**  
- DB statuses: `CONFIRMED` + `CANCELLED`  
- Response adds computed `display_status`: UPCOMING/ONGOING/COMPLETED  

OR stick to PS names and set on create:

| Event | status |
|-------|--------|
| Create | UPCOMING |
| Cancel | CANCELLED |
| Read-time | compute ONGOING/COMPLETED without requiring cron |

## 8.3 What blocks overlap

Only bookings where `status != CANCELLED` (and optionally not COMPLETED if you keep them — completed past bookings shouldn't use future times; still exclude CANCELLED always).

**Rule of thumb:**  
```
blocking = status not in (CANCELLED,)
```
Past COMPLETED rows with old windows won't conflict with future creates if times don't overlap.

---

# 9. RBAC

| Action | EMPLOYEE | DEPT_HEAD | ASSET_MANAGER | ADMIN |
|--------|:--------:|:---------:|:-------------:|:-----:|
| List resources | ✅ | ✅ | ✅ | ✅ |
| List bookings (resource calendar) | ✅ | ✅ | ✅ | ✅ |
| Create booking | ✅ | ✅ | ✅ | ✅ |
| Cancel own booking | ✅ | ✅ | ✅ | ✅ |
| Cancel any booking | ❌ | ❌ | ✅ | ✅ |
| Reschedule own | ✅ | ✅ | ✅ | ✅ |

**MVP:** any ACTIVE user books; cancel own or AM/Admin.

---

# 10. API Catalog

Base: `/api` · Bearer required.

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/api/resources` | Auth | Shared assets list |
| GET | `/api/bookings` | Auth | List/filter bookings |
| GET | `/api/bookings/{id}` | Auth | Detail |
| POST | `/api/bookings` | Auth | Create + overlap check |
| POST | `/api/bookings/{id}/cancel` | Booker / AM / Admin | Cancel |
| PATCH | `/api/bookings/{id}` | Booker / AM / Admin | Optional reschedule |

### Alternative without `/resources`
```
GET /api/assets?is_shared=true
```
`/api/resources` is cleaner for booking UI — thin wrapper is fine.

---

# 11. Request / Response Contracts

## 11.1 GET `/api/resources`

### Query (optional)
`search`, `status`, `department_id`

### Success — 200
```json
{
  "items": [
    {
      "id": "uuid",
      "tag": "AF-000003",
      "name": "Conference Room B2",
      "category_name": "Rooms",
      "location": "Building B",
      "status": "AVAILABLE",
      "is_shared": true
    }
  ],
  "total": 1
}
```

---

## 11.2 POST `/api/bookings`

### Request
```json
{
  "asset_id": "uuid",
  "start_at": "2026-07-12T09:00:00+05:30",
  "end_at": "2026-07-12T10:00:00+05:30",
  "purpose": "Procurement standup"
}
```

Use ISO-8601 datetimes with timezone. Store UTC internally if possible.

### Success — 201
```json
{
  "id": "uuid",
  "asset_id": "uuid",
  "asset_tag": "AF-000003",
  "asset_name": "Conference Room B2",
  "user_id": "uuid",
  "user_name": "Arjun Mehta",
  "start_at": "2026-07-12T09:00:00+05:30",
  "end_at": "2026-07-12T10:00:00+05:30",
  "purpose": "Procurement standup",
  "status": "UPCOMING",
  "created_at": "2026-07-12T08:00:00+05:30"
}
```

### Conflict — 409
```json
{
  "detail": "Time slot overlaps an existing booking",
  "code": "BOOKING_OVERLAP",
  "asset_id": "uuid",
  "asset_tag": "AF-000003",
  "conflicts_with": [
    {
      "booking_id": "uuid",
      "start_at": "2026-07-12T09:00:00+05:30",
      "end_at": "2026-07-12T10:00:00+05:30",
      "user_name": "Priya Shah",
      "purpose": "Procurement standup"
    }
  ]
}
```
`conflicts_with` is optional but excellent for UI timeline highlighting.

---

## 11.3 GET `/api/bookings`

### Query params
| Param | Meaning |
|-------|---------|
| `asset_id` | required for calendar view (recommended) |
| `date` | `YYYY-MM-DD` — bookings that intersect that local day |
| `user_id` | my bookings / filter |
| `status` | UPCOMING / ONGOING / COMPLETED / CANCELLED |
| `from` / `to` | optional range filter |
| `skip` / `limit` | pagination |

### Date filter logic
Booking intersects day D if:
```
start_at < end_of_day(D)
AND end_at > start_of_day(D)
AND status != CANCELLED  (optional include cancelled for audit)
```

### Success — 200
```json
{
  "items": [ /* BookingResponse[] */ ],
  "total": 3
}
```

---

## 11.4 POST `/api/bookings/{id}/cancel`

### Request
```json
{
  "reason": "Meeting moved online"
}
```
`reason` optional.

### Success — 200
Booking with `status=CANCELLED`.

---

## 11.5 PATCH `/api/bookings/{id}` (optional)

### Request
```json
{
  "start_at": "2026-07-12T11:00:00+05:30",
  "end_at": "2026-07-12T12:00:00+05:30",
  "purpose": "Rescheduled standup"
}
```

Re-run overlap excluding self → 409 if conflict.

---

# 12. Error Codes

| Code | HTTP | When |
|------|------|------|
| UNAUTHORIZED | 401 | No/invalid token |
| FORBIDDEN | 403 | Cancel someone else's booking without rights |
| NOT_FOUND | 404 | Booking/asset missing |
| VALIDATION_ERROR | 422 | Bad body |
| INVALID_TIME_RANGE | 400 | end_at <= start_at |
| ASSET_NOT_SHARED | 400 | is_shared=false |
| ASSET_NOT_BOOKABLE | 400 | retired/lost/disposed (or under maintenance if you block) |
| BOOKING_OVERLAP | 409 | Time conflict |
| BOOKING_NOT_CANCELLABLE | 400 | Already cancelled (or started — if you enforce) |
| PAST_BOOKING | 400 | Optional: start_at too far in past |

---

# 13. Service Algorithms

## 13.1 `list_resources()`

```
1. query assets where is_shared == True
2. optional status filter (exclude RETIRED/DISPOSED)
3. return items
```

## 13.2 `create_booking(actor, data)`

```
1. require authenticated ACTIVE user
2. load asset by data.asset_id → NOT_FOUND
3. if not asset.is_shared → ASSET_NOT_SHARED
4. if asset.status in (RETIRED, DISPOSED, LOST) → ASSET_NOT_BOOKABLE
5. if data.end_at <= data.start_at → INVALID_TIME_RANGE
6. optional: if data.start_at < now - grace → PAST_BOOKING
7. conflicts = query bookings where
      asset_id == asset.id
      AND status != CANCELLED
      AND start_at < data.end_at
      AND end_at > data.start_at
8. if conflicts: raise BOOKING_OVERLAP (+ conflict details)
9. insert Booking(
      user_id=actor.id,
      status=UPCOMING,
      ...
   )
10. commit
11. return BookingResponse
```

**Transaction:** run overlap query + insert in one transaction; use `SELECT ... FOR UPDATE` on asset or conflicting rows if you want extra safety under concurrency.

## 13.3 `cancel_booking(actor, booking_id)`

```
1. load booking → NOT_FOUND
2. if status == CANCELLED → BOOKING_NOT_CANCELLABLE
3. if actor.id != booking.user_id and actor.role not in (ADMIN, ASSET_MANAGER):
     FORBIDDEN
4. status = CANCELLED; cancelled_at = now; cancelled_by = actor.id
5. commit
6. return DTO
```

## 13.4 `reschedule_booking(actor, booking_id, data)` (optional)

```
1. load booking, authorize like cancel
2. if CANCELLED → 400
3. validate time range
4. overlap query SAME as create but exclude booking.id
5. update fields; commit
```

## 13.5 `list_bookings(filters)`

```
1. apply asset_id, user_id, status, date intersection
2. order by start_at asc (calendar-friendly)
3. return items + total
```

---

# 14. Relationship to Allocation (Module D)

| Asset type | Module D Allocate | Module E Book |
|------------|-------------------|---------------|
| Laptop `is_shared=false` | ✅ | ❌ ASSET_NOT_SHARED |
| Room B2 `is_shared=true` | ❌ ASSET_IS_SHARED | ✅ |

**Do not** create allocations for rooms.  
**Do not** require allocation to book a room.

These are parallel custody models:
- **Allocation** = long-lived exclusive possession  
- **Booking** = time-boxed shared use  

---

# 15. Asset Status Policy

## 15.1 Recommended MVP (simplest)

| Asset status | Can book? |
|--------------|-----------|
| AVAILABLE | Yes |
| ALLOCATED | N/A for shared (shared not allocated) |
| UNDER_MAINTENANCE | **No** (room closed for repair) |
| RESERVED | Skip using this status |
| RETIRED / DISPOSED / LOST | No |

Keep shared rooms **AVAILABLE** even with future bookings.  
Time conflicts live **only** in `bookings` table.

## 15.2 What NOT to do in MVP

- Flip asset to RESERVED for every booking (complex multi-booking)  
- Block booking because another day has a booking  
- Change asset status on cancel  

---

# 16. List, Filters & Calendar Queries

## 16.1 Day calendar (Screen 6)

FE needs: all bookings for resource X on date D.

```
GET /api/bookings?asset_id={room}&date=2026-07-12
```

Backend returns blocks for timeline 08:00–20:00 rendering.

## 16.2 My bookings

```
GET /api/bookings?user_id={me}
```
or implicit `GET /api/bookings/me` (optional alias).

## 16.3 Active bookings for dashboard

Count where:
```
status != CANCELLED
AND end_at > now
AND start_at < now + horizon  # or status in UPCOMING, ONGOING
```

---

# 17. Seed Data

Extend `seed_demo.py` after endpoints work.

## 17.1 Recommended seed booking

| Field | Value |
|-------|--------|
| asset | Conference Room B2 (AF-000003) |
| user | Priya or Arjun |
| start | today 09:00 |
| end | today 10:00 |
| purpose | Procurement standup |
| status | UPCOMING |

This enables instant demo:
1. Try 09:30–10:30 → overlap  
2. Try 10:00–11:00 → success  

## 17.2 Idempotent seed

- Delete bookings for demo asset on reseed, or  
- Skip create if identical window exists  

---

# 18. End-to-End Flows

## 18.1 Happy path + edge allow (DEMO CORE)

```
1. Login any user
2. GET /api/resources → Room B2
3. POST booking 09:00–10:00 purpose="Standup" → 201
4. POST booking 10:00–11:00 → 201 (edge OK)
5. GET /bookings?asset_id=&date=today → 2 items
```

## 18.2 Overlap reject (DEMO CORE)

```
1. Existing 09:00–10:00
2. POST 09:30–10:30 → 409 BOOKING_OVERLAP
3. Response detail clear for UI red state
```

## 18.3 Cancel frees slot

```
1. Cancel 09:00–10:00 booking
2. POST 09:30–10:30 → 201 OK
```

## 18.4 Non-shared rejected

```
1. POST booking on AF-000114 laptop
2. 400 ASSET_NOT_SHARED
```

## 18.5 Employee can book

```
1. Login Arjun (EMPLOYEE)
2. POST valid room booking → 201
```

## 18.6 Cancel permission

```
1. User A books
2. User B (employee) cancels A's booking → 403
3. AM cancels A's booking → 200
```

## 18.7 Invalid range

```
1. start == end or end < start → 400 INVALID_TIME_RANGE
```

---

# 19. Implementation Order

| Step | Task | Done when |
|------|------|-----------|
| 1 | Confirm Booking model fields/enums; migrate if needed | Schema OK |
| 2 | Schemas: BookingCreate, BookingResponse, Cancel, list wrappers | Ready |
| 3 | GET /api/resources (or document assets filter) | Lists Room B2 |
| 4 | Overlap query helper function | Unit-testable |
| 5 | POST /api/bookings + 409 payload | Create + conflict |
| 6 | GET /api/bookings filters (asset_id, date) | Calendar data |
| 7 | POST cancel | Slot frees |
| 8 | GET by id | Detail |
| 9 | Optional PATCH reschedule | Nice |
| 10 | Seed 09:00–10:00 on Room B2 | Demo ready |
| 11 | Smoke tests §20 | Green |
| 12 | **Stop → Module F Maintenance** | |

---

# 20. Smoke Tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Book Room B2 09:00–10:00 | 201 |
| 2 | Book 09:30–10:30 same room | **409 BOOKING_OVERLAP** |
| 3 | Book 10:00–11:00 same room | **201** |
| 4 | Book 08:00–09:00 | 201 (touch start) |
| 5 | Book laptop is_shared=false | 400 ASSET_NOT_SHARED |
| 6 | end_at <= start_at | 400 |
| 7 | GET bookings?asset_id&date | includes creates |
| 8 | Cancel booking | 200 CANCELLED |
| 9 | Re-book cancelled window | 201 |
| 10 | Other employee cancel your booking | 403 |
| 11 | AM cancel any | 200 |
| 12 | Exact duplicate 09:00–10:00 while active | 409 |
| 13 | Different shared asset same time | 201 both OK |
| 14 | Unauthenticated POST | 401 |

---

# 21. Definition of Done

Module E is complete when:

- [ ] Resources list shows shared assets only  
- [ ] Any active user can create a booking  
- [ ] Overlap returns **409 BOOKING_OVERLAP**  
- [ ] Adjacent slots (10:00 after 09:00–10:00) succeed  
- [ ] Non-shared assets rejected  
- [ ] Invalid time range rejected  
- [ ] Cancel works and frees slot  
- [ ] List by asset + date works for UI timeline  
- [ ] Seed has sample 09:00–10:00 booking on Room B2  
- [ ] Critical smoke tests 1–9 pass  

**Not required for E done:** reschedule, reminders, WebSockets, maintenance, audit.

---

# 22. Handoff to F / Dashboard

## Module F — Maintenance
- Shared room under maintenance → booking should fail (`ASSET_NOT_BOOKABLE`)  
- Implement that check if not already  

## Dashboard KPIs (hydrate)
| KPI | Logic |
|-----|--------|
| active_bookings | non-cancelled, end_at > now (or UPCOMING+ONGOING) |
| (optional) bookings_today | intersect today |

## Notifications (later)
- Booking confirmed  
- Booking cancelled  
- Reminder N minutes before start (optional)

---

# 23. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Closed interval causing 10:00–11:00 reject after 9–10 | Use half-open `[start,end)` |
| Only checking UI for overlap | Always server-side |
| Including CANCELLED in conflict query | Exclude CANCELLED |
| Allowing book on is_shared=false | ASSET_NOT_SHARED |
| Naive string compare on datetimes | Timezone-aware datetimes |
| Forgetting date intersection for multi-day | Use range predicate |
| Flipping asset status per booking | Keep AVAILABLE; use bookings table |
| Overlap query missing asset_id filter | Always scope to asset |
| Race two simultaneous books | Transaction + recheck |

---

# 24. Frontend Contract

| UI (Screen 6) | API |
|---------------|-----|
| Resource dropdown | GET /api/resources |
| Day timeline | GET /api/bookings?asset_id&date= |
| Book button | POST /api/bookings |
| Overlap error UI | show `detail` + optional conflicts_with |
| Cancel | POST /api/bookings/{id}/cancel |
| My bookings list | GET /api/bookings?user_id=me |

### Timeline UX tips
- Render existing bookings as blocks  
- On draft range conflict → red preview using client-side check **plus** trust server 409  
- Success toast + refetch day list  

### Demo script (with D)
1. Show laptop ASSET_HELD (Module D)  
2. Open Room B2 → existing 9–10  
3. Try 9:30–10:30 → overlap  
4. Book 10–11 → success  

---

# 25. Coding Checklist

```
[ ] 1. Booking model/enum confirmed
[ ] 2. Schemas Create / Response / List
[ ] 3. GET /api/resources
[ ] 4. overlap_exists(asset_id, start, end, exclude_id=None) helper
[ ] 5. POST /api/bookings (201 + 409)
[ ] 6. GET /api/bookings (asset_id, date, user_id, status)
[ ] 7. GET /api/bookings/{id}
[ ] 8. POST /api/bookings/{id}/cancel
[ ] 9. Optional PATCH reschedule
[ ] 10. Seed Room B2 09:00–10:00
[ ] 11. Smoke tests §20
[ ] 12. Commit
[ ] 13. Start Module F Maintenance
```

---

# 26. Suggested Commit Message

```bash
git add .
git commit -m "feat(backend): resource booking with overlap validation (Module E hero)"
```

---

# 27. Quick Reference Card

| Item | Value |
|------|--------|
| **Module** | E — Resource Booking |
| **Hero rule** | No overlapping non-cancelled bookings per asset |
| **Interval** | Half-open `[start, end)` |
| **Edge case** | 10:00 start after 09:00–10:00 → **OK** |
| **Resources** | `is_shared=true` only |
| **On create status** | UPCOMING (derive ONGOING/COMPLETED on read) |
| **Conflict code** | `BOOKING_OVERLAP` 409 |
| **Cancel** | Booker or AM/Admin |
| **Next** | Module F — Maintenance |

---

# 28. One-Page Flow Diagram

```
GET /resources  →  shared assets (Room B2)
         │
         ▼
POST /bookings { asset, start, end, purpose }
         │
         ├─ not shared ──────────────► 400 ASSET_NOT_SHARED
         ├─ end <= start ────────────► 400 INVALID_TIME_RANGE
         ├─ overlaps non-cancelled ──► 409 BOOKING_OVERLAP
         └─ OK ──────────────────────► 201 UPCOMING
                                              │
                    GET /bookings?asset&date  │
                    (calendar blocks)         │
                                              ▼
                              POST /bookings/{id}/cancel
                                              │
                                              ▼
                                         CANCELLED
                                         (slot free)
```

**Overlap check:**
```
existing.start < new.end  AND  existing.end > new.start
AND existing.status != CANCELLED
AND same asset_id
```

---

# 29. Final Demo Pairing (D + E)

| Minute | Action | Module |
|--------|--------|--------|
| 0:00 | AF-000114 held by Arjun | D seed |
| 0:30 | Allocate to Priya → 409 held by Arjun | D |
| 1:00 | Transfer approve | D |
| 1:30 | Room B2 book 9:30–10:30 → 409 overlap | **E** |
| 2:00 | Book 10:00–11:00 → OK | **E** |
| 2:30 | (later) Maintenance on projector | F |

---

**Module E success looks like:**  
Swagger: Room B2 booked 09:00–10:00; 09:30–10:30 fails with **BOOKING_OVERLAP**; 10:00–11:00 succeeds; cancel frees the morning slot.

---

*AssetFlow Module E — Resource Booking Guide*  
*Companion to Allocation Guide + Assets Guide + Backend README*  
*Next: Module F — Maintenance Workflow (approve → UNDER_MAINTENANCE)*
