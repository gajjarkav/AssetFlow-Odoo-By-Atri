# AssetFlow Backend — Full Build README
## Status · What’s Done · What To Build Next · End-to-End Logic · API Contracts

**Product:** AssetFlow — Enterprise Asset & Resource Management System  
**Stack:** FastAPI · SQLAlchemy 2.0 async · Alembic · Neon PostgreSQL · JWT · bcrypt  
**Hackathon context:** Odoo-style ERP · role-based workflows · conflict-safe allocation & booking  

This document is the **single source of truth** for the backend from the current checkpoint forward. Use it for planning, pairing with frontend, and demo readiness.

---

# Table of Contents

1. [Project Vision](#1-project-vision)
2. [Current Status (What Exists)](#2-current-status-what-exists)
3. [Gap Analysis](#3-gap-analysis)
4. [Build Order (Mandatory Sequence)](#4-build-order-mandatory-sequence)
5. [Roles & Global RBAC](#5-roles--global-rbac)
6. [Module A — Auth (DONE)](#6-module-a--auth-done)
7. [Module B — Organization Setup (NEXT)](#7-module-b--organization-setup-next)
8. [Module C — Assets](#8-module-c--assets)
9. [Module D — Allocation & Transfer (HERO)](#9-module-d--allocation--transfer-hero)
10. [Module E — Resource Booking (HERO)](#10-module-e--resource-booking-hero)
11. [Module F — Maintenance](#11-module-f--maintenance)
12. [Module G — Dashboard](#12-module-g--dashboard)
13. [Module H — Later / Optional](#13-module-h--later--optional)
14. [End-to-End Business Workflows](#14-end-to-end-business-workflows)
15. [Seed & Demo Data Pack](#15-seed--demo-data-pack)
16. [Error Codes & Response Conventions](#16-error-codes--response-conventions)
17. [Security Rules (Global)](#17-security-rules-global)
18. [Definition of Done per Phase](#18-definition-of-done-per-phase)
19. [What NOT To Build Yet](#19-what-not-to-build-yet)
20. [Runbook & Demo Script](#20-runbook--demo-script)

---

# 1. Project Vision

AssetFlow digitizes how organizations track, allocate, and maintain **physical assets** and **shared resources** (laptops, furniture, rooms, vehicles) without purchasing/invoicing/accounting.

**Core promises the backend must enforce:**

| Promise | Meaning |
|---------|---------|
| Realistic accounts | Signup = Employee only; roles assigned by Admin |
| Full asset lifecycle | Available → Allocated / Reserved / Under Maintenance / Lost / Retired / Disposed |
| No double allocation | One active holder per asset; transfer path when held |
| No booking overlap | Shared resources cannot be double-booked on overlapping slots |
| Approval before repair | Maintenance must be approved before asset flips to Under Maintenance |
| Ops visibility | KPIs, overdue returns, notifications (later) |

**Out of scope (never build):** purchasing, invoicing, accounting ledgers, multi-tenant SaaS complexity.

---

# 2. Current Status (What Exists)

## 2.1 Infrastructure — DONE

| Piece | Location / notes |
|-------|------------------|
| Settings / `.env` | JWT, DB URL, SMTP flags |
| Async DB session | SQLAlchemy 2.0 + asyncpg |
| Alembic migrations | users/departments → OTP fields → core asset tables |
| App entry + router map | FastAPI main |
| Logging | Unified logger |
| Security helpers | bcrypt hash/verify, JWT create/decode |
| Email helper | Gmail SMTP OTP (optional bonus) |
| Deps | `get_current_user`, `require_roles` |

## 2.2 ORM Models — MOSTLY DONE (schema ahead of APIs)

| Model | Purpose |
|-------|---------|
| User | Identity, role, status, dept, OTP, last_login, must_reset_password |
| Department | Hierarchy parent_id, head_id |
| Category | Asset categories + warranty |
| Asset | Inventory + status + location + shared flag (confirm fields match PS) |
| Allocation | Who holds what + expected return |
| TransferRequest | Transfer workflow between employees |
| Booking | Shared resource time slots |
| MaintenanceRequest | Repair workflow |

## 2.3 APIs — PARTIALLY DONE

### Implemented

| Area | Endpoints |
|------|-----------|
| **Auth** | signup, login, me, change password, forgot-password OTP, reset-password |
| **Employees** | list (admin), patch role, patch status |
| **Dashboard** | GET KPIs (counts; data thin until write APIs exist) |
| **Seed** | admin only (`admin@assetflow.com` / `adminpassword123`) |

### Not implemented as routers/services yet (critical path)

| Area | Missing |
|------|---------|
| Departments | CRUD APIs |
| Categories | CRUD APIs |
| Employees polish | assign department, filters, options picker |
| Assets | register, list, filter, update, history |
| Allocations | allocate, return, overdue, double-block |
| Transfers | request, approve, reject |
| Bookings | create, overlap check, cancel, list |
| Maintenance | raise, transition, status side-effects |
| Demo seed pack | depts, categories, priya/raj/am, sample assets |

---

# 3. Gap Analysis

```
DONE                          MISSING (blocks product)
────                          ───────────────────────
Auth + RBAC shell      →      Org APIs (dept/category)
User promote/status    →      Employee department assign
All core TABLES        →      Asset write/read APIs
Dashboard COUNTS       →      Allocation/Transfer RULES
                           →  Booking OVERLAP engine
                           →  Maintenance STATE machine
                           →  Full demo SEED story
```

**Important:** Having models without rule-enforcing endpoints is **not** feature-complete.  
Dashboard before create/allocate is **premature polish** — keep it, don’t expand it until heroes work.

**Verdict:** Right architecture. Next work = **Org APIs → Assets → Allocation/Transfer → Booking → Maintenance → rich seed**.

---

# 4. Build Order (Mandatory Sequence)

Build **strictly** in this order. Each step unlocks the next.

| Step | Module | Why this order |
|------|--------|----------------|
| **1** | Departments API | Users/assets need dept picklists; hierarchy/head |
| **2** | Categories API | Assets require category_id |
| **3** | Employees polish | Assign dept; picker for allocation later |
| **4** | Seed org + roles | Reproducible demo base |
| **5** | Assets API | Inventory foundation |
| **6** | Allocation + Transfer | **Hero #1** — conflict rules |
| **7** | Booking | **Hero #2** — overlap rules |
| **8** | Maintenance | Status side-effects on assets |
| **9** | Demo seed story + dashboard verify | Live KPI numbers |
| **10** | Optional: Audit, Reports, Notifications, WebSocket | Bonus |

### Do NOT start early

- Audit cycles before assets/allocations  
- Reports/export before real data  
- WebSockets before core mutations  
- More SMTP/OTP work  
- Frontend-only features without API contracts  

---

# 5. Roles & Global RBAC

## 5.1 Roles (enum — match existing)

| Role | How obtained |
|------|----------------|
| `EMPLOYEE` | Default on **signup** (forced) |
| `DEPARTMENT_HEAD` | Admin promote only |
| `ASSET_MANAGER` | Admin promote only |
| `ADMIN` | Seed (or careful admin promote) |

## 5.2 Status (users)

| Status | Effect |
|--------|--------|
| `ACTIVE` | Can login and call APIs |
| `INACTIVE` | Login blocked; existing JWT must fail on `get_current_user` |

## 5.3 Capability matrix (backend enforcement)

| Capability | EMPLOYEE | DEPT_HEAD | ASSET_MANAGER | ADMIN |
|------------|:--------:|:---------:|:-------------:|:-----:|
| Signup self | ✅ | — | — | — |
| Login / me / own password | ✅ | ✅ | ✅ | ✅ |
| Org Setup writes (dept/category) | ❌ | ❌ | ❌ | ✅ |
| Full employee directory | ❌ | ❌ | ❌* | ✅ |
| Promote role / set status | ❌ | ❌ | ❌ | ✅ |
| Employee options picker | ❌ | ✅ | ✅ | ✅ |
| Register / edit assets | ❌ | ❌ | ✅ | ✅ |
| Allocate assets | ❌ | own dept* | ✅ | ✅ |
| Approve transfers | ❌ | own dept* | ✅ | ✅ |
| Request transfer / return | own | ✅ | ✅ | ✅ |
| Book shared resources | ✅ | ✅ | ✅ | ✅ |
| Raise maintenance | ✅ | ✅ | ✅ | ✅ |
| Approve maintenance | ❌ | ❌ | ✅ | ✅ |
| View dashboard | ✅ | ✅ | ✅ | ✅ |

\*Dept-scoped rules: implement when allocation/transfer land; until then Admin + AM org-wide is acceptable MVP.

## 5.4 Auth dependencies (already exist — reuse everywhere)

| Dependency | Behavior |
|------------|----------|
| `get_current_user` | JWT → load user from DB → must be ACTIVE |
| `require_roles(...)` | 403 if role not allowed |

**Rule:** Never trust frontend role alone. Every mutating route re-checks.

---

# 6. Module A — Auth (DONE)

Documented for completeness. **Do not rebuild.**

## Endpoints

| Method | Path | Access | Logic summary |
|--------|------|--------|---------------|
| POST | `/api/auth/signup` | Public | Force role=EMPLOYEE, status=ACTIVE; hash password; unique email |
| POST | `/api/auth/login` | Public | Verify hash; reject INACTIVE; update last_login_at; return JWT |
| GET | `/api/auth/me` | Auth | Fresh user from DB |
| PATCH | `/api/auth/me/password` | Auth | Verify old → hash new; clear must_reset_password if used |
| POST | `/api/auth/forgot-password` | Public | OTP (hashed) + optional email; generic response |
| POST | `/api/auth/reset-password` | Public | Validate OTP + expiry → new password |

## Seed admin

| Field | Value |
|-------|--------|
| Email | `admin@assetflow.com` |
| Password | `adminpassword123` |
| Role | ADMIN |

## Auth invariants (must never break)

1. Signup cannot set ADMIN/AM/HEAD via body  
2. password_hash never in responses  
3. Inactive users cannot use APIs  
4. Role/status changes apply on next request via DB reload  

---

# 7. Module B — Organization Setup (NEXT)

**This is the immediate backend work.**

Screen 3 conceptually: **3 tabs** — Departments · Categories · Employees.

---

## 7.1 Departments

### Purpose
Org units; optional hierarchy; optional head; soft status.

### Expected fields (align model if needed)

| Field | Required | Notes |
|-------|----------|-------|
| id | auto UUID | |
| name | yes | unique recommended |
| code | no | e.g. ENG |
| head_id | no | FK → users |
| parent_id | no | FK → departments |
| status | yes | ACTIVE / INACTIVE default ACTIVE |
| created_at / updated_at | yes | |

### Business rules

| Rule | Detail |
|------|--------|
| Write | ADMIN only |
| Read | Any authenticated user |
| Parent | Must exist; cannot equal self |
| Head | Must exist if provided |
| Deactivate | status=INACTIVE; keep FK references |
| Hard delete | Avoid if users/assets reference dept |

### Endpoints to build

| Method | Path | Role |
|--------|------|------|
| GET | `/api/departments` | Any auth (`?status=`) |
| GET | `/api/departments/{id}` | Any auth |
| POST | `/api/departments` | ADMIN |
| PATCH | `/api/departments/{id}` | ADMIN |

### Create/Update body
```
name: string
code?: string
head_id?: uuid
parent_id?: uuid
status?: ACTIVE | INACTIVE
```

### Response
Include `head_name`, `parent_name` when useful for UI.

### Errors
- 403 non-admin write  
- 400 invalid parent/head  
- 409 duplicate name/code  

---

## 7.2 Categories

### Purpose
Asset classification (Electronics, Furniture, Vehicles, Rooms).

### Expected fields

| Field | Required | Notes |
|-------|----------|-------|
| id | auto | |
| name | yes | unique |
| description | no | |
| warranty_months | no | ≥ 0 |
| status | yes | ACTIVE / INACTIVE |
| timestamps | yes | |

### Business rules

| Rule | Detail |
|------|--------|
| Write | ADMIN only |
| Read | Any authenticated |
| Unique name | 409 on conflict |
| Soft disable | status INACTIVE |

### Endpoints to build

| Method | Path | Role |
|--------|------|------|
| GET | `/api/categories` | Any auth |
| GET | `/api/categories/{id}` | Any auth |
| POST | `/api/categories` | ADMIN |
| PATCH | `/api/categories/{id}` | ADMIN |

### Create/Update body
```
name: string
description?: string
warranty_months?: int
status?: ACTIVE | INACTIVE
```

---

## 7.3 Employees (polish existing)

### Already built
- GET list (admin)  
- PATCH role  
- PATCH status  

### Still build

| Endpoint | Who | Body / query |
|----------|-----|----------------|
| PATCH `/api/employees/{id}` | ADMIN | `name?`, `phone?`, `department_id?` |
| GET `/api/employees` filters | ADMIN | `?role&status&department_id&search` |
| GET `/api/employees/options` | ADMIN, ASSET_MANAGER, DEPARTMENT_HEAD | slim `{id, name, email, department_id, role}` |

### Rules
- Cannot self-promote via any endpoint  
- department_id must exist if set  
- Role changes only via `/role` (keep dedicated)  
- Options endpoint: no password fields; minimal PII  

### Promote flow (already exists — document for demo)
```
Admin → PATCH /employees/{id}/role { "role": "ASSET_MANAGER" }
```

### Assign department flow (new)
```
Admin → PATCH /employees/{id} { "department_id": "<engineering-uuid>" }
```

---

## 7.4 Org Setup Definition of Done

- [ ] Admin creates departments via API  
- [ ] Admin creates categories via API  
- [ ] Employee gets 403 on dept/category POST  
- [ ] Admin assigns user to department  
- [ ] Admin promotes user to AM / DEPT_HEAD  
- [ ] GET lists usable for dropdowns  
- [ ] Seed creates Engineering, Facilities, Electronics, Rooms, demo users  

---

# 8. Module C — Assets

**Build only after Org APIs work.**

## 8.1 Purpose
Central registry: register, search, filter, track lifecycle status, mark shared/bookable.

## 8.2 Expected fields

| Field | Required | Notes |
|-------|----------|-------|
| id | auto | |
| tag | auto | e.g. `AF-0001` unique server-generated |
| name | yes | |
| category_id | yes | FK categories |
| serial_number | no | unique if present |
| acquisition_date | no | |
| acquisition_cost | no | reports only, not accounting |
| condition | no | New/Good/Fair/Poor (enum or string) |
| location | no | |
| department_id | no | owning dept |
| is_shared | yes | default false; true → bookable resource |
| status | yes | see lifecycle |
| photo_url | no | optional |
| created_at / updated_at | yes | |

## 8.3 Lifecycle statuses

```
AVAILABLE
ALLOCATED
RESERVED
UNDER_MAINTENANCE
LOST
RETIRED
DISPOSED
```

**On create:** status = `AVAILABLE` (unless explicitly set by admin — prefer force AVAILABLE).

### Allowed transitions (enforce in services later)

| From | To | Trigger |
|------|-----|---------|
| AVAILABLE | ALLOCATED | allocation create |
| ALLOCATED | AVAILABLE | return |
| AVAILABLE / ALLOCATED | UNDER_MAINTENANCE | maintenance approve |
| UNDER_MAINTENANCE | AVAILABLE | maintenance resolve |
| * | LOST | audit close (later) |
| AVAILABLE | RESERVED | optional on booking |
| * | RETIRED / DISPOSED | admin patch (careful) |

## 8.4 Business rules

| Rule | Detail |
|------|--------|
| Create/Edit | ADMIN, ASSET_MANAGER |
| Read list/detail | Any authenticated (filter by role later if needed) |
| Tag | Server-generated, immutable after create |
| Category | Must be ACTIVE category |
| Shared rooms | category often Rooms + is_shared=true |
| Serial unique | 409 if conflict |

## 8.5 Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/api/assets` | Auth · query: search, category_id, status, department_id, location, is_shared |
| POST | `/api/assets` | ADMIN, ASSET_MANAGER |
| GET | `/api/assets/{id}` | Auth |
| PATCH | `/api/assets/{id}` | ADMIN, ASSET_MANAGER |
| GET | `/api/assets/{id}/history` | Auth · allocations + maintenance timeline |

### Create body
```
name: string
category_id: uuid
serial_number?: string
acquisition_date?: date
acquisition_cost?: number
condition?: string
location?: string
department_id?: uuid
is_shared?: bool
photo_url?: string
```

### Auto tag algorithm
```
next_number = max existing AF-#### + 1  (or counter table)
tag = f"AF-{next_number:04d}"
```

## 8.6 Assets Definition of Done

- [ ] AM creates asset → tag AF-0001, status AVAILABLE  
- [ ] Create Room B2 with is_shared=true  
- [ ] Filters work  
- [ ] Employee cannot create asset (403)  
- [ ] History endpoint returns empty lists initially  

---

# 9. Module D — Allocation & Transfer (HERO)

**Highest demo value after assets exist.**

## 9.1 Allocation purpose
Assign asset to employee **or** department with optional expected return date.

## 9.2 Allocation fields (typical)

| Field | Notes |
|-------|--------|
| id | UUID |
| asset_id | FK |
| employee_id | nullable if dept allocation |
| department_id | nullable if employee allocation |
| allocated_by | current user |
| allocated_at | now |
| expected_return | optional date/datetime |
| returned_at | null until return |
| return_condition_notes | on return |
| status | ACTIVE / RETURNED |

**Invariant:** At most **one ACTIVE allocation** per asset.

## 9.3 Allocation business rules

| # | Rule |
|---|------|
| 1 | Asset must exist |
| 2 | Asset status must be AVAILABLE (or no active allocation) |
| 3 | If active allocation exists → **409** with `holder_name` (and holder id) |
| 4 | On success: create ACTIVE allocation; set asset status ALLOCATED |
| 5 | Notify assignee (later); activity log (later) |
| 6 | Return: set returned_at, notes, allocation RETURNED; asset AVAILABLE |
| 7 | Overdue: ACTIVE and expected_return < today |

### Double-allocation response (critical for demo)
```
HTTP 409
{
  "detail": "Asset currently held by Priya Shah",
  "code": "ASSET_HELD",
  "holder_name": "Priya Shah",
  "holder_id": "...",
  "allocation_id": "..."
}
```
Frontend shows red panel + Transfer CTA from this payload.

## 9.4 Allocation endpoints

| Method | Path | Who | Logic |
|--------|------|-----|-------|
| GET | `/api/allocations` | Auth | filters: asset_id, employee_id, status, overdue=true |
| POST | `/api/allocations` | ADMIN, AM, (DEPT_HEAD later) | allocate |
| POST | `/api/allocations/{id}/return` | ADMIN, AM, holder | return + notes |

### Create body
```
asset_id: uuid
employee_id?: uuid
department_id?: uuid   # one of employee_id or department_id required
expected_return?: datetime
notes?: string
```

### Return body
```
condition_notes?: string
```

---

## 9.5 Transfer purpose
When asset is held, **cannot** direct re-allocate — must request transfer.

## 9.6 Transfer workflow

```
REQUESTED → APPROVED → (side effects: close old allocation, open new)
          → REJECTED
```

## 9.7 Transfer fields

| Field | Notes |
|-------|--------|
| asset_id | |
| from_user_id | current holder |
| to_user_id | target |
| reason | required |
| status | REQUESTED / APPROVED / REJECTED |
| requested_by | |
| decided_by | on approve/reject |
| timestamps | |

## 9.8 Transfer business rules

| # | Rule |
|---|------|
| 1 | Asset must have ACTIVE allocation for from_user (or from = current holder) |
| 2 | Create REQUESTED |
| 3 | Approve: ADMIN or ASSET_MANAGER (or DEPT_HEAD same dept) |
| 4 | On approve: old allocation RETURNED; new ACTIVE allocation to to_user; asset stays ALLOCATED |
| 5 | Reject: status REJECTED; asset unchanged |
| 6 | History retained via allocation rows |

## 9.9 Transfer endpoints

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/transfers` | Auth · `?status=REQUESTED` |
| POST | `/api/transfers` | Auth (holder or managers) |
| POST | `/api/transfers/{id}/approve` | ADMIN, AM, DEPT_HEAD |
| POST | `/api/transfers/{id}/reject` | ADMIN, AM, DEPT_HEAD |

### Create body
```
asset_id: uuid
to_user_id: uuid
reason: string
```

## 9.10 Allocation/Transfer Definition of Done

- [ ] Allocate free asset to Priya → ALLOCATED  
- [ ] Second allocate to Raj → **409 ASSET_HELD** with Priya’s name  
- [ ] Transfer request → approve → Raj holds asset; history has both  
- [ ] Return → AVAILABLE  
- [ ] Overdue query works for dashboard  

---

# 10. Module E — Resource Booking (HERO)

## 10.1 Purpose
Time-slot booking of **shared** assets (rooms, vehicles, shared equipment) with **no overlaps**.

## 10.2 Booking fields

| Field | Notes |
|-------|--------|
| asset_id | must have is_shared=true |
| user_id | booker |
| start_at | datetime tz |
| end_at | datetime tz |
| purpose | optional string |
| status | UPCOMING / ONGOING / COMPLETED / CANCELLED |
| created_at | |

*(ONGOING/COMPLETED can be derived from now vs start/end on read.)*

## 10.3 Overlap rule (mandatory)

Use half-open intervals **`[start, end)`**:

```
conflict if:
  existing.status != CANCELLED
  AND new_start < existing_end
  AND new_end > existing_start
```

| Example | Result |
|---------|--------|
| Existing 09:00–10:00; new 09:30–10:30 | **REJECT** |
| Existing 09:00–10:00; new 10:00–11:00 | **ALLOW** (edge touch OK) |
| end <= start | **400** invalid range |

## 10.4 Business rules

| # | Rule |
|---|------|
| 1 | Asset exists and is_shared=true |
| 2 | end_at > start_at |
| 3 | Overlap check server-side always |
| 4 | On create: status UPCOMING (or derive) |
| 5 | Cancel: status CANCELLED; slot freed |
| 6 | All active roles can book (typical) |

## 10.5 Endpoints

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/resources` | Auth · assets where is_shared=true |
| GET | `/api/bookings` | Auth · `?asset_id&date=` |
| POST | `/api/bookings` | Auth |
| POST | `/api/bookings/{id}/cancel` | Booker or managers |
| PATCH | `/api/bookings/{id}` | Reschedule + re-validate overlap |

### Create body
```
asset_id: uuid
start_at: datetime
end_at: datetime
purpose?: string
```

### Overlap error
```
HTTP 409
{
  "detail": "Time slot overlaps an existing booking",
  "code": "BOOKING_OVERLAP"
}
```

## 10.6 Booking Definition of Done

- [ ] Book Room B2 09:00–10:00 OK  
- [ ] Book 09:30–10:30 → 409  
- [ ] Book 10:00–11:00 OK  
- [ ] Cancel frees slot  

---

# 11. Module F — Maintenance

## 11.1 Purpose
Route repairs through approval before work starts; flip asset status.

## 11.2 Status workflow

```
PENDING
  → APPROVED  (Asset Manager / Admin)  ⇒ asset.UNDER_MAINTENANCE
  → REJECTED  (asset unchanged)
APPROVED → TECHNICIAN_ASSIGNED → IN_PROGRESS → RESOLVED
  ⇒ on RESOLVED: asset.AVAILABLE (if was under maintenance)
```

MVP may collapse TECHNICIAN_ASSIGNED into notes on APPROVED.

## 11.3 Fields

| Field | Notes |
|-------|--------|
| asset_id | |
| raised_by | current user |
| description | required |
| priority | LOW / MEDIUM / HIGH / CRITICAL |
| status | workflow enum |
| technician_name | optional |
| photo_url | optional |
| created_at / resolved_at | |

## 11.4 Endpoints

| Method | Path | Who |
|--------|------|-----|
| GET | `/api/maintenance` | Auth · `?status=` |
| POST | `/api/maintenance` | Any auth |
| POST | `/api/maintenance/{id}/transition` | Role by target status |

### Transition body
```
to: APPROVED | REJECTED | TECHNICIAN_ASSIGNED | IN_PROGRESS | RESOLVED
technician_name?: string
```

### Transition authorization
| To | Who |
|----|-----|
| APPROVED / REJECTED | ADMIN, ASSET_MANAGER |
| TECHNICIAN_ASSIGNED / IN_PROGRESS / RESOLVED | ADMIN, ASSET_MANAGER |

## 11.5 Side effects (must be in service layer)

| Event | Asset status |
|-------|----------------|
| Approve | UNDER_MAINTENANCE |
| Resolve | AVAILABLE |
| Reject | unchanged |

## 11.6 Maintenance Definition of Done

- [ ] Employee raises request → PENDING  
- [ ] AM approves → asset UNDER_MAINTENANCE  
- [ ] AM resolves → asset AVAILABLE  
- [ ] Invalid transition → 400  

---

# 12. Module G — Dashboard

## 12.1 Current state
`GET /api/dashboard` exists with KPI counts.

## 12.2 Required KPI payload

| KPI | Logic |
|-----|--------|
| assets_available | count status=AVAILABLE |
| assets_allocated | count status=ALLOCATED |
| maintenance_today / open_maintenance | open maintenance requests (define clearly) |
| active_bookings | not cancelled; upcoming/ongoing |
| pending_transfers | status=REQUESTED |
| upcoming_returns | ACTIVE allocations expected_return >= today |
| overdue_returns | ACTIVE allocations expected_return < today |

Also useful:
```
overdue: [ { allocation_id, asset_tag, holder_name, expected_return } ]
recent_activity: [ ... ]  // when activity_log exists
```

## 12.3 When to polish
**After** Steps 5–8 produce real rows. Do not expand dashboard before allocations/bookings work.

## 12.4 Access
Any authenticated user (optional: scope by role later).

---

# 13. Module H — Later / Optional

Build only if heroes work and time remains.

| Module | Endpoints / logic | Priority |
|--------|-------------------|----------|
| **Audit cycles** | create cycle, mark verified/missing/damaged, close → LOST | P1 |
| **Notifications** | list, mark read; write on events | P1 |
| **Activity logs** | append-only who/what/when | P1 |
| **Reports** | utilization, maintenance frequency, CSV export | P1 |
| **WebSockets** | push notifications live | P2 winning polish |
| **Asset photos upload** | multipart | P3 |

### Audit (brief contract for later)

```
POST /api/audits
GET  /api/audits/{id}
POST /api/audits/{id}/items   { asset_id, result: VERIFIED|MISSING|DAMAGED }
POST /api/audits/{id}/close   # missing → asset LOST
GET  /api/audits/{id}/discrepancies
```

---

# 14. End-to-End Business Workflows

## 14.1 Company bootstrap (Admin)

```
1. Seed/login admin
2. Create departments (Engineering, Facilities, …)
3. Create categories (Electronics, Rooms, …)
4. Users signup OR seed employees
5. Admin assigns departments
6. Admin promotes Asset Manager + Department Head
7. Set department.head_id for Engineering
```

## 14.2 Asset lifecycle happy path

```
1. AM registers "Dell Laptop" → AF-0001 AVAILABLE
2. AM allocates to Priya + expected_return
   → asset ALLOCATED
3. Raj tries allocate same asset
   → 409 ASSET_HELD holder=Priya
4. Transfer requested Priya → Raj → AM approves
   → Raj active allocation
5. Raj returns with condition notes
   → asset AVAILABLE
```

## 14.3 Shared room booking path

```
1. AM registers "Conference Room B2" is_shared=true AVAILABLE
2. User books 09:00–10:00 → OK
3. User books 09:30–10:30 → 409 BOOKING_OVERLAP
4. User books 10:00–11:00 → OK
5. Cancel first booking → slot free
```

## 14.4 Maintenance path

```
1. Employee raises maintenance on Projector
2. AM approves → asset UNDER_MAINTENANCE
3. AM resolves → asset AVAILABLE
```

## 14.5 Full judge demo path (5 minutes)

| Time | Action | API proof |
|------|--------|-----------|
| 0:00 | Login admin / AM | JWT |
| 0:30 | Show depts/categories | GET lists |
| 1:00 | Show AF-0114 allocated to Priya | seed or allocate |
| 1:30 | Try allocate to Raj | **409 holder name** |
| 2:00 | Transfer approve | history updates |
| 2:30 | Book room overlap fail | **409 overlap** |
| 3:00 | Adjacent slot OK | 201 |
| 3:30 | Maintenance approve | status UNDER_MAINTENANCE |
| 4:00 | Dashboard KPIs non-zero | GET dashboard |
| 4:30 | Stop | |

---

# 15. Seed & Demo Data Pack

## 15.1 Now
- Admin only  

## 15.2 After Org APIs — extend seed

### Departments
| Name | Code | Parent |
|------|------|--------|
| Engineering | ENG | — |
| Facilities | FAC | — |
| Field Ops | FIELD | — |
| Field Ops East | FIELD-E | Field Ops |

### Categories
| Name | warranty_months |
|------|-----------------|
| Electronics | 12 |
| Furniture | null |
| Vehicles | 24 |
| Rooms | null |

### Users
| Email | Password | Role | Department |
|-------|----------|------|------------|
| admin@assetflow.com | adminpassword123 | ADMIN | — |
| am@assetflow.com | am123456 | ASSET_MANAGER | Facilities |
| head@assetflow.com | head123456 | DEPARTMENT_HEAD | Engineering (also head_id) |
| priya@assetflow.com | priya123456 | EMPLOYEE | Engineering |
| raj@assetflow.com | raj123456 | EMPLOYEE | Engineering |

## 15.3 After Assets + Allocation APIs — story seed

| Asset | Tag | Flags | State |
|-------|-----|-------|-------|
| Dell Laptop | AF-0114 | not shared | Allocated to **Priya** |
| Projector | AF-0062 | optional shared | AVAILABLE or pending maintenance |
| Conference Room B2 | AF-ROOM-B2 or AF-00xx | **is_shared=true** | AVAILABLE + booking 09:00–10:00 |
| Office Chair | AF-0201 | — | AVAILABLE |

Extra:
- One allocation with `expected_return` yesterday → **overdue**  
- One maintenance PENDING  
- One transfer REQUESTED (optional)

**One command:** `python seed_demo.py` (or extend existing seed) should reset demo universe.

---

# 16. Error Codes & Response Conventions

## 16.1 Standard error shape
```json
{
  "detail": "Human readable message",
  "code": "MACHINE_CODE"
}
```

## 16.2 Codes to use consistently

| Code | HTTP | When |
|------|------|------|
| INVALID_CREDENTIALS | 401 | Login fail |
| UNAUTHORIZED | 401 | Missing/bad/expired token |
| ACCOUNT_INACTIVE | 403 | User INACTIVE |
| FORBIDDEN | 403 | Wrong role |
| NOT_FOUND | 404 | Bad id |
| EMAIL_EXISTS | 409 | Signup duplicate |
| DUPLICATE_NAME | 409 | Dept/category/tag/serial |
| ASSET_HELD | 409 | Double allocation |
| BOOKING_OVERLAP | 409 | Slot conflict |
| INVALID_TRANSITION | 400 | Bad maintenance/asset status change |
| VALIDATION_ERROR | 422 | Pydantic |
| INVALID_PARENT | 400 | Department parent |
| INVALID_DEPARTMENT | 400 | Bad dept FK |

---

# 17. Security Rules (Global)

1. Passwords only as bcrypt hashes  
2. JWT secret from env; stable across reloads  
3. CORS allow frontend origin (e.g. Vite 5173)  
4. Signup ignores client-supplied role/status  
5. Admin-only for org writes and role changes  
6. Re-load user from DB every request (role/status truth)  
7. Never return password_hash, reset_otp  
8. IDOR: employees should not return others’ allocations as self without rights  
9. All conflict rules enforced **server-side**  
10. `.env` never committed  

---

# 18. Definition of Done per Phase

## Phase 1 — Org (NEXT)
- [ ] Departments CRUD  
- [ ] Categories CRUD  
- [ ] Employee PATCH dept + filters + options  
- [ ] Org seed  
- [ ] Swagger smoke green  

## Phase 2 — Assets
- [ ] Register with auto tag  
- [ ] List/filter/get/patch  
- [ ] AM can create; employee cannot  
- [ ] Shared room asset exists  

## Phase 3 — Heroes
- [ ] Allocation + 409 holder  
- [ ] Return  
- [ ] Transfer approve path  
- [ ] Booking overlap  
- [ ] Maintenance approve/resolve status flips  

## Phase 4 — Demo ready
- [ ] Full seed story  
- [ ] Dashboard non-zero meaningful KPIs  
- [ ] README accounts + 5-min script  
- [ ] No crash on demo path  

## Phase 5 — Bonus
- [ ] Audit / reports / notifications / WS  

---

# 19. What NOT To Build Yet

| Item | Why wait |
|------|----------|
| More OTP/SMTP polish | Auth already sufficient |
| Dashboard redesign | Needs real data first |
| Audit module | After assets + maintenance |
| PDF/Excel reports | After core flows |
| WebSockets | After mutations stable |
| File upload to cloud | Optional photo_url string enough |
| Purchasing / accounting | Out of PS scope |
| Microservices | Wrong complexity |

---

# 20. Runbook & Demo Script

## 20.1 Run backend
```powershell
.venv\Scripts\activate
uvicorn src.main:app --reload
```
- API: `http://127.0.0.1:8000`  
- Docs: `http://127.0.0.1:8000/api/docs`  

## 20.2 Env essentials
```env
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
SMTP_ENABLED=false   # true only if Gmail configured
```

## 20.3 Seed
```powershell
python seed_admin.py
# later:
python seed_demo.py
```

## 20.4 Immediate next coding tasks (checklist)

```
[ ] 1. endpoints/departments.py + schemas + service + router include
[ ] 2. endpoints/categories.py + schemas + service + router include
[ ] 3. employees: PATCH profile, filters, /options
[ ] 4. seed_org / extend seed_admin
[ ] 5. endpoints/assets.py + auto tag service
[ ] 6. endpoints/allocations.py + ASSET_HELD rule
[ ] 7. endpoints/transfers.py + approve side effects
[ ] 8. endpoints/bookings.py + overlap rule
[ ] 9. endpoints/maintenance.py + status transitions
[ ] 10. seed_demo story + verify dashboard
```

## 20.5 Smoke tests (minimum)

| # | Call | Expect |
|---|------|--------|
| 1 | Login admin | 200 token |
| 2 | POST department as employee | 403 |
| 3 | POST department as admin | 201 |
| 4 | POST category | 201 |
| 5 | POST asset as AM | 201 + tag |
| 6 | Allocate twice | second 409 ASSET_HELD |
| 7 | Overlap booking | 409 |
| 8 | Approve maintenance | asset UNDER_MAINTENANCE |

---

# 21. Architecture Reminder

```
Router (HTTP)
   → deps: get_current_user / require_roles
   → Service (BUSINESS RULES LIVE HERE)
   → ORM / DB
   → optional: notify / activity_log / ws_broadcast
```

**Do not put double-allocation or overlap checks only in the frontend.**  
Services own truth.

---

# 22. One-Page Status Snapshot

| Module | Models | APIs | Rules | Seed |
|--------|:------:|:----:|:-----:|:----:|
| Auth | ✅ | ✅ | ✅ | Admin ✅ |
| Departments | ✅ | ❌ NEXT | — | ❌ |
| Categories | ✅ | ❌ NEXT | — | ❌ |
| Employees | ✅ | ⚠️ partial | ✅ role/status | thin |
| Assets | ✅ | ❌ | — | ❌ |
| Allocation | ✅ | ❌ | ❌ | ❌ |
| Transfer | ✅ | ❌ | ❌ | ❌ |
| Booking | ✅ | ❌ | ❌ | ❌ |
| Maintenance | ✅ | ❌ | ❌ | ❌ |
| Dashboard | — | ✅ early | — | empty |

---

# 23. Final Guidance

> **You are on the right architecture.**  
> **You are behind on product APIs relative to models.**  
> **Next concrete build: Departments → Categories → Employee polish → Seed org → Assets → Allocation/Transfer → Booking → Maintenance.**

Win condition for the hackathon backend:

1. **ASSET_HELD** works with holder name  
2. **BOOKING_OVERLAP** works with edge-equal allow  
3. Maintenance flips asset status  
4. Seeded demo path runs without manual SQL  
5. RBAC never lets employee self-elevate or write org setup  

---

*AssetFlow Backend README · Use with Auth Guide + Org Setup Guide · Update this file as each phase completes.*
