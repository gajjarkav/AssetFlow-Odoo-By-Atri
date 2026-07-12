# AssetFlow Backend Status Tracker

This document tracks the completion state of the FastAPI backend for **AssetFlow**.

---

## 🟢 Completed & Tested

### 1. Core Infrastructure
* **Database Integration**: SQLAlchemy 2.0 Async Session + PostgreSQL (Neon).
* **Migrations**: Alembic revision history up to booking model updates.
* **Environment**: Fully configured `.env` with SMTP credentials & JWT keys.

### 2. Module A: Auth & RBAC
* User Signup (force EMPLOYEE role), Stateless JWT, Role Guards (`require_roles`).
* Self-profile, password reset with OTP, Gmail SMTP verified.

### 3. Module B: Organization Setup
* Departments CRUD (Admin only writes), Categories CRUD (Admin only writes).
* Employee directory with role/status/dept filters + `/options` dropdown endpoint.

### 4. Module C: Assets API
* Full CRUD (`GET`, `POST`, `PATCH`) with 6-digit auto-tagging (`AF-000001`).
* List with filters: search, category, status, department, location, is_shared.
* `/assets/{id}/history` — live timeline (allocations, transfers, maintenance).

### 5. Module D: Allocation & Transfer — Hero Feature #1
* **Allocations**: POST with `409 ASSET_HELD` double-allocation block (returns holder name).
* **Return**: Closes allocation, frees asset, auto-rejects pending transfers.
* **Transfers**: Request → Approve (atomic custody shift) → Reject workflow.
* Overdue detection computed dynamically on read (no cron needed).

### 6. Module E: Resource Booking — Hero Feature #2 (NEW)
* **`GET /api/resources`**: Lists all shared assets (`is_shared=true`).
* **`POST /api/bookings`**: Creates booking with half-open interval overlap engine.
  - Returns `409 BOOKING_OVERLAP` with `conflicts_with[]` list.
  - Edge-adjacent allowed: 10:00 end → 10:00 start is OK.
  - `display_status` derived on read: UPCOMING / ONGOING / COMPLETED / CANCELLED.
* **`GET /api/bookings`**: Filter by `asset_id`, `user_id`, `date`, `status`, range.
* **`POST /api/bookings/{id}/cancel`**: Cancel (booker or Admin/AM).
* **`PATCH /api/bookings/{id}`**: Reschedule with re-validation excluding self.
* **Seed**: Room B2 (`AF-000003`) pre-booked by Arjun 09:00–10:00 for live overlap demo.

---

## 🟡 Next Up

### 7. Module F: Maintenance Workflow
* Raise maintenance requests, approve, mark IN_PROGRESS/RESOLVED.
* Asset status transitions: `UNDER_MAINTENANCE` ↔ `AVAILABLE`.

### 8. Dashboard KPI hydration
* Connect real counts (allocated, available, overdue, active_bookings) to dashboard.

---

## 🚀 Recommended Git Commit Message

```bash
git add .
git commit -m "feat(backend): implement Resource Booking API (Module E) with overlap engine + reschedule"
git push
```
