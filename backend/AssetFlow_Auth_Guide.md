# AssetFlow — End-to-End Auth Logic Guide
## Mapped to your Alembic ORM · No implementation code · Logic & contracts only

**Scope:** Authentication, session/JWT, RBAC for 4 roles, employee promotion, status control  
**Your migration revision:** `11af871cc4a0`  
**Stack context:** FastAPI + React · Odoo Hackathon AssetFlow

---

# 1. What you already have (schema truth)

Your migration defines the **identity foundation**. Auth logic must follow these columns exactly.

## 1.1 Table: `departments` (auth dependency)

| Column | Type | Null | Auth relevance |
|--------|------|------|----------------|
| `id` | UUID | NO | PK; optional link from user |
| `name` | String | NO | Shown in profile / directory |

**Note:** Users may exist **before** rich department data is complete (`department_id` is nullable).  
Auth must **not** require a department to signup or login.

**Alembic note:** Your FK text may have been corrupted in paste as `[departments.id](http://departments.id)` — in the real migration it must be plain `'departments.id'`. Fix if migration fails.

## 1.2 Table: `users` (auth core)

| Column | Type | Null | Default intent | Auth use |
|--------|------|------|----------------|----------|
| `id` | UUID | NO | generated | JWT `sub`, all FKs |
| `name` | String(255) | NO | from signup/admin | Display, logs |
| `email` | String(255) | NO | unique index | Login identifier |
| `password_hash` | String(255) | NO | hash only | Verify on login |
| `role` | Enum `userrole` | NO | see §2 | RBAC |
| `status` | Enum `userstatus` | NO | see §2 | Login gate |
| `created_at` | DateTime(tz) | NO | now() | Audit |
| `updated_at` | DateTime(tz) | YES | on change | Audit |
| `department_id` | UUID FK → departments | YES | optional | Scope filters later |
| `phone` | String(50) | YES | optional | Profile only |
| `last_login_at` | DateTime(tz) | YES | null → set on login | Ops / security signal |
| `must_reset_password` | Boolean | NO | false (seed may true) | Force password change gate |
| `created_by` | UUID | YES | null on self-signup; admin id if admin-created | Provenance |

**Indexes / constraints you have**
- PK on `users.id`
- **Unique** index on `users.email` → signup must handle conflict
- FK `department_id` → `departments.id` (nullable)

**Not in table (by design)**
- Plain password
- JWT tokens (stateless)
- Permissions array (role enum is enough for hackathon)
- Refresh tokens (optional later)

---

# 2. Enums — exact values (lock these strings)

## 2.1 `userrole`

| DB / API value | Meaning | How obtained |
|----------------|---------|--------------|
| `EMPLOYEE` | Default staff | **Signup always**; seed |
| `DEPARTMENT_HEAD` | Head of a department | Admin promote only |
| `ASSET_MANAGER` | Asset ops power user | Admin promote only |
| `ADMIN` | Full control + org setup | **Seed** (or careful admin promote) |

**Critical business rule (problem statement)**  
Signup creates **EMPLOYEE only**. No role selection on public signup.  
If client sends `role` in signup body → **ignore it**.

## 2.2 `userstatus`

| Value | Meaning | Login? | API access? |
|-------|---------|--------|-------------|
| `ACTIVE` | Normal account | Yes | Yes (role permitting) |
| `INACTIVE` | Disabled by admin | **No** | **No** (even with old JWT) |

Every authenticated request should re-read `status` from DB (not trust JWT alone forever).

---

# 3. Auth architecture (layers)

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (React)                                             │
│  Login / Signup forms · store access_token · send Bearer    │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS JSON
┌────────────────────────────▼────────────────────────────────┐
│  HTTP AUTH ROUTES                                           │
│  POST /auth/signup · POST /auth/login · GET /auth/me · …    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  AUTH SERVICES                                              │
│  hash/verify password · issue/decode JWT · load user        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│  ORM / DB                                                   │
│  users · departments                                        │
└─────────────────────────────────────────────────────────────┘

On EVERY protected business route:
  Bearer token → decode → load User by id → status ACTIVE?
  → role in allowed set? → optional dept/ownership checks
```

**Mental split**
| Concern | Answers |
|---------|---------|
| **Authentication** | Who are you? (valid token + active user) |
| **Authorization** | What may you do? (role + resource rules) |
| **Identity admin** | Who can change roles/status? (ADMIN only) |

---

# 4. Password logic

| Event | Input | Stored / checked |
|-------|-------|------------------|
| Signup | plain `password` | save `password_hash = hash(password)` |
| Login | plain `password` | `verify(password, password_hash)` |
| Change password | `old_password` + `new_password` | verify old → hash new → update |
| Admin set temp password | plain temp | hash; set `must_reset_password = true` |
| API responses | — | **never** include `password` or `password_hash` |

**Rules**
- Min length: recommend ≥ 8 (document in API errors)
- Algorithm: bcrypt (or argon2) — one-way only
- Timing-safe verify via library
- Login failure message always: **"Invalid credentials"** (don’t say “email not found” vs “wrong password”)

---

# 5. JWT / session logic

## 5.1 Recommended token type
**Stateless access JWT** (hackathon-optimal with React SPA).

## 5.2 Claims (payload)

| Claim | Value | Why |
|-------|-------|-----|
| `sub` | `user.id` (UUID string) | Primary identity |
| `role` | current role string | Fast UI/guard hint |
| `email` | optional | Debug / display |
| `exp` | expiry unix time | Force re-login |
| `iat` | issued at | Optional |

**Important:** `role` in JWT is a **hint**. After admin demotes someone, next request should load fresh role from DB so demotion applies before token expiry.

## 5.3 Lifetime
- Hackathon demo: **8–12 hours** (one day event)
- Production would be shorter + refresh tokens — out of scope

## 5.4 Client handling
| Action | Client behavior |
|--------|-----------------|
| Login/signup success | Store `access_token` (+ user snapshot) |
| Each API call | Header `Authorization: Bearer <token>` |
| 401 | Clear token → redirect `/login` |
| Logout | Delete token locally; optional POST logout |
| App load | Call `GET /auth/me` to rehydrate user |

## 5.5 Server handling per protected request
1. Extract Bearer token  
2. Verify signature + expiry  
3. Parse `sub` → UUID  
4. **SELECT user by id**  
5. If missing → 401  
6. If `status != ACTIVE` → 401 or 403  
7. If `must_reset_password == true` and route is not password-change / me → **403** with code `PASSWORD_RESET_REQUIRED` (optional but you have the column)  
8. Attach user object to request context  
9. Role check if route requires it  

---

# 6. Public user shape (safe DTO)

Never return secrets. Standard user object for API/UI:

| Field | Source column |
|-------|----------------|
| `id` | id |
| `name` | name |
| `email` | email |
| `role` | role |
| `status` | status |
| `department_id` | department_id |
| `phone` | phone |
| `last_login_at` | last_login_at |
| `must_reset_password` | must_reset_password |
| `created_at` | created_at |

Omit: `password_hash`, internal-only notes.

---

# 7. End-to-end flows

---

## FLOW A — Signup (public) → always EMPLOYEE

### Goal
Create a real account that cannot self-elevate.

### Client asks user for
| Field | Required | Validation |
|-------|----------|------------|
| name | Yes | non-empty, ≤255 |
| email | Yes | valid email format, unique |
| password | Yes | min length |
| confirm password | UI only | must match password |
| phone | No | optional |
| department_id | No | if sent, must exist in `departments` |

### Client must NOT ask
- role  
- status  
- is_admin  

### Server algorithm
```
1. Normalize email (trim + lowercase recommended)
2. If email exists → 409 EMAIL_EXISTS
3. If department_id provided:
     - load department; if missing → 400 INVALID_DEPARTMENT
4. password_hash = hash(password)
5. INSERT user:
     id            = new UUID
     name          = input
     email         = normalized
     password_hash = hash
     role          = EMPLOYEE          ← FORCE
     status        = ACTIVE            ← FORCE
     department_id = input or null
     phone         = input or null
     created_at    = now
     updated_at    = null or now
     last_login_at = null
     must_reset_password = false
     created_by    = null              ← self-registration
6. Optionally auto-login: issue JWT
7. Return { user } or { access_token, user }
8. Activity log (optional): USER_SIGNED_UP
```

### Outcomes
| Case | HTTP | Code / message |
|------|------|----------------|
| Success | 201 | user (+ token if auto-login) |
| Duplicate email | 409 | EMAIL_EXISTS |
| Weak password | 400 | WEAK_PASSWORD |
| Bad department | 400 | INVALID_DEPARTMENT |

### Security
- Ignore any `role`, `status`, `must_reset_password`, `created_by` from body  
- Rate-limit signup if easy (optional)

---

## FLOW B — Login (public)

### Client asks
| Field | Required |
|-------|----------|
| email | Yes |
| password | Yes |

### Server algorithm
```
1. Normalize email
2. Find user by email
3. If not found → 401 INVALID_CREDENTIALS
4. If status == INACTIVE → 403 ACCOUNT_INACTIVE
5. If password verify fails → 401 INVALID_CREDENTIALS
6. Update last_login_at = now; updated_at = now
7. Issue JWT (sub=id, role=role, exp=...)
8. Return { access_token, token_type: "bearer", user: public_user }
```

### Special: `must_reset_password == true`
- Still allow login  
- Return user with `must_reset_password: true`  
- Frontend forces “Change password” screen before main app  
- Backend rejects other mutating routes until password changed (recommended)

### Outcomes
| Case | HTTP |
|------|------|
| Success | 200 |
| Bad credentials | 401 |
| Inactive | 403 |

---

## FLOW C — Session restore (`GET /auth/me`)

### When
- App boot  
- After refresh  
- Before showing role-based nav  

### Server algorithm
```
1. Require valid Bearer token
2. Load user from DB by sub
3. Check ACTIVE
4. Return public user (fresh role/status/dept)
```

### Why this matters
Admin may have changed role or department since token was issued. UI must trust `/me`, not only localStorage snapshot.

---

## FLOW D — Logout

### Stateless JWT (your default)
- Client deletes token  
- Server optional `POST /auth/logout` → 204 no-op or audit log  
- No server session row to destroy  

### If you later add token blocklist
- Store jti until exp — not needed for hackathon  

---

## FLOW E — Change own password

### Who
Any ACTIVE user (authenticated).

### Client asks
| Field | Required |
|-------|----------|
| old_password | Yes |
| new_password | Yes |

### Server algorithm
```
1. Authenticate user
2. Verify old_password against password_hash → else 400/401
3. Validate new_password strength
4. password_hash = hash(new)
5. must_reset_password = false
6. updated_at = now
7. Return success (optionally re-issue JWT)
```

---

## FLOW F — Admin promotes / demotes role (Employee Directory)

### Who
**ADMIN only**

### Why separate from signup
Problem statement: realistic account creation; roles assigned later by admin.

### Client (Admin UI) asks
| Field | Notes |
|-------|-------|
| target user id | from directory row |
| new role | EMPLOYEE \| DEPARTMENT_HEAD \| ASSET_MANAGER \| ADMIN |

### Server algorithm
```
1. require role == ADMIN
2. Load target user; 404 if missing
3. Validate new role is a valid enum value
4. Optional safeguards:
     - Prevent demoting the last ADMIN
     - Prevent admin removing own ADMIN role while solo
5. old_role = target.role
6. target.role = new_role
7. target.updated_at = now
8. Commit
9. Activity log: ROLE_CHANGED { actor, target, old, new }
10. Notification to target (optional): "Your role is now ASSET_MANAGER"
11. Return updated public user
```

### Route placement
Prefer: `PATCH /api/employees/{id}/role`  
Not: public `/auth/signup` and not self-service `/auth/upgrade`.

### Outcomes
| Case | HTTP |
|------|------|
| Success | 200 |
| Not admin | 403 |
| User missing | 404 |
| Invalid role | 400 |
| Last admin lockout prevented | 400 |

---

## FLOW G — Admin deactivates / reactivates user

### Who
ADMIN

### Client asks
`status`: `ACTIVE` | `INACTIVE`

### Server algorithm
```
1. require ADMIN
2. Load user
3. Optional: cannot deactivate yourself
4. Set status; updated_at = now
5. If INACTIVE: user fails all future auth checks even with old JWT
6. Log + optional notify
```

---

## FLOW H — Admin creates employee (optional, directory “Add user”)

Different from public signup.

| Field | Rule |
|-------|------|
| name, email, password or temp password | required |
| department_id | optional |
| role | admin may set role here **or** default EMPLOYEE then promote |
| must_reset_password | **true** if temp password |
| created_by | admin’s user id |

Still: prefer default EMPLOYEE + explicit promote for clarity in demo.

---

## FLOW I — Forgot password (stub for hackathon)

| Step | Logic |
|------|--------|
| User submits email | Always respond 200: “If an account exists, instructions were sent” |
| Real email | Skip unless bonus time |
| No token table required | For demo |

Do not block P0 on this.

---

# 8. Route catalog (auth + identity admin)

## 8.1 Auth routes

| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| POST | `/api/auth/signup` | Public | — | Create EMPLOYEE |
| POST | `/api/auth/login` | Public | — | Issue JWT |
| GET | `/api/auth/me` | Bearer | Any ACTIVE | Current user |
| POST | `/api/auth/logout` | Bearer optional | Any | Client logout / audit |
| PATCH | `/api/auth/me/password` | Bearer | Any ACTIVE | Change password |
| POST | `/api/auth/forgot-password` | Public | — | Stub |

## 8.2 Identity / directory routes (auth-adjacent)

| Method | Path | Auth | Roles | Purpose |
|--------|------|------|-------|---------|
| GET | `/api/employees` | Bearer | ADMIN (full); others limited | Directory |
| GET | `/api/employees/{id}` | Bearer | Admin or self or manager rules | Profile |
| PATCH | `/api/employees/{id}/role` | Bearer | **ADMIN** | Promote/demote |
| PATCH | `/api/employees/{id}/status` | Bearer | **ADMIN** | Active/Inactive |
| PATCH | `/api/employees/{id}` | Bearer | **ADMIN** | name, phone, department_id |
| POST | `/api/employees` | Bearer | **ADMIN** | Admin-create user (optional) |

## 8.3 How business routes use auth (pattern, not full list)

Every later module route does:

```
Depends: get_current_user
Optional: require_roles(ADMIN, ASSET_MANAGER, ...)
Optional: resource-level checks (own allocation, same department)
```

Examples:

| Business action | Allowed roles | Extra |
|-----------------|---------------|-------|
| Org setup CRUD | ADMIN | — |
| Register asset | ADMIN, ASSET_MANAGER | — |
| Allocate asset | ADMIN, ASSET_MANAGER, (DEPT_HEAD own dept) | asset available |
| Approve transfer | ADMIN, ASSET_MANAGER, DEPT_HEAD | dept scope |
| Book resource | All ACTIVE roles | shared asset |
| Raise maintenance | All ACTIVE roles | — |
| Approve maintenance | ADMIN, ASSET_MANAGER | — |

---

# 9. Role matrix (authorization depth)

## 9.1 Auth & identity

| Capability | EMPLOYEE | DEPARTMENT_HEAD | ASSET_MANAGER | ADMIN |
|------------|:--------:|:---------------:|:-------------:|:-----:|
| Signup self | ✅ (as employee) | — | — | — |
| Login | ✅ | ✅ | ✅ | ✅ |
| Get /me | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| List all employees | ❌ | limited | limited | ✅ |
| Change any role | ❌ | ❌ | ❌ | ✅ |
| Activate/deactivate user | ❌ | ❌ | ❌ | ✅ |
| Access Org Setup | ❌ | ❌ | ❌ | ✅ |

## 9.2 What each role “is for” in AssetFlow

| Role | Primary job after auth |
|------|------------------------|
| EMPLOYEE | View own assets, book rooms, raise maintenance, request transfer/return |
| DEPARTMENT_HEAD | Employee powers + approve transfers/allocations in **their** department |
| ASSET_MANAGER | Register/allocate assets, approve transfers & maintenance, audits support |
| ADMIN | Everything + departments/categories/roles/seed governance |

**Department scoping rule (later modules)**  
`DEPT_HEAD` actions that affect others should check:  
`target.department_id == current_user.department_id`  
(or asset’s department matches).  
ADMIN / ASSET_MANAGER usually org-wide.

---

# 10. Request → response contracts (logic level)

## POST `/api/auth/signup`
**Body:** `name`, `email`, `password`, optional `phone`, optional `department_id`  
**Success 201:** `{ "user": { ...public }, "access_token"?: "..." }`  
**Errors:** 409 email, 400 validation  

## POST `/api/auth/login`
**Body:** `email`, `password`  
**Success 200:**
```
access_token: string
token_type: "bearer"
user: public user
```
**Errors:** 401 credentials, 403 inactive  

## GET `/api/auth/me`
**Headers:** Authorization Bearer  
**Success 200:** public user  
**Errors:** 401  

## PATCH `/api/auth/me/password`
**Body:** `old_password`, `new_password`  
**Success 200:** `{ "detail": "Password updated" }`  
**Side effect:** `must_reset_password = false`  

## PATCH `/api/employees/{id}/role`
**Body:** `{ "role": "ASSET_MANAGER" }`  
**Success 200:** updated public user  
**Errors:** 403, 404, 400  

## PATCH `/api/employees/{id}/status`
**Body:** `{ "status": "INACTIVE" }`  
**Success 200:** updated public user  

---

# 11. Error codes (consistent language)

| Code | HTTP | When |
|------|------|------|
| `INVALID_CREDENTIALS` | 401 | Bad login |
| `ACCOUNT_INACTIVE` | 403 | status INACTIVE |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Wrong role |
| `EMAIL_EXISTS` | 409 | Signup duplicate |
| `WEAK_PASSWORD` | 400 | Policy fail |
| `INVALID_DEPARTMENT` | 400 | Bad FK |
| `PASSWORD_RESET_REQUIRED` | 403 | must_reset_password gate |
| `LAST_ADMIN` | 400 | Would remove final admin |
| `VALIDATION_ERROR` | 422/400 | Pydantic/body errors |

Response shape recommendation:
```
{ "detail": "Human message", "code": "EMAIL_EXISTS" }
```

---

# 12. Seed plan (auth bootstrap)

Without seed admin, nobody can promote roles → system stuck with only employees.

## 12.1 Minimum seed users

| Email (example) | Role | Status | Notes |
|-----------------|------|--------|-------|
| `admin@assetflow.com` | ADMIN | ACTIVE | password known in README |
| `am@assetflow.com` | ASSET_MANAGER | ACTIVE | optional seed |
| `head@assetflow.com` | DEPARTMENT_HEAD | ACTIVE | attach Engineering dept |
| `priya@assetflow.com` | EMPLOYEE | ACTIVE | demo conflict story |
| `raj@assetflow.com` | EMPLOYEE | ACTIVE | demo blocked allocate |

## 12.2 Seed order
```
1. Create departments (at least Engineering) — your migration already has departments table
2. Create admin user (role=ADMIN, must_reset_password=false, created_by=null)
3. Create other users with department_id set
4. Never rely on public signup for admin in demo
```

## 12.3 Seed field checklist per user
- id (UUID)  
- name, email, password_hash  
- role, status=ACTIVE  
- department_id as needed  
- created_at  
- must_reset_password=false (true only for temp accounts)  
- created_by=null or admin id  
- phone optional  
- last_login_at null  

---

# 13. Frontend auth logic (paired with backend)

## 13.1 Pages
| Page | Fields | Success next step |
|------|--------|-------------------|
| `/signup` | name, email, password, confirm, optional phone/dept | login or auto dashboard |
| `/login` | email, password | dashboard (or force reset screen) |
| Force reset (modal/page) | old/new password | dashboard when flag false |

## 13.2 Client state
| Store | Content |
|-------|---------|
| `access_token` | JWT string |
| `user` | public user from login/me |
| Derived | `isAdmin`, `isAssetManager`, `isDeptHead`, `isEmployee` |

## 13.3 Route guards (UI)
| Guard | Rule |
|-------|------|
| Guest only | login/signup — if token valid, redirect dashboard |
| Protected | any page under app shell — need token |
| Admin only | `/org` — user.role === ADMIN |
| Role-based nav | hide links; still backend-enforce |

## 13.4 On app load
```
if no token → guest
if token → GET /auth/me
   fail → clear token → login
   success → set user
   if must_reset_password → force reset UI
```

## 13.5 Signup UX copy (problem statement)
Show note:  
*“New accounts are created as Employee. An admin assigns Department Head or Asset Manager roles later.”*

---

# 14. Security checklist (depth)

| Check | Required for hackathon? | Logic |
|-------|-------------------------|-------|
| Hash passwords | **Yes** | Never store plain |
| Unique email | **Yes** | DB unique + handle 409 |
| Force EMPLOYEE on signup | **Yes** | Ignore client role |
| JWT secret from env | **Yes** | Not hardcoded in repo if possible |
| HTTPS in prod | Nice | Local HTTP OK |
| Re-check status/role from DB | **Yes** | Demote/deactivate works |
| 401 vs 403 correctly | **Yes** | AuthN vs AuthZ |
| CORS for Vite origin | **Yes** | localhost:5173 |
| Rate limit login | Optional | Brute force |
| Password complexity | Light | Min length enough |
| SQL injection | ORM params | Default OK |
| IDOR on /employees/{id} | Careful | Self vs admin rules |
| XSS token theft | Careful | Don’t put token in URL |
| CSRF | Low with Bearer header | Unlike cookie sessions |

---

# 15. Edge cases & decisions

| Scenario | Decision |
|----------|----------|
| Signup with role=ADMIN in body | Ignore; still EMPLOYEE |
| Login inactive | 403 ACCOUNT_INACTIVE |
| Token valid, user deleted | 401 |
| Token valid, role changed | Use DB role on this request |
| Admin deactivates self | Block (optional safeguard) |
| Last admin demoted | Block |
| Employee has null department | Allowed; some dept-scoped actions may fail until assigned |
| Email case | Store lowercase; compare lowercase |
| Concurrent promote | Last write wins; fine for hackathon |
| must_reset_password true | Allow login + password change only |
| created_by on signup | null |
| created_by on admin create | admin UUID |
| Department deleted while users point to it | Prefer soft-delete depts later; for now restrict delete if users linked |

---

# 16. Implementation order (auth only — step plan)

Do **not** jump to assets until this list is green.

| Step | Backend | Frontend | Done when |
|------|---------|----------|-----------|
| 1 | Confirm migration applies; fix FK if needed | — | tables exist |
| 2 | User model matches migration enums | — | ORM loads |
| 3 | Password hash/verify helpers | — | unit smoke |
| 4 | JWT issue/decode helpers | — | token round-trip |
| 5 | POST signup | Signup page | employee row created |
| 6 | POST login + last_login_at | Login page | token received |
| 7 | GET me + auth dependency | AuthProvider boot | refresh keeps session |
| 8 | require_roles dependency | Hide admin nav | 403 on /org APIs for employee |
| 9 | Seed admin (+ demo users) | Login as admin | demo accounts work |
| 10 | PATCH role + status | Employee directory tab (can wait for Org UI) | promote AM works |
| 11 | Password change + must_reset gate | Optional UI | column used |
| 12 | Error codes standardized | Show `detail` toasts | clean UX |

**Auth Definition of Done**
- [ ] Signup always EMPLOYEE  
- [ ] Unique email enforced  
- [ ] Login issues JWT; inactive blocked  
- [ ] `/me` returns fresh role/status  
- [ ] ADMIN seed exists  
- [ ] ADMIN can change role/status  
- [ ] Non-admin cannot call promote  
- [ ] password_hash never in responses  
- [ ] last_login_at updates on login  
- [ ] must_reset_password respected if you use temp passwords  

---

# 17. How auth plugs into the rest of AssetFlow (preview)

After auth is solid, every module reuses the same pattern:

```
Router endpoint
  → get_current_user (authN + ACTIVE)
  → require_roles(...) (authZ)
  → service method (business rules)
  → optional notify / activity_log with actor_id = user.id
```

Your `users.id` becomes:
- `allocated_by`, `raised_by`, `requested_by`, `approved_by`
- notification `user_id`
- activity_log `actor_id`
- audit `marked_by`, `created_by`

**Do not create separate login systems per role.**  
One user table, one token, many guards.

---

# 18. Testing matrix (manual / curl later)

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Signup new email | 201, role EMPLOYEE |
| 2 | Signup same email | 409 |
| 3 | Signup body includes role ADMIN | still EMPLOYEE |
| 4 | Login correct | 200 + token |
| 5 | Login wrong password | 401 |
| 6 | Login inactive | 403 |
| 7 | /me with token | 200 profile |
| 8 | /me without token | 401 |
| 9 | Employee calls promote role | 403 |
| 10 | Admin promotes to ASSET_MANAGER | 200; /me as that user shows new role |
| 11 | Admin sets INACTIVE; user calls API | 401/403 |
| 12 | Login updates last_login_at | timestamp changes |

---

# 19. Pair split for auth week/hour

| Backend owner | Frontend owner |
|---------------|----------------|
| Migration/model alignment | Login + Signup UI |
| Hash + JWT + routes | Token storage + axios interceptor |
| get_current_user / require_roles | AuthContext + /me on boot |
| Seed admin + demo users | Role-based sidebar |
| Promote/status endpoints | (Org Employee tab can come with Org Setup) |
| Error code consistency | Toast mapping for codes |

**Contract freeze for pair**
- Enum strings exactly: `EMPLOYEE`, `DEPARTMENT_HEAD`, `ASSET_MANAGER`, `ADMIN`  
- Status: `ACTIVE`, `INACTIVE`  
- Token header: `Authorization: Bearer`  
- Public user fields list in §6  
- Signup never accepts role  

---

# 20. Common mistakes to avoid

1. **Trusting role only from JWT** without DB reload → demote/deactivate lag  
2. **Allowing role on signup** → fails problem statement  
3. **Returning password_hash** in JSON  
4. **Separate user tables per role** → nightmare joins  
5. **Frontend-only role checks** → insecure API  
6. **No seed admin** → cannot demo promotion  
7. **Case-sensitive emails** → duplicate accounts  
8. **Using name as login** → email only  
9. **Forgetting UNIQUE email** handling → 500 instead of 409  
10. **Blocking signup when department list empty** → department_id is nullable for a reason  

---

# 21. One-page flow diagram

```
                    ┌──────────────┐
         ┌─────────►│   SIGNUP     │──► force role=EMPLOYEE
         │          │ status=ACTIVE│     hash password → users row
         │          └──────┬───────┘
         │                 │ optional auto token
         │                 ▼
┌────────┴───┐      ┌──────────────┐      ┌─────────────────────┐
│  REACT UI  │─────►│    LOGIN     │─────►│ JWT access_token    │
│ login/sign │      │ verify hash  │      │ + public user       │
└────────▲───┘      │ status check │      └──────────┬──────────┘
         │          │ last_login   │                 │
         │          └──────────────┘                 │ Bearer
         │                                           ▼
         │                              ┌────────────────────────┐
         │                              │  PROTECTED APIs         │
         │                              │  decode JWT → load user │
         │                              │  ACTIVE? role allowed?  │
         │                              └────────────┬───────────┘
         │                                           │
         │          ┌────────────────┐               │
         │          │ ADMIN only     │◄──────────────┘
         └──────────│ promote role   │  PATCH employees/{id}/role
                    │ set status     │  PATCH employees/{id}/status
                    └────────────────┘
```

---

# 22. Final summary

| Topic | Your project answer |
|-------|---------------------|
| ORM auth entity | Single `users` table (already migrated) |
| Login id | Unique `email` |
| Secret | `password_hash` only |
| Roles | Enum: EMPLOYEE · DEPARTMENT_HEAD · ASSET_MANAGER · ADMIN |
| Status gate | ACTIVE / INACTIVE |
| Signup | Public → always EMPLOYEE |
| Role assignment | ADMIN via employee directory |
| Session | JWT Bearer; re-load user each request |
| Extra columns you already added | phone, last_login_at, must_reset_password, created_by, department_id |
| Next after auth | Departments full CRUD → Categories → Assets… |

---

## Auth is done when

You can demo:

1. Public signup → employee  
2. Login all four seeded roles  
3. Employee **cannot** open admin org APIs  
4. Admin promotes employee → Asset Manager → new powers on next request  
5. Admin deactivates user → login/API blocked  
6. `/me` reflects truth after refresh  

---

*Next guide (when you want it): Departments & Organization Setup logic end-to-end, using the same style, still no code until you ask to implement.*
