# AssetFlow

> **Enterprise Asset & Resource Management Platform**  
> Built with FastAPI · SQLAlchemy 2 Async · PostgreSQL · Pydantic v2 · JWT RBAC

---

## Features

| Module | Capability | Status |
|--------|-----------|--------|
| A — Auth & RBAC | JWT login, role-based guards (ADMIN, ASSET_MANAGER, DEPT_HEAD, EMPLOYEE) | ✅ |
| B — Organization | Departments (hierarchy), Asset Categories | ✅ |
| C — Assets | CRUD, auto-tagging, status lifecycle, per-asset history | ✅ |
| D — Allocation & Transfer | Custody allocation, **409 ASSET_HELD**, peer transfer with approval | ✅ |
| E — Booking | Shared resource booking, **409 BOOKING_OVERLAP**, reschedule/cancel | ✅ |
| F — Maintenance | State machine (PENDING→APPROVED→IN_PROGRESS→RESOLVED), asset side-effects | ✅ |
| G — Dashboard | Live operational KPIs via SQL aggregation | ✅ |
| H — Notifications | In-app inbox auto-triggered on key operational events | ✅ |
| I — Audits | Audit cycles with MISSING→LOST side effect on close | ✅ |
| J — Reports & Export | Analytics summary + CSV export (assets/allocations/maintenance) | ✅ |

---

## Tech Stack

- **Python 3.12+**
- **FastAPI** — async REST API framework
- **SQLAlchemy 2.0** — async ORM with `AsyncSession`
- **Alembic** — database schema migrations
- **PostgreSQL** (Neon / Supabase / local)
- **Pydantic v2** — request/response validation
- **JWT** (`python-jose`) — stateless authentication

---

## Prerequisites

- Python **3.12+**
- A running **PostgreSQL** instance (Neon serverless URL works perfectly)
- `uv` package manager — [install here](https://github.com/astral-sh/uv) — **or** use `pip`

---

## Environment Setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in DATABASE_URL and SECRET_KEY at minimum
```

**Required variables** (see `.env.example` for full list):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | `postgresql+asyncpg://user:pass@host/db?ssl=require` |
| `SECRET_KEY` | ✅ Yes | Long random string — keep stable across restarts |
| `ALGORITHM` | ✅ Yes | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | Token TTL in minutes (default `720` = 12 h) |
| `CORS_ORIGINS` | If FE | Comma-separated frontend URLs (default includes `localhost:5173`) |
| `SMTP_ENABLED` | No | Set `false` for demo — disables OTP email |
| `DEBUG` | No | `True` enables auto-reload |

> ⚠️ **Never commit `.env`** — it is in `.gitignore`.

---

## Install & Run

### With `uv` (recommended)
```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload
```

### With `pip`
```bash
cd backend
pip install -r requirements.txt   # or: pip install .
uvicorn src.main:app --reload
```

The API is available at: **`http://127.0.0.1:8000`**  
Interactive docs (Swagger): **`http://127.0.0.1:8000/api/v1/docs`**  
Health check: **`http://127.0.0.1:8000/api/v1/health`**

---

## Database Migrations

```bash
cd backend
uv run alembic upgrade head
```

---

## Seed Demo Data

Populates the database with a complete, demo-ready dataset. **Safe to re-run** (truncates existing data first).

```bash
cd backend
uv run python seed_demo.py
```

### What the seed creates

| Data | Detail |
|------|--------|
| Departments | Engineering, Facilities |
| Categories | Electronics, Rooms, Vehicles, Furniture |
| Demo users | See table below |
| `AF-000114` Dell Laptop | **ALLOCATED** to Arjun — triggers `ASSET_HELD` demo |
| `AF-000003` Room B2 | Shared — booked 1h from now (active booking KPI) |
| `AF-000062` Projector | PENDING maintenance by Arjun |
| `AF-000201` Office Chair | Overdue allocation (expected return in the past) |
| Audit cycle | "Q3 Engineering Audit" — OPEN with 1 VERIFIED + 1 MISSING item |
| Notifications | 2 sample notifications seeded |

---

## Demo Accounts

> All accounts use password: **`password123`**

| Email | Role | Notes |
|-------|------|-------|
| `raj@assetflow.com` | ASSET_MANAGER | Main operator for hero demos |
| `priya@assetflow.com` | DEPARTMENT_HEAD | Engineering head |
| `arjun@assetflow.com` | EMPLOYEE | Asset holder, booker, raiser |

---

## 5-Minute Demo Script

### Step 0 — Prep (30s)
1. Start API: `uv run uvicorn src.main:app --reload`
2. Run seed: `uv run python seed_demo.py`
3. Open Swagger: `http://127.0.0.1:8000/api/v1/docs`
4. Confirm health: `GET /api/v1/health` → `{"status": "ok"}`

### Step 1 — Login as Asset Manager (20s)
```
POST /api/v1/auth/login
{ "email": "raj@assetflow.com", "password": "password123" }
```
Copy the `access_token`. Click **Authorize** in Swagger and paste it.

### Step 2 — Dashboard (30s)
```
GET /api/v1/dashboard
```
Show: `assets_allocated ≥ 1`, `open_maintenance ≥ 1`, `active_bookings ≥ 1`, `overdue_returns ≥ 1`.

### Step 3 — Allocation Hero: 409 ASSET_HELD (60s)
```json
POST /api/v1/allocations
{ "asset_id": "<AF-000114 id>", "employee_id": "<any-other-user-id>" }
```
**Expected: 409** with `"code": "ASSET_HELD"` and `"holder_name": "Arjun (Employee)"`.

Then demonstrate a transfer request + approval to shift custody atomically.

### Step 4 — Booking Hero: 409 BOOKING_OVERLAP (45s)
```
GET /api/v1/resources    → find Room B2 id
GET /api/v1/bookings?asset_id=<room-id>    → note the seeded start/end window
```
Attempt booking in the middle of that window:
```json
POST /api/v1/bookings
{ "asset_id": "<room-id>", "start_at": "<overlap time>", "end_at": "<overlap end>" }
```
**Expected: 409** with `"code": "BOOKING_OVERLAP"` and `conflicts_with` list.

Then book end-adjacent (start = previous end) → **201 OK** proving half-open interval logic.

### Step 5 — Maintenance State Machine (45s)
```
GET /api/v1/maintenance?status=PENDING   → find projector request id
POST /api/v1/maintenance/{id}/transition  { "to": "APPROVED" }
GET /api/v1/assets/{projector-id}        → asset.status = "UNDER_MAINTENANCE"
POST /api/v1/maintenance/{id}/transition  { "to": "IN_PROGRESS" }
POST /api/v1/maintenance/{id}/transition  { "to": "RESOLVED" }
GET /api/v1/assets/{projector-id}        → asset.status = "AVAILABLE"
```

### Step 6 — Notifications (20s)
```
GET /api/v1/notifications/unread-count   → shows pending count
GET /api/v1/notifications               → list with types (ASSET_ASSIGNED, MAINTENANCE_RAISED…)
POST /api/v1/notifications/{id}/read    → mark one read
```

### Step 7 — Reports & Audit (30s, optional)
```
GET /api/v1/reports/summary             → utilization, most-used, idle assets
GET /api/v1/reports/export.csv?type=assets  → download CSV
POST /api/v1/audits/{id}/close         → MISSING item → asset becomes LOST
```

---

## Key Business Rules

| Rule | HTTP | Code |
|------|------|------|
| Asset already allocated to someone | `409` | `ASSET_HELD` |
| Booking time slot conflicts | `409` | `BOOKING_OVERLAP` |
| Adjacent slots (start == previous end) | `201` | Allowed — half-open interval |
| Maintenance APPROVED | — | Asset → `UNDER_MAINTENANCE` |
| Maintenance RESOLVED | — | Asset → `AVAILABLE` |
| Audit cycle close (MISSING items) | — | Asset → `LOST` |

---

## API Reference

- **Base path:** `/api/v1`
- **Auth header:** `Authorization: Bearer <token>`
- **Swagger UI:** [`/api/v1/docs`](http://127.0.0.1:8000/api/v1/docs)

---

## Smoke Test

After seeding, run the automated smoke verification:

```bash
cd backend
uv run python smoke_test.py
```

All 15 steps must pass. Any failure prints the failing step and exits non-zero.

---

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── endpoints/     # One file per module (auth, assets, allocations…)
│   │   ├── deps.py        # Auth dependency guards
│   │   └── router.py      # Central router assembly
│   ├── core/
│   │   ├── config.py      # Settings (pydantic-settings)
│   │   ├── enums.py       # All status/role enums
│   │   └── security.py    # JWT encode/decode, password hashing
│   ├── database/
│   │   ├── base.py        # SQLAlchemy declarative base
│   │   └── session.py     # AsyncSession factory
│   ├── models/            # SQLAlchemy ORM models
│   └── schemas/           # Pydantic request/response schemas
├── migrations/            # Alembic migration scripts
├── seed_demo.py           # Demo data seeder (truncate + insert)
├── smoke_test.py          # Automated smoke verification
├── .env.example           # Config template (copy to .env)
└── alembic.ini
```

---

> ⚠️ **Demo credentials are for demonstration only. Do not use in production.**
