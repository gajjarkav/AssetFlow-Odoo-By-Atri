# AssetFlow — Module C: Assets API
## Deep Dive Guide · Registration · Lifecycle · Filters · Shared/Bookable · Logic & Contracts

**Prerequisite:** Module A (Auth) ✅ · Module B (Org Setup) ✅  
**This module:** Asset Registration & Directory (Screen 4 + Asset Detail)  
**Next after this:** Module D — Allocation & Transfer (Hero #1)  
**Stack context:** FastAPI · async SQLAlchemy · your existing `Asset` model + migration  

---

# Table of Contents

1. [Why Assets Now](#1-why-assets-now)
2. [Product Scope](#2-product-scope)
3. [Dependencies From Org](#3-dependencies-from-org)
4. [Data Model (Fields)](#4-data-model-fields)
5. [Lifecycle Status Machine](#5-lifecycle-status-machine)
6. [Auto Asset Tag](#6-auto-asset-tag)
7. [Business Rules](#7-business-rules)
8. [RBAC](#8-rbac)
9. [API Catalog](#9-api-catalog)
10. [Request / Response Contracts](#10-request--response-contracts)
11. [List Filters & Search](#11-list-filters--search)
12. [Asset Detail & History](#12-asset-detail--history)
13. [Shared / Bookable Flag](#13-shared--bookable-flag)
14. [Validation & Error Codes](#14-validation--error-codes)
15. [Service-Layer Logic (Algorithms)](#15-service-layer-logic-algorithms)
16. [What PATCH May Change (and What Not)](#16-what-patch-may-change-and-what-not)
17. [Seed Data for Assets](#17-seed-data-for-assets)
18. [End-to-End Flows](#18-end-to-end-flows)
19. [Implementation Order](#19-implementation-order)
20. [Smoke Tests](#20-smoke-tests)
21. [Definition of Done](#21-definition-of-done)
22. [Handoff to Module D/E/F](#22-handoff-to-moduled-ef)
23. [Common Mistakes](#23-common-mistakes)
24. [Frontend Contract Notes](#24-frontend-contract-notes)

---

# 1. Why Assets Now

```
Auth ✅
Org (Departments, Categories, Employees) ✅
        ↓
   ASSETS  ← YOU ARE HERE
        ↓
Allocation / Transfer  (needs asset_id + AVAILABLE status)
Booking                (needs is_shared=true assets)
Maintenance            (needs asset_id + status side-effects)
Dashboard KPIs         (counts by asset status)
```

Without Assets APIs:
- Allocation has nothing to allocate  
- Booking has no Room B2  
- Maintenance has no projector  
- Dashboard stays zeros  

**Org created picklists. Assets consume them.**

---

# 2. Product Scope

## 2.1 In scope for Module C

| Capability | Description |
|------------|-------------|
| Register asset | Name, category, auto tag, serial, cost, condition, location, dept, shared flag |
| List / search / filter | Tag, serial, name, category, status, department, location, shared |
| Get detail | Full record + current status |
| Update metadata | Location, condition, dept, shared, etc. (controlled) |
| Lifecycle status field | Present on every asset; default AVAILABLE on create |
| History stub | Endpoint for allocation + maintenance history (can return empty until D/F) |
| RBAC | Only ADMIN + ASSET_MANAGER create/edit |

## 2.2 Out of scope for Module C (do later)

| Capability | Module |
|------------|--------|
| Allocate / return / double-block | D |
| Transfer workflow | D |
| Booking + overlap | E |
| Maintenance transitions | F |
| Audit → LOST | Later |
| Photo file upload to disk/S3 | Optional; `photo_url` string enough |
| QR camera scanning | Search by tag text is enough |
| Accounting / depreciation | Out of product scope |

## 2.3 Screens this module powers

| Screen | Backend needs |
|--------|----------------|
| Screen 4 — Asset Directory | GET list + filters + POST register |
| Asset Detail | GET by id + history |
| Quick action “Register Asset” on Dashboard | POST |
| Later Screen 5 | GET asset status / current holder (holder comes from Allocation in D) |
| Later Screen 6 | GET resources = assets where is_shared=true |

---

# 3. Dependencies From Org

Assets **must not** invent categories or departments.

| On create/update | Validation |
|------------------|------------|
| `category_id` | Must exist in `categories`; prefer status ACTIVE |
| `department_id` | Optional; if set, must exist in `departments` |
| Actor | Must be ADMIN or ASSET_MANAGER |

**Pre-seed required before useful asset testing:**
- At least categories: **Electronics**, **Rooms** (Furniture optional)
- At least one department: **Engineering** / **Facilities**
- User: **Asset Manager** (Raj in your seed) + Admin

If category missing → 400, not silent null.

---

# 4. Data Model (Fields)

Align with your existing `Asset` model / migration. If a field is missing in DB, add a small migration **before** coding endpoints.

## 4.1 Core columns

| Column | Type | Null | Default | Notes |
|--------|------|------|---------|-------|
| `id` | UUID | NO | generated | PK |
| `tag` | String | NO | **server auto** | Unique, e.g. `AF-0001` |
| `name` | String | NO | — | Display name |
| `category_id` | UUID FK → categories | NO | — | Required |
| `serial_number` | String | YES | null | Unique if present |
| `acquisition_date` | Date | YES | null | |
| `acquisition_cost` | Numeric/Float | YES | null | Reports only — not accounting |
| `condition` | String or Enum | YES | null | See §4.2 |
| `location` | String | YES | null | Free text or controlled later |
| `department_id` | UUID FK → departments | YES | null | Owning / home dept |
| `is_shared` | Boolean | NO | **false** | Bookable when true |
| `status` | Enum | NO | **AVAILABLE** | See §5 |
| `photo_url` | String | YES | null | URL or path string |
| `created_at` | DateTime(tz) | NO | now | |
| `updated_at` | DateTime(tz) | YES | null | On change |
| `created_by` | UUID FK → users | YES | actor id | Optional but useful |

## 4.2 Condition values (recommended enum or constrained strings)

| Value | Meaning |
|-------|---------|
| `NEW` | Brand new |
| `GOOD` | Normal use |
| `FAIR` | Wear present |
| `POOR` | Needs attention |

Accept case-consistent enums matching your project style (`NEW` not `new` if you use UPPER enums elsewhere).

## 4.3 Status values (must match allocation/maintenance later)

| Value | Meaning |
|-------|---------|
| `AVAILABLE` | Free to allocate or book (if shared) |
| `ALLOCATED` | Held by employee/dept (set in Module D) |
| `RESERVED` | Optional: held by booking window (Module E optional) |
| `UNDER_MAINTENANCE` | Repair approved (Module F) |
| `LOST` | Audit confirmed missing (later) |
| `RETIRED` | End of life, not operational |
| `DISPOSED` | Removed from inventory |

## 4.4 Indexes / constraints

| Constraint | Why |
|------------|-----|
| UNIQUE `tag` | Identity of asset |
| UNIQUE `serial_number` where not null | Prevent duplicate hardware IDs |
| INDEX status, category_id, department_id | Fast filters |
| FK category_id, department_id | Referential integrity |

## 4.5 Derived / response-only fields (not necessarily DB columns)

| Field | Source |
|-------|--------|
| `category_name` | join categories |
| `department_name` | join departments |
| `current_holder_name` | join active allocation (Module D; null for now) |
| `current_holder_id` | same |

For Module C, holder fields can be **null always** until Allocation exists — still include keys in response schema for frontend stability.

---

# 5. Lifecycle Status Machine

## 5.1 State diagram

```
                 ┌──────────────┐
                 │   AVAILABLE  │◄──────────────────────┐
                 └──────┬───────┘                       │
           allocate     │        return                 │
           (Module D)   │        (Module D)             │
                        ▼                               │
                 ┌──────────────┐                       │
                 │  ALLOCATED   │───────────────────────┤
                 └──────┬───────┘                       │
                        │ maintenance approve (F)       │
                        ▼                               │
                 ┌──────────────────┐    resolve (F)    │
                 │ UNDER_MAINTENANCE│───────────────────┘
                 └────────┬─────────┘
                          │ audit missing (later)
                          ▼
                 ┌──────────────┐
                 │     LOST     │
                 └──────────────┘

  AVAILABLE ──admin──► RETIRED / DISPOSED
  AVAILABLE ──optional booking──► RESERVED ──► AVAILABLE
```

## 5.2 Module C responsibilities for status

| Action | Status behavior |
|--------|-----------------|
| **Create** | Always set `AVAILABLE` (ignore client status if sent) |
| **PATCH** | Generally **do not** allow arbitrary status jumps |
| **Exception** | Optional admin-only: set RETIRED / DISPOSED from AVAILABLE (or from non-allocated states) |
| **ALLOCATED / UNDER_MAINTENANCE** | Set only by later modules’ services |

**Why:** If clients can PATCH status to AVAILABLE while an allocation is active, you corrupt hero rules. Keep status transitions in domain services.

## 5.3 Recommended PATCH policy for status

| From | Allowed manual PATCH to | Who |
|------|-------------------------|-----|
| AVAILABLE | RETIRED, DISPOSED | ADMIN (or AM) |
| RETIRED | AVAILABLE (reactivate) | ADMIN only — optional |
| ALLOCATED | **none via Assets PATCH** | Allocation module only |
| UNDER_MAINTENANCE | **none via Assets PATCH** | Maintenance module only |

If simpler for hackathon: **Assets PATCH never accepts `status`** until Module D/F exist; only system services update status.

---

# 6. Auto Asset Tag

## 6.1 Format

```
AF-0001
AF-0002
...
AF-0114
```

| Part | Rule |
|------|------|
| Prefix | `AF-` fixed |
| Number | Integer, zero-padded to 4 digits minimum |
| Uniqueness | DB unique constraint |
| Client input | **Ignored** — never trust client-supplied tag on create |

## 6.2 Generation algorithm (service)

```
1. Begin transaction
2. Find max numeric suffix among tags matching ^AF-(\d+)$
   OR use a dedicated counters table (cleaner under concurrency)
3. next = max + 1  (if none, next = 1)
4. tag = f"AF-{next:04d}"
5. Insert asset with tag
6. On unique violation race → retry once or twice
```

## 6.3 Rules

| Rule | Detail |
|------|--------|
| Immutable | Do not allow PATCH to change tag |
| Display | Always show tag in lists |
| Search | search query matches tag (case-insensitive) |
| Seed | Seed may set explicit tags like AF-0114 for demo story — OK if inserted by seed with known tags |

## 6.4 Optional QR

Problem statement mentions QR search. For Module C:
- Treat QR payload as **tag string** in `search` query  
- No camera API required on backend  

---

# 7. Business Rules

## 7.1 Create rules

| # | Rule |
|---|------|
| 1 | Actor role ∈ {ADMIN, ASSET_MANAGER} |
| 2 | `name` required non-empty |
| 3 | `category_id` required and exists |
| 4 | Category should be ACTIVE (reject INACTIVE) |
| 5 | `department_id` optional; if set, department exists |
| 6 | `serial_number` optional; if set, unique |
| 7 | `is_shared` default false |
| 8 | `status` forced AVAILABLE |
| 9 | `tag` auto-generated |
| 10 | `created_by` = current user id (if column exists) |
| 11 | acquisition_cost ≥ 0 if provided |
| 12 | Ignore client `tag` and client `status` on create |

## 7.2 Update rules

| # | Rule |
|---|------|
| 1 | Actor role ∈ {ADMIN, ASSET_MANAGER} |
| 2 | Asset must exist |
| 3 | Cannot change `tag` |
| 4 | Cannot change `id` |
| 5 | category_id if changed → must exist/ACTIVE |
| 6 | serial_number uniqueness if changed |
| 7 | Prefer not allowing free status edits (see §5.3) |
| 8 | Updating is_shared: careful if active bookings exist later (Module E) — for now allow if status AVAILABLE |
| 9 | Set updated_at = now |

## 7.3 Read rules

| # | Rule |
|---|------|
| 1 | Any ACTIVE authenticated user can list/get (MVP) |
| 2 | Optional later: employees see only own dept / allocated assets |
| 3 | Soft-hidden: none — use status RETIRED/DISPOSED filters instead of delete |

## 7.4 Delete rules

| Recommendation | Why |
|----------------|-----|
| **No hard DELETE** in hackathon | History + FK from allocations/bookings |
| Use RETIRED / DISPOSED | Keeps audit trail |
| If DELETE allowed | Only when no related allocations/bookings/maintenance |

---

# 8. RBAC

| Action | EMPLOYEE | DEPARTMENT_HEAD | ASSET_MANAGER | ADMIN |
|--------|:--------:|:---------------:|:-------------:|:-----:|
| List assets | ✅ | ✅ | ✅ | ✅ |
| Get asset detail | ✅ | ✅ | ✅ | ✅ |
| Get history | ✅ | ✅ | ✅ | ✅ |
| Register asset | ❌ | ❌ | ✅ | ✅ |
| Update asset | ❌ | ❌ | ✅ | ✅ |
| Retire/dispose (if allowed) | ❌ | ❌ | ✅/⚠️ | ✅ |

**Frontend:** hide “Register Asset” unless AM/Admin.  
**Backend:** enforce with `require_roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)`.

---

# 9. API Catalog

Base prefix: `/api`  
Auth header: `Authorization: Bearer <token>`

| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| GET | `/api/assets` | Yes | Any active | List + filter |
| POST | `/api/assets` | Yes | ADMIN, ASSET_MANAGER | Register |
| GET | `/api/assets/{id}` | Yes | Any active | Detail |
| PATCH | `/api/assets/{id}` | Yes | ADMIN, ASSET_MANAGER | Update |
| GET | `/api/assets/{id}/history` | Yes | Any active | Timeline stub |

**Optional later (not required for Module C done):**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/resources` | Alias: assets with `is_shared=true` (or wait for Booking module) |

Recommendation: implement `GET /api/assets?is_shared=true` now; add `/resources` alias in Module E if you want cleaner booking UX.

---

# 10. Request / Response Contracts

## 10.1 POST `/api/assets` — Register

### Request body
```json
{
  "name": "Dell Laptop",
  "category_id": "uuid",
  "serial_number": "SN-ABC-001",
  "acquisition_date": "2026-01-15",
  "acquisition_cost": 75000,
  "condition": "GOOD",
  "location": "Longhorn",
  "department_id": "uuid-or-null",
  "is_shared": false,
  "photo_url": null
}
```

### Success — 201 Created
```json
{
  "id": "uuid",
  "tag": "AF-0001",
  "name": "Dell Laptop",
  "category_id": "uuid",
  "category_name": "Electronics",
  "serial_number": "SN-ABC-001",
  "acquisition_date": "2026-01-15",
  "acquisition_cost": 75000,
  "condition": "GOOD",
  "location": "Longhorn",
  "department_id": "uuid",
  "department_name": "Engineering",
  "is_shared": false,
  "status": "AVAILABLE",
  "photo_url": null,
  "current_holder_id": null,
  "current_holder_name": null,
  "created_at": "2026-07-12T10:00:00Z",
  "updated_at": null
}
```

## 10.2 GET `/api/assets` — List

### Query params
See [§11](#11-list-filters--search).

### Success — 200
```json
{
  "items": [ /* AssetResponse[] */ ],
  "total": 42
}
```
Or bare array if you prefer simpler hackathon style — **pick one and stick**.  
Recommended: `{ items, total }` for frontend pagination later.

## 10.3 GET `/api/assets/{id}` — Detail

### Success — 200
Same shape as create response (full AssetResponse).

### Error — 404
```json
{ "detail": "Asset not found", "code": "NOT_FOUND" }
```

## 10.4 PATCH `/api/assets/{id}` — Update

### Request body (all optional)
```json
{
  "name": "Dell Laptop XPS",
  "category_id": "uuid",
  "serial_number": "SN-ABC-001",
  "acquisition_date": "2026-01-15",
  "acquisition_cost": 78000,
  "condition": "FAIR",
  "location": "4th Floor",
  "department_id": null,
  "is_shared": false,
  "photo_url": "https://..."
}
```

**Do not accept (recommended):** `tag`, `status` (or status only with strict policy §5.3).

### Success — 200
Full AssetResponse.

## 10.5 GET `/api/assets/{id}/history`

### Success — 200 (Module C stub OK)
```json
{
  "asset_id": "uuid",
  "tag": "AF-0001",
  "allocations": [],
  "maintenance": [],
  "transfers": []
}
```

When Module D/F exist, fill arrays newest-first:

**allocation item example**
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee_name": "Priya Shah",
  "department_id": null,
  "allocated_at": "...",
  "expected_return": "...",
  "returned_at": null,
  "status": "ACTIVE"
}
```

**maintenance item example**
```json
{
  "id": "uuid",
  "description": "Screen flicker",
  "priority": "HIGH",
  "status": "PENDING",
  "created_at": "..."
}
```

---

# 11. List Filters & Search

## 11.1 Query parameters

| Param | Type | Behavior |
|-------|------|----------|
| `search` | string | ILIKE match on tag, name, serial_number |
| `category_id` | uuid | exact |
| `status` | enum | exact |
| `department_id` | uuid | exact |
| `location` | string | ILIKE or exact |
| `is_shared` | bool | true/false |
| `skip` / `limit` | int | pagination optional (default limit 50–100) |
| `sort` | string | optional: `created_at_desc` default |

## 11.2 Examples

```
GET /api/assets
GET /api/assets?status=AVAILABLE
GET /api/assets?category_id=<electronics-uuid>
GET /api/assets?is_shared=true
GET /api/assets?search=AF-0001
GET /api/assets?search=laptop&status=AVAILABLE
GET /api/assets?department_id=<eng-uuid>&status=ALLOCATED
```

## 11.3 Default sort
Newest first: `created_at DESC` or `tag ASC` — document choice.  
Recommendation: `created_at DESC` for directory “recent registrations.”

---

# 12. Asset Detail & History

## 12.1 Detail page data needs

| UI block | API fields |
|----------|------------|
| Header | tag, name, status badge, is_shared |
| Meta | category_name, serial, cost, condition, location, department_name |
| Holder | current_holder_name (null until D) |
| Actions | Allocate / Book / Raise maintenance — frontend role-gated; APIs come later |
| History tabs | `/history` |

## 12.2 History endpoint strategy

| Phase | Behavior |
|-------|----------|
| Module C | Return empty arrays — endpoint exists |
| Module D | Populate allocations (+ transfers if desired) |
| Module F | Populate maintenance |
| Combined | Single history endpoint preferred over 3 calls |

---

# 13. Shared / Bookable Flag

## 13.1 Meaning

| `is_shared` | Meaning | Used by |
|-------------|---------|---------|
| `false` | Personal/assignable equipment (laptop, chair) | Allocation |
| `true` | Shared resource (room, pool vehicle, shared projector) | **Booking** |

## 13.2 Rules

| Rule | Detail |
|------|--------|
| Default | false |
| Room B2 | Create with category Rooms + `is_shared=true` |
| Can a shared asset also be allocated? | Prefer **no** for simplicity: shared → booking only; non-shared → allocation only |
| Enforcement | Module D: reject allocate if is_shared=true (recommended) |
| Enforcement | Module E: reject book if is_shared=false |

**Module C only stores the flag.** Cross-module enforcement lands in D/E services.

## 13.3 Listing bookable resources

```
GET /api/assets?is_shared=true&status=AVAILABLE
```

Note: Bookable assets might still be AVAILABLE while having future bookings — booking module tracks slots separately. Status RESERVED is optional complexity; many hackathon apps keep shared assets AVAILABLE and rely on booking table only.

**Recommendation for speed:**  
- Shared assets stay `AVAILABLE` status  
- Overlap engine uses `bookings` table only  
- Skip RESERVED status unless you have spare time  

---

# 14. Validation & Error Codes

## 14.1 Error shape
```json
{
  "detail": "Human readable message",
  "code": "MACHINE_CODE"
}
```

## 14.2 Codes for Module C

| Code | HTTP | When |
|------|------|------|
| UNAUTHORIZED | 401 | No/invalid token |
| FORBIDDEN | 403 | Employee tries create/update |
| NOT_FOUND | 404 | Asset id missing |
| VALIDATION_ERROR | 422 | Bad body types |
| INVALID_CATEGORY | 400 | category missing/inactive |
| INVALID_DEPARTMENT | 400 | department missing |
| DUPLICATE_SERIAL | 409 | serial_number taken |
| DUPLICATE_TAG | 409 | tag race (rare) |
| INVALID_COST | 400 | negative cost |
| INVALID_STATUS_CHANGE | 400 | illegal status PATCH |

## 14.3 Field validation summary

| Field | Validation |
|-------|------------|
| name | min length 1, max 255 |
| category_id | UUID, exists, ACTIVE |
| serial_number | optional, unique, max length |
| acquisition_cost | ≥ 0 |
| condition | enum if used |
| is_shared | boolean |
| photo_url | optional string URL-ish |

---

# 15. Service-Layer Logic (Algorithms)

Put logic in **services**, not fat routers.

## 15.1 `create_asset(actor, data)`

```
1. assert actor.role in (ADMIN, ASSET_MANAGER)
2. validate category exists and ACTIVE → else INVALID_CATEGORY
3. if department_id: validate department exists → else INVALID_DEPARTMENT
4. if serial_number: ensure not taken → else DUPLICATE_SERIAL
5. if acquisition_cost is not null and < 0 → INVALID_COST
6. tag = generate_next_tag()
7. status = AVAILABLE
8. is_shared = data.is_shared ?? false
9. persist Asset(...)
10. commit
11. return AssetResponse with joins (category_name, department_name)
```

## 15.2 `list_assets(filters)`

```
1. base query Asset
2. apply filters (search OR across tag/name/serial)
3. order + paginate
4. return items + total
```

## 15.3 `get_asset(id)`

```
1. load asset + joins
2. if missing → NOT_FOUND
3. optionally attach current_holder from active allocation (null if no Module D yet)
4. return response
```

## 15.4 `update_asset(actor, id, data)`

```
1. assert role ADMIN or ASSET_MANAGER
2. load asset → NOT_FOUND
3. reject attempts to change tag
4. validate category/department/serial if present in payload
5. apply fields
6. updated_at = now
7. commit + return
```

## 15.5 `get_history(id)`

```
1. ensure asset exists
2. if allocation table usable: query by asset_id order by allocated_at desc
3. if maintenance usable: query by asset_id order by created_at desc
4. else empty lists
5. return composite
```

## 15.6 `generate_next_tag()`

See §6.2. Keep inside transaction with asset insert.

---

# 16. What PATCH May Change (and What Not)

## Allowed (typical)

| Field | Notes |
|-------|-------|
| name | yes |
| category_id | yes, re-validate |
| serial_number | yes, unique check |
| acquisition_date | yes |
| acquisition_cost | yes |
| condition | yes |
| location | yes |
| department_id | yes / null |
| is_shared | yes if no conflicting future rules |
| photo_url | yes |

## Forbidden / restricted

| Field | Policy |
|-------|--------|
| id | never |
| tag | never |
| status | never via general PATCH (preferred) OR admin-only retire/dispose |
| created_at | never |
| created_by | never |

---

# 17. Seed Data for Assets

Extend `seed_demo.py` **after** endpoints work (or insert via ORM in seed).

## 17.1 Recommended demo assets

| Tag (fixed in seed) | Name | Category | is_shared | status | location | Notes |
|---------------------|------|----------|-----------|--------|----------|-------|
| AF-0114 | Dell Laptop | Electronics | false | AVAILABLE* | Longhorn | *Module D will allocate to holder |
| AF-0062 | Projector | Electronics | true or false | AVAILABLE | 4th Floor | Maintenance demo later |
| AF-ROOM-B2 or AF-0003 | Conference Room B2 | Rooms | **true** | AVAILABLE | Building B | Booking hero |
| AF-0201 | Office Chair | Furniture | false | AVAILABLE | Warehouse | Filler |

\*For full demo after Module D: AF-0114 status ALLOCATED + active allocation to employee (e.g. Arjun or a named holder).

## 17.2 Seed rules

| Rule | Detail |
|------|--------|
| Use known tags | Demo script references AF-0114 |
| Resolve category/dept by name | Lookup Electronics / Rooms / Engineering |
| created_by | admin or AM user id |
| Idempotent seed | Skip if tag already exists |

## 17.3 Minimal seed if time-poor

At least:
1. One non-shared laptop AVAILABLE  
2. One shared room AVAILABLE  

---

# 18. End-to-End Flows

## 18.1 Register laptop (AM)

```
1. Login as Raj (ASSET_MANAGER)
2. GET /api/categories → pick Electronics id
3. GET /api/departments → optional Engineering id
4. POST /api/assets { name: "Dell Laptop", category_id, location: "Longhorn", is_shared: false }
5. Response: tag AF-0001 (or next), status AVAILABLE
6. GET /api/assets?search=Dell → appears in list
```

## 18.2 Register bookable room (AM)

```
1. POST /api/assets {
     name: "Conference Room B2",
     category_id: <Rooms>,
     location: "Building B",
     is_shared: true
   }
2. GET /api/assets?is_shared=true → room listed
```

## 18.3 Employee blocked

```
1. Login as Arjun (EMPLOYEE)
2. POST /api/assets → 403 FORBIDDEN
3. GET /api/assets → 200 (can view directory)
```

## 18.4 Update location

```
1. AM PATCH /api/assets/{id} { "location": "Warehouse" }
2. GET detail → location updated, tag unchanged, status unchanged
```

## 18.5 Invalid category

```
1. POST with random UUID category_id → 400 INVALID_CATEGORY
```

## 18.6 Flow into Module D (preview)

```
Asset AVAILABLE
  → POST /allocations { asset_id, employee_id }
  → asset status becomes ALLOCATED  (Module D service)
  → second allocate → 409 ASSET_HELD
```

Module C only ensures asset starts AVAILABLE and is readable.

---

# 19. Implementation Order

Do in this sequence inside Module C:

| Step | Task | Done when |
|------|------|-----------|
| 1 | Confirm Asset model fields vs §4; migrate if gaps | Model complete |
| 2 | Pydantic schemas: AssetCreate, AssetUpdate, AssetResponse, AssetListResponse | Schemas ready |
| 3 | `generate_next_tag()` service | Unit/manual check |
| 4 | `create_asset` service + POST endpoint + RBAC | 201 with AF-0001 |
| 5 | `list_assets` + filters + GET list | Filters work in Swagger |
| 6 | `get_asset` | 200 / 404 |
| 7 | `update_asset` + PATCH | Metadata updates |
| 8 | `get_history` stub | Empty arrays |
| 9 | Error codes standardized | Consistent JSON |
| 10 | Extend seed_demo with 2–4 assets | Reproducible |
| 11 | Smoke tests §20 | All green |
| 12 | **Stop Module C → start Module D** | |

**Do not implement allocation inside asset router.** Keep boundaries clean.

---

# 20. Smoke Tests

Run as AM + Employee + Admin tokens.

| # | Test | Expected |
|---|------|----------|
| 1 | AM POST valid laptop | 201, tag matches `AF-\d{4,}`, status AVAILABLE |
| 2 | Response has no unexpected secrets | OK |
| 3 | Client sends `"status": "ALLOCATED"` on create | Still AVAILABLE |
| 4 | Client sends `"tag": "HACK-1"` on create | Ignored; server tag used |
| 5 | Employee POST asset | 403 |
| 6 | Admin POST asset | 201 |
| 7 | POST invalid category_id | 400 INVALID_CATEGORY |
| 8 | POST duplicate serial_number | 409 |
| 9 | GET /assets | 200 list includes new asset |
| 10 | GET /assets?is_shared=true | only shared |
| 11 | GET /assets?search=AF-0001 | hit |
| 12 | GET /assets/{id} | 200 detail + category_name |
| 13 | GET /assets/random-uuid | 404 |
| 14 | AM PATCH location | 200; tag unchanged |
| 15 | AM PATCH tag | ignored or 400; tag unchanged |
| 16 | GET /assets/{id}/history | 200 empty lists |
| 17 | Create Room B2 is_shared=true | listed in shared filter |
| 18 | Negative acquisition_cost | 400 |

---

# 21. Definition of Done

Module C is **complete** when all are true:

- [ ] ADMIN and ASSET_MANAGER can register assets  
- [ ] EMPLOYEE cannot register (403)  
- [ ] Auto tag `AF-####` unique and server-side  
- [ ] Create always results in status **AVAILABLE**  
- [ ] category_id validated against Org categories  
- [ ] department_id optional + validated  
- [ ] `is_shared` stored and filterable  
- [ ] List supports search + status + category + department + is_shared  
- [ ] Get detail returns joined names  
- [ ] PATCH updates metadata without breaking tag/status integrity  
- [ ] History endpoint exists (stub OK)  
- [ ] Seed can create laptop + shared room  
- [ ] Swagger demos cleanly for AM login  

**Not required for Module C done:**
- Allocation  
- Booking overlap  
- Maintenance  
- Non-zero dashboard  

---

# 22. Handoff to Module D / E / F

## 22.1 What Module D (Allocation) will need from Assets

| Need | Asset field / API |
|------|-------------------|
| Pick allocatable assets | `status=AVAILABLE` and preferably `is_shared=false` |
| Lock on allocate | service sets status → ALLOCATED |
| Unlock on return | status → AVAILABLE |
| Conflict message | load asset + active allocation holder |
| History | allocation rows by asset_id |

**Asset service helper to add in D (not C):**
```
assert_asset_allocatable(asset) → raises if not AVAILABLE or is_shared
set_status(asset, ALLOCATED | AVAILABLE)
```

## 22.2 What Module E (Booking) will need

| Need | Asset field / API |
|------|-------------------|
| Resource list | `is_shared=true` |
| Reject non-shared | check flag |
| Optional status | keep AVAILABLE; bookings table owns time |

## 22.3 What Module F (Maintenance) will need

| Need | Asset field / API |
|------|-------------------|
| Pick asset | any operational asset |
| On approve | status → UNDER_MAINTENANCE |
| On resolve | status → AVAILABLE |

## 22.4 Dashboard impact after C only

| KPI | After Module C alone |
|-----|----------------------|
| assets_available | **non-zero** if you seed/create |
| assets_allocated | still 0 until D |
| others | 0 |

So after C, dashboard starts to look slightly alive — still not the hero demo.

---

# 23. Common Mistakes

| Mistake | Fix |
|---------|-----|
| Letting client set tag/status on create | Force server values |
| Hard-deleting assets | Retire/dispose instead |
| Skipping category validation | Always FK check |
| Building allocate inside POST /assets | Separate module |
| Using free-string status with typos | Enum |
| Case mismatch AVAILABLE vs Available | One convention project-wide |
| No unique serial handling | 409 not 500 |
| Forgetting is_shared default | false |
| AM cannot call API due to wrong role string | Match seed role enum exactly |
| Pagination inconsistency | Document items/total vs array |
| History endpoint missing | Stub now for FE routes |

---

# 24. Frontend Contract Notes

Share with FE partner when Assets API is ready:

| UI action | API |
|-----------|-----|
| Asset table load | `GET /api/assets?...` |
| Register modal submit | `POST /api/assets` |
| Row click detail | `GET /api/assets/{id}` |
| Edit location/condition | `PATCH /api/assets/{id}` |
| History tabs | `GET /api/assets/{id}/history` |
| Category dropdown | `GET /api/categories?status=ACTIVE` |
| Department dropdown | `GET /api/departments?status=ACTIVE` |
| Status badge colors | map enum → color |
| Shared chip | `is_shared` boolean |
| Hide Register button | role AM/Admin only |

### Status badge color suggestions
| Status | Color |
|--------|-------|
| AVAILABLE | green |
| ALLOCATED | blue |
| RESERVED | purple |
| UNDER_MAINTENANCE | amber |
| LOST | red |
| RETIRED / DISPOSED | gray |

---

# 25. Suggested Commit Message (when done)

```bash
git add .
git commit -m "feat(backend): assets CRUD with auto tag, filters, shared flag, AM/Admin RBAC + history stub"
```

---

# 26. Quick Reference Card

| Item | Value |
|------|--------|
| **Module** | C — Assets |
| **Write roles** | ADMIN, ASSET_MANAGER |
| **Read roles** | Any authenticated |
| **Default status** | AVAILABLE |
| **Tag format** | AF-0001 (server) |
| **Key flag** | is_shared → booking later |
| **Key FK** | category_id (required) |
| **Hero dependency** | Must finish before Allocation/Booking |
| **History** | Stub empty arrays OK |
| **Next module** | D — Allocation & Transfer |

---

# 27. Final Checklist — Start Coding Now

```
[ ] 1. Verify Asset model columns (tag, status, is_shared, category_id, ...)
[ ] 2. Schemas Create / Update / Response
[ ] 3. Tag generator
[ ] 4. POST /api/assets (RBAC + validations)
[ ] 5. GET /api/assets (filters)
[ ] 6. GET /api/assets/{id}
[ ] 7. PATCH /api/assets/{id}
[ ] 8. GET /api/assets/{id}/history stub
[ ] 9. Seed laptop + Room B2
[ ] 10. Smoke tests §20
[ ] 11. Commit
[ ] 12. Open Module D guide / implement Allocation
```

---

**Module C success looks like:**  
In Swagger, Asset Manager creates **Dell Laptop** (`AF-0001`, AVAILABLE) and **Conference Room B2** (`is_shared=true`). Employee is forbidden to create. List filters work. You are ready for **double-allocation** rules next.

---

*AssetFlow Module C — Assets Guide · Companion to Backend README + Org Setup Guide*  
*After this: Module D Allocation & Transfer (ASSET_HELD + transfer workflow)*
