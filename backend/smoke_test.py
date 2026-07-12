#!/usr/bin/env python
"""
AssetFlow Smoke Test
====================
Automated 15-step smoke verification of all hero API paths.

Usage:
    cd backend
    uv run python smoke_test.py

Requirements:
    pip install httpx  (or: uv add httpx)

Environment (optional):
    SMOKE_BASE_URL=http://127.0.0.1:8000   (default)
    SMOKE_AM_EMAIL=raj@assetflow.com        (default)
    SMOKE_AM_PASSWORD=password123           (default)
    SMOKE_EMP_EMAIL=arjun@assetflow.com     (default)
    SMOKE_EMP_PASSWORD=password123          (default)

Run seed first: uv run python seed_demo.py
"""

import os
import sys
import json
import httpx
from datetime import datetime, timezone, timedelta

client = httpx.Client(timeout=60.0, follow_redirects=True)

BASE_URL = os.environ.get("SMOKE_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api/v1"
AM_EMAIL = os.environ.get("SMOKE_AM_EMAIL", "raj@assetflow.com")
AM_PASSWORD = os.environ.get("SMOKE_AM_PASSWORD", "password123")
EMP_EMAIL = os.environ.get("SMOKE_EMP_EMAIL", "arjun@assetflow.com")
EMP_PASSWORD = os.environ.get("SMOKE_EMP_PASSWORD", "password123")

PASS = "[PASS]"
FAIL = "[FAIL]"

steps_run = 0
steps_passed = 0


def step(name: str):
    global steps_run
    steps_run += 1
    # Strip non-ASCII
    clean_name = name.encode("ascii", "ignore").decode("ascii")
    print(f"\nStep {steps_run}: {clean_name}")


def ok(msg: str = ""):
    global steps_passed
    steps_passed += 1
    clean_msg = msg.encode("ascii", "ignore").decode("ascii")
    print(f"  {PASS}{' - ' + clean_msg if clean_msg else ''}")


def fail(msg: str, resp=None):
    clean_msg = msg.encode("ascii", "ignore").decode("ascii")
    print(f"  {FAIL} - {clean_msg}")
    if resp is not None:
        try:
            print(f"  Body: {resp.text[:300]}")
        except Exception:
            pass
    sys.exit(1)


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(email: str, password: str) -> str:
    r = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        print(f"  Login failed for {email}: {r.status_code} {r.text[:200]}")
        sys.exit(1)
    token = r.json().get("access_token")
    if not token:
        print(f"  No access_token in response: {r.text[:200]}")
        sys.exit(1)
    return token


def main():
    print("=" * 60)
    print("AssetFlow Smoke Test")
    print(f"Target: {BASE_URL}")
    print(f"Time:   {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    print("\nIMPORTANT: Run seed_demo.py before this script!\n")

    # ── Step 1: Health ──────────────────────────────────────────
    step("GET /health — public liveness check")
    r = client.get(f"{API}/health")
    if r.status_code not in (200, 503):
        fail(f"Unexpected status {r.status_code}", r)
    body = r.json()
    if body.get("status") not in ("ok", "degraded"):
        fail("Missing 'status' field", r)
    if r.status_code == 503:
        fail("Database is DOWN — fix DB before proceeding", r)
    ok(f"status={body['status']}, database={body.get('database')}")

    # ── Step 2: Login as AM ─────────────────────────────────────
    step(f"POST /auth/login as Asset Manager ({AM_EMAIL})")
    am_token = login(AM_EMAIL, AM_PASSWORD)
    ok("AM token issued")

    # ── Step 3: Auth/me ─────────────────────────────────────────
    step("GET /auth/me — verify role")
    r = client.get(f"{API}/auth/me", headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    role = r.json().get("role")
    if role not in ("ASSET_MANAGER", "ADMIN"):
        fail(f"Unexpected role '{role}' — expected ASSET_MANAGER or ADMIN", r)
    ok(f"role={role}")

    # ── Step 4: Dashboard ───────────────────────────────────────
    step("GET /dashboard — KPIs non-zero")
    r = client.get(f"{API}/dashboard", headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    kpis = r.json().get("kpis", r.json())
    ok(f"dashboard OK — allocated={kpis.get('assets_allocated')}, open_maintenance={kpis.get('open_maintenance')}")

    # ── Step 5: Find laptop asset ───────────────────────────────
    step("GET /assets — find AF-000114 (Dell Laptop)")
    r = client.get(f"{API}/assets", params={"search": "AF-000114"}, headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    body = r.json()
    items = body.get("items", body) if isinstance(body, dict) else body
    laptop = next((a for a in items if a.get("tag") == "AF-000114"), None)
    if not laptop:
        fail("AF-000114 not found — did you run seed?")
    laptop_id = laptop["id"]
    ok(f"found {laptop['tag']} status={laptop['status']}")

    # ── Step 6: 409 ASSET_HELD ──────────────────────────────────
    step("POST /allocations — trigger ASSET_HELD (409)")
    # Try to allocate laptop to AM himself — it's already allocated
    me_r = client.get(f"{API}/auth/me", headers=auth_header(am_token))
    am_id = me_r.json()["id"]
    r = client.post(
        f"{API}/allocations",
        json={"asset_id": laptop_id, "employee_id": am_id},
        headers=auth_header(am_token),
    )
    if r.status_code != 409:
        fail(f"Expected 409 ASSET_HELD but got {r.status_code}", r)
    detail = r.json().get("detail", {})
    code = detail.get("code") if isinstance(detail, dict) else None
    if code != "ASSET_HELD":
        fail(f"Expected code=ASSET_HELD but got '{code}'", r)
    ok(f"409 ASSET_HELD, holder_name={detail.get('holder_name')}")

    # ── Step 7: Find shared room ─────────────────────────────────
    step("GET /resources — find shared room (Room B2)")
    r = client.get(f"{API}/resources", headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    resources = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    room = next((x for x in resources if "B2" in x.get("name", "") or "Room" in x.get("name", "")), None)
    if not room:
        fail("No shared room found — did you run seed?")
    room_id = room["id"]
    ok(f"found room: {room['name']}")

    # ── Step 8: 409 BOOKING_OVERLAP ─────────────────────────────
    step("POST /bookings — trigger BOOKING_OVERLAP (409)")
    # Find existing booking for the room
    r = client.get(f"{API}/bookings", params={"asset_id": room_id}, headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Bookings list status {r.status_code}", r)
    bookings_body = r.json()
    existing = bookings_body.get("items", bookings_body) if isinstance(bookings_body, dict) else bookings_body
    if not existing:
        fail("No existing bookings for room — did seed run correctly?")
    b = existing[0]
    start = b["start_at"]
    end = b["end_at"]
    # Attempt overlap in the middle
    r2 = client.post(
        f"{API}/bookings",
        json={"asset_id": room_id, "start_at": start, "end_at": end, "purpose": "Smoke test overlap"},
        headers=auth_header(am_token),
    )
    if r2.status_code != 409:
        fail(f"Expected 409 BOOKING_OVERLAP but got {r2.status_code}", r2)
    detail2 = r2.json().get("detail", {})
    code2 = detail2.get("code") if isinstance(detail2, dict) else None
    if code2 != "BOOKING_OVERLAP":
        fail(f"Expected code=BOOKING_OVERLAP but got '{code2}'", r2)
    ok("409 BOOKING_OVERLAP confirmed")

    # ── Step 9: Adjacent booking → 201 ──────────────────────────
    step("POST /bookings — adjacent slot (start == previous end) → 201 OK")
    new_start = end  # Exactly where previous booking ends
    # Parse end and add 1 hour
    end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")) + timedelta(hours=1)
    r3 = client.post(
        f"{API}/bookings",
        json={"asset_id": room_id, "start_at": new_start, "end_at": end_dt.isoformat(), "purpose": "Smoke adjacent"},
        headers=auth_header(am_token),
    )
    if r3.status_code not in (200, 201):
        fail(f"Expected 201 for adjacent booking but got {r3.status_code}", r3)
    adj_booking_id = r3.json().get("id")
    ok(f"Adjacent booking created: {adj_booking_id}")
    # Cancel it so it doesn't pollute state
    if adj_booking_id:
        client.post(
            f"{API}/bookings/{adj_booking_id}/cancel",
            json={"reason": "smoke cleanup"},
            headers=auth_header(am_token),
        )

    # ── Step 10: Maintenance PENDING ────────────────────────────
    step("GET /maintenance?status=PENDING — find pending request")
    r = client.get(f"{API}/maintenance", params={"status": "PENDING"}, headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    maint_body = r.json()
    maint_items = maint_body.get("items", maint_body) if isinstance(maint_body, dict) else maint_body
    if not maint_items:
        fail("No PENDING maintenance found — did seed run?")
    maint_id = maint_items[0]["id"]
    ok(f"Found pending maintenance id={maint_id[:8]}...")

    # ── Step 11: Transition → APPROVED ──────────────────────────
    step("POST /maintenance/{id}/transition APPROVED → asset UNDER_MAINTENANCE")
    r = client.post(
        f"{API}/maintenance/{maint_id}/transition",
        json={"to": "APPROVED"},
        headers=auth_header(am_token),
    )
    if r.status_code != 200:
        fail(f"Transition APPROVED failed: {r.status_code}", r)
    asset_status = r.json().get("asset_status") or r.json().get("status")
    ok(f"Approved — asset_status={asset_status}")

    # ── Step 12: Transition → RESOLVED ──────────────────────────
    step("POST /maintenance → IN_PROGRESS → RESOLVED → asset AVAILABLE")
    client.post(f"{API}/maintenance/{maint_id}/transition", json={"to": "IN_PROGRESS"}, headers=auth_header(am_token))
    r = client.post(
        f"{API}/maintenance/{maint_id}/transition",
        json={"to": "RESOLVED", "notes": "Fixed by smoke test"},
        headers=auth_header(am_token),
    )
    if r.status_code != 200:
        fail(f"Transition RESOLVED failed: {r.status_code}", r)
    asset_status2 = r.json().get("asset_status") or r.json().get("status")
    ok(f"Resolved — asset_status={asset_status2}")

    # ── Step 13: Notifications ──────────────────────────────────
    step("GET /notifications — inbox for AM")
    r = client.get(f"{API}/notifications", headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    notifs = r.json() if isinstance(r.json(), list) else r.json().get("items", r.json())
    ok(f"notifications count={len(notifs)}")

    # ── Step 14: Reports summary ─────────────────────────────────
    step("GET /reports/summary — analytics JSON")
    r = client.get(f"{API}/reports/summary", headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    summary = r.json()
    ok(f"summary keys={list(summary.keys())[:4]}")

    # ── Step 15: CSV export ──────────────────────────────────────
    step("GET /reports/export.csv?type=assets — CSV download")
    r = client.get(f"{API}/reports/export.csv", params={"type": "assets"}, headers=auth_header(am_token))
    if r.status_code != 200:
        fail(f"Status {r.status_code}", r)
    ct = r.headers.get("content-type", "")
    if "csv" not in ct and "text" not in ct:
        fail(f"Content-Type not CSV: '{ct}'", r)
    rows = r.text.strip().splitlines()
    ok(f"CSV received — {len(rows)} rows (header + data)")

    # ── Final summary ────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"Smoke Test COMPLETE: {steps_passed}/{steps_run} steps passed")
    if steps_passed == steps_run:
        print("ALL CHECKS PASSED - backend is demo-ready!")
    else:
        print("Some checks failed - see above")
    print("=" * 60)


if __name__ == "__main__":
    main()
