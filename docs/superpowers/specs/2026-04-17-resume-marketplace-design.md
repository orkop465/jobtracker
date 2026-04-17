# Resume Marketplace — Design Spec

> **Status:** ready for implementation planning
> **Date:** 2026-04-17
> **Branch at authoring:** `dev`
> **Companion spec (deferred):** `2026-04-17-resume-marketplace-comments-design.md` (stub)

This document is self-contained. An implementer should be able to work from this spec and the existing codebase without any other context from the brainstorming conversation.

---

## 1. Problem and goal

JobTracker's Resumes tab currently lets a signed-in user upload private PDF resumes and attach them to applications. This spec adds a **resume marketplace**: a second mode on the Resumes tab where users publish **redacted** versions of their resumes for other users to view, rate, and learn from.

The goal is to turn the tool into a small learning community — users browse sanitized real-world resumes at their target role/seniority, see what good looks like, and recreate formats they like in their own resumes. Marketplace submissions are always separate artifacts from private resumes; the private resume manager is unchanged.

PII safety is enforced by a **guided user redaction flow** (black rectangles drawn over PII spans) backed by **admin review** before anything goes public. There is no automated PII detection in v1.

---

## 2. Scope

### 2.1 In scope (v1)

- Two entry points to create a submission:
  1. **Share** action on each row of the existing `/app/resumes` private list.
  2. **Add submission** button on the marketplace's "My submissions" tab, offering "Upload new" and "Use existing" (the latter disabled when the user has zero private resumes).
- **Redaction tool** at `/app/resumes/marketplace/submit`: browser-based canvas UI where the user draws black rectangles over PII, per page, and checks an affirmation before submitting.
- **Server-side rasterization pipeline**: every page is rendered to a PNG, black rectangles are burned in, the output is reassembled as an image-only PDF with metadata stripped. The client's output is never trusted; the server rebuilds from (source PDF + rectangle coordinates).
- **Admin review queue** at `/app/admin/marketplace`, gated by an `ADMIN_EMAILS` env-var allowlist. Admin can approve, reject (with reason), or unpublish at any time.
- **Public browse** at `/app/resumes/marketplace` with filtering on role category + seniority, three sort modes, **text-match search**, and a paginated grid.
- **Detail view** with an embedded PDF viewer (signed GCS URL).
- **Ratings**: 1–5 stars, one rating per user per resume, changeable, aggregated count + sum stored denormalized on the record.
- **Anonymous publishing**: uploader identity is never revealed publicly; admin only.
- **Per-user cap**: 5 pending + 10 published submissions per uploader. Rejected and unpublished rows don't count.
- **GCS lifecycle rule** for staging cleanup.
- Targeted **unit tests** for trust-boundary logic and **Playwright E2E tests** for key flows.

### 2.2 Out of scope (v1) — deferred

- Comments / written feedback (stub: `2026-04-17-resume-marketplace-comments-design.md`).
- User-facing "Report" button.
- Opt-in uploader handles (public display names, off by default, shown on submissions of users who opt in).
- Favoriting / saving resumes for later.
- Automated PII detection (regex/NER pre-fill of rectangles).
- Rich taxonomy (industry, target companies, tags).
- Mobile-native redaction tool (desktop-first in v1).
- Public (signed-out) browse.
- CDN or search-infrastructure investment.
- Background job queue (rasterization runs inline in the submit request).

---

## 3. Product decisions (locked)

| Decision | Choice | Reason |
|---|---|---|
| Redaction method | User draws black rectangles; admin reviews | User is the PII expert for their own resume; admin is final gate |
| Submission entry | Both paths (share existing + fresh upload) | Convenience without coupling private and public data models |
| Uploader identity | Fully anonymous publicly; FK stored for moderation | Redaction mindset doesn't stop at the PDF |
| Metadata | Title (free), role category (enum), seniority (enum), notes (free) | Enough structure for useful filters, not survey-like |
| Feedback mechanism | Star ratings only; comments deferred | Ratings carry moderation cost near zero |
| Admin identification | `ADMIN_EMAILS` env-var allowlist | Zero schema change, zero UI; upgradeable later |
| Submission cap | 5 pending + 10 published per uploader | Simple abuse floor |
| Search | `pg_trgm` trigram index on title + notes | Case-insensitive substring search without tsvector overhead |
| Browse visibility | Signed-in users only | Matches the rest of the app |

---

## 4. Architecture

### 4.1 Routes

Public (authenticated):

- `/app/resumes` — existing private resume list; **modification**: add a "Share a redacted version" action to each row.
- `/app/resumes/marketplace` — marketplace landing. Two tabs:
  - **Browse** (default): search + filters + grid.
  - **My submissions**: this user's submissions in any status, plus the "Add submission" CTA that opens the Upload-new / Use-existing chooser.
- `/app/resumes/marketplace/[id]` — public detail view (only if `status=PUBLISHED` or caller is admin).
- `/app/resumes/marketplace/submit?source=<stagingKey>` — redaction tool. Reached only from the share action or the Add-submission chooser.

Admin-only (404 for non-admins):

- `/app/admin/marketplace` — review queue with Pending (default) and Published tabs.
- `/app/admin/marketplace/[id]` — admin detail view with Approve / Reject / Unpublish actions.

### 4.2 API routes

Public (authenticated):

- `GET  /api/marketplace` — list published resumes. Query: `q`, `role`, `seniority`, `sort`, `cursor`.
- `GET  /api/marketplace/[id]` — fetch one (published only, or admin). Returns record + caller's current rating + short-lived signed GCS URL.
- `POST /api/marketplace/submissions` — create a submission. Multipart: `stagingKey`, `title`, `roleCategory`, `seniority`, `notes`, `rectangles` (JSON), `affirmed`.
- `POST /api/marketplace/staging` — upload or copy a source PDF to `marketplace-staging/`. Two modes:
  - `mode=upload` with multipart `file` — new upload.
  - `mode=existing` with `resumeId` — copy from caller's private resume.
  Returns `{ stagingKey }`.
- `PUT    /api/marketplace/[id]/rating` — body `{ stars: 1..5 }`. Upsert by `(publicResumeId, raterUserId)`. Blocks self-rating.
- `DELETE /api/marketplace/[id]/rating` — remove own rating.
- `GET  /api/me/is-admin` — returns `{ isAdmin: boolean }` for UI nav rendering. Always 200.

Admin-only (all re-check admin server-side):

- `GET  /api/admin/marketplace` — list submissions by status.
- `POST /api/admin/marketplace/[id]/approve` — transitions to `PUBLISHED`.
- `POST /api/admin/marketplace/[id]/reject` — body `{ reason }`, transitions to `REJECTED`.
- `POST /api/admin/marketplace/[id]/unpublish` — body `{ reason }`, transitions to `UNPUBLISHED`.

### 4.3 Trust boundaries

- **Ownership**: Every authenticated endpoint re-checks `userId` scoping on the target row. Matches the existing project rule (see `PROJECT_STATE.md` §6).
- **Admin**: `isAdmin(session)` is checked inside every `/api/admin/*` handler and the admin page guard. Never trust any client signal (cookie, header, query).
- **Redaction**: The server always rebuilds the public PDF from `(sourceBytes, rectangles[])`. Client-submitted output bytes are rejected.
- **Rating self-block**: Server compares `session.user.id` against the target's `uploaderUserId`.
- **Public response shape**: `uploaderUserId` and any other uploader-identifying field are stripped from all non-admin responses.

---

## 5. Data model

New Prisma types, all additive. One migration: `marketplace_v1`.

### 5.1 Enums

```prisma
enum MarketplaceRoleCategory {
  SWE
  PM
  DESIGN
  DATA
  OTHER
}

enum MarketplaceSeniority {
  STUDENT
  INTERN
  ENTRY
  MID
  SENIOR
  STAFF_PLUS
}

enum PublicResumeStatus {
  PENDING_REVIEW
  PUBLISHED
  REJECTED
  UNPUBLISHED
}
```

### 5.2 `PublicResume`

```prisma
model PublicResume {
  id              String                    @id @default(cuid())
  uploaderUserId  String
  uploader        User                      @relation("PublicResumeUploader", fields: [uploaderUserId], references: [id], onDelete: Cascade)

  title           String
  roleCategory    MarketplaceRoleCategory
  seniority       MarketplaceSeniority
  notes           String?

  gcsPath         String                    @unique
  pageCount       Int
  sizeBytes       Int

  status          PublicResumeStatus        @default(PENDING_REVIEW)
  rejectionReason String?
  reviewedAt      DateTime?
  publishedAt     DateTime?

  ratingCount     Int                       @default(0)
  ratingSum       Int                       @default(0)

  ratings         PublicResumeRating[]

  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  @@index([uploaderUserId])
  @@index([status, publishedAt])
  @@index([roleCategory, seniority, status])
}
```

### 5.3 `PublicResumeRating`

```prisma
model PublicResumeRating {
  id             String       @id @default(cuid())
  publicResumeId String
  publicResume   PublicResume @relation(fields: [publicResumeId], references: [id], onDelete: Cascade)

  raterUserId    String
  rater          User         @relation("PublicResumeRater", fields: [raterUserId], references: [id], onDelete: Cascade)

  stars          Int

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([publicResumeId, raterUserId])
  @@index([raterUserId])
}
```

### 5.4 `User` back-relations

Add two named relations to the existing `User` model — no new columns:

```prisma
publicResumes         PublicResume[]         @relation("PublicResumeUploader")
publicResumeRatings   PublicResumeRating[]   @relation("PublicResumeRater")
```

### 5.5 Search index

In the same migration, add the pg_trgm extension and a GIN trigram index:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "PublicResume_search_trgm_idx"
  ON "PublicResume"
  USING GIN (
    (lower("title" || ' ' || coalesce("notes",''))) gin_trgm_ops
  );
```

### 5.6 Design notes

- **No FK to `Resume`.** Even when a submission starts from an existing private resume, we copy bytes, not links. Deleting a private resume never affects public content.
- **Denormalized rating aggregates** (`ratingCount`, `ratingSum`). Recomputed in the same transaction as every rating write, via subquery (correct > fast at this scale).
- **`rejectionReason` serves both REJECTED and UNPUBLISHED**. The next action always overwrites the previous reason.
- **`REJECTED` and `UNPUBLISHED` rows don't count against the cap.** A rejected submission shouldn't penalize the user's slot budget.

---

## 6. Submission flow

### 6.1 Entry points → staging

All three paths converge on a staged PDF object in GCS at `marketplace-staging/<userId>/<sessionCuid>.pdf`, and a redirect to `/app/resumes/marketplace/submit?source=<stagingKey>`.

**Path A — Share from private list:**
1. Row-level "Share a redacted version" button in `/app/resumes`.
2. Client `POST /api/marketplace/staging?mode=existing&resumeId=...`.
3. Server verifies the resume is owned by caller, streams its GCS bytes to a new staging object, returns `{ stagingKey }`.
4. Client redirects to the submit page.

**Path B — Upload new from marketplace:**
1. "Add submission" → "Upload new" chooser.
2. File picker accepts PDF ≤ 2 MB.
3. Client `POST /api/marketplace/staging?mode=upload` multipart.
4. Server writes the PDF to a new staging object, returns `{ stagingKey }`.
5. Client redirects to the submit page.

**Path C — Use existing from marketplace:**
1. "Add submission" → "Use existing". Option only shown when user has ≥ 1 private resume.
2. Modal lists private resumes (label + filename).
3. Selecting one triggers Path A step 2 onward.

### 6.2 Redaction tool UX

**Layout** (`/app/resumes/marketplace/submit`):

- Left: scrollable stack of page canvases rendered via `pdfjs-dist`. Each page has a transparent overlay layer where the user drags to create rectangles.
  - Drag empty area → new rectangle.
  - Click rectangle → select; drag handles to resize; Delete key removes; arrow keys nudge 1 px.
  - Rectangles rendered as solid `var(--color-ink)` fills for the selected rectangle; others remain solid ink. Selected shows hairline `var(--color-survive)` outline.
- Right: metadata form + affirmation + submit button.
  - Title (required, max 100 chars).
  - Role category (required, dropdown).
  - Seniority (required, dropdown).
  - Notes (optional, max 500 chars).
  - Affirmation checkbox with exact text:

    > "I confirm I have covered every piece of personally identifiable information in this resume (name, contact info, specific employer/school names if I want them hidden, etc.). I understand an admin will review this before it goes public, but I am responsible for the accuracy of this redaction."

  - Submit button disabled until the checkbox is checked and all required fields are present.

**Rectangle storage format** (component state and API payload):

```ts
type Rectangle = {
  pageIndex: number;  // 0-based
  xNorm: number;      // 0..1, in PDF points space of that page
  yNorm: number;      // 0..1
  wNorm: number;      // 0..1
  hNorm: number;      // 0..1
};
```

Normalized coordinates survive any DPI change between client rendering and server rasterization.

**Constraints checked client-side (and re-checked server-side):**

- Page count ≤ 4.
- At least one rectangle present (prevent trivial mistakes — a resume that needed zero redactions is rare enough that we'd rather flag it).
- All rectangles within page bounds (`0 ≤ xNorm`, `xNorm + wNorm ≤ 1`, same for y).

### 6.3 Server-side rasterization pipeline

Triggered by `POST /api/marketplace/submissions`. Runs inline in the request handler. No background queue in v1.

**Steps:**

1. **Validate input** — affirmation present, required metadata present, rectangles well-formed, cap not exceeded.
2. **Fetch staged PDF** from `marketplace-staging/<userId>/<sessionCuid>.pdf`. Confirm ownership by path prefix.
3. **Render each page** at **150 DPI** using `pdfjs-dist` + `@napi-rs/canvas`. Page count ≤ 4 already enforced.
4. **Burn rectangles** — for each rectangle targeting the current page, fill a solid black rectangle on the PNG at coordinates `(xNorm * pixelWidth, yNorm * pixelHeight, wNorm * pixelWidth, hNorm * pixelHeight)`.
5. **Assemble output PDF** with `pdf-lib`: one image-only page per rendered PNG, page dimensions matching the source.
6. **Set output metadata explicitly**:
   - `/Title` = submitter's title (truncated to 100 chars).
   - `/Author` = empty.
   - `/Producer` = `"jobtracker-marketplace"`.
   - `/Creator` = `"jobtracker-marketplace"`.
   - `/CreationDate` = now.
   - `/ModDate` = now.
   - Explicit null for `/Subject`, `/Keywords`.
7. **Size check** — reject if output > 8 MB with a user-facing error.
8. **Write output** to `marketplace/<publicResumeId>.pdf` (where `publicResumeId` is generated before write so we can use it as the key).
9. **Insert `PublicResume` row** with `status = PENDING_REVIEW`.
10. **Delete staging object** — best effort; log on failure, don't fail the request.
11. **Respond** `{ id }` + `201`.

**Why this destroys data rather than hides it:** each output page is a single flat PNG inside the PDF. No text layer exists. Selecting, copying, or extracting text from a black region of the PDF produces nothing — there is literally nothing there. Original bytes are never served publicly.

**Failure modes and responses:**

| Condition | HTTP | Body |
|---|---|---|
| Affirmation missing/false | 400 | `{ error: "Affirmation required" }` |
| Required metadata missing | 400 | `{ error: "Title, role, and seniority required" }` |
| Cap exceeded | 409 | `{ error: "Submission cap reached", pending, published, limits: {pending:5, published:10} }` |
| No rectangles | 400 | `{ error: "At least one redaction required" }` |
| Rectangles out of bounds | 400 | `{ error: "Rectangle coordinates out of page bounds" }` |
| Zero rectangles | 400 | `{ error: "At least one redaction required" }` |
| Staging object not found / not owned by caller | 403 | `{ error: "Invalid source" }` |
| Source PDF fails to parse | 400 | `{ error: "Could not read PDF, try re-exporting" }` |
| Rasterization throws | 500 | `{ error: "Processing failed" }`; **staging object is NOT deleted** so the user can retry |
| Output > 8 MB | 400 | `{ error: "Output too large; try fewer pages" }` |

### 6.4 Staging cleanup

Primary mechanism: **GCS object lifecycle rule** on the resumes bucket, set once per environment:

> Delete any object whose name starts with `marketplace-staging/` and whose age ≥ 1 day.

Apply via `gcloud`:

```bash
cat > lifecycle.json <<'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 1,
          "matchesPrefix": ["marketplace-staging/"]
        }
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://$RESUMES_BUCKET --lifecycle-file=lifecycle.json
```

Or Console UI: Cloud Storage → Buckets → `$RESUMES_BUCKET` → Lifecycle tab → Add rule → Delete object / Age = 1 day / Prefix = `marketplace-staging/`.

**Belt-and-suspenders in-band cleanup:** when a user starts a new submission (any of paths A/B/C), `POST /api/marketplace/staging` first issues a prefix delete for `marketplace-staging/<userId>/*`, removing any prior in-flight staging objects for that user. Keeps staging tidy within a day.

---

## 7. Admin moderation

### 7.1 Admin identification

**Helper:** `lib/auth/admin.ts`.

```ts
export function isAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase().trim();
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email);
}
```

**Critical correctness note:** compare against `session.user.email`, which is the **display (real provider) email** populated by the `jwt`/`session` callbacks in `auth.ts`. Never compare against the internal synthetic `provider:id@oauth.local` — those are not the emails admins use.

### 7.2 GCP Console instructions (verbatim for operators)

Set `ADMIN_EMAILS` once per environment. In the Console:

1. Open **GCP Console → Cloud Run → Services → `jobtracker`**.
2. Click **Edit & deploy new revision**.
3. Scroll to **Variables & Secrets → Environment variables → Add variable**.
4. **Name:** `ADMIN_EMAILS`.
5. **Value:** your real login email (comma-separate for multiple — e.g. `you@example.com,other@example.com`).
6. Click **Deploy**.

gcloud equivalent:

```bash
gcloud run services update jobtracker \
  --region us-central1 \
  --update-env-vars "ADMIN_EMAILS=you@example.com"
```

Local dev: add `ADMIN_EMAILS=you@example.com` to `.env.local`.

### 7.3 Admin queue UI

Route: `/app/admin/marketplace` — returns 404 for non-admins (don't advertise the route). Reuses `MetricStrip` at the top showing counts: `Pending / Published / Rejected / Unpublished`.

Two tabs:

**Pending (default):**
- Query: `status = PENDING_REVIEW ORDER BY createdAt ASC LIMIT 100`.
- Columns: submitted (`font-mono tabular-nums` relative date), title, role badge, seniority badge, uploader email (admin-only), page count, size.
- Row click → `/app/admin/marketplace/[id]`.

**Published:**
- Query: `status = PUBLISHED ORDER BY publishedAt DESC LIMIT 100`.
- Extra columns: rating count, rating average.

No pagination in v1 — the `LIMIT 100` is a cliff that we'll lift when it matters.

### 7.4 Admin detail view

Route: `/app/admin/marketplace/[id]`.

- **Embedded PDF iframe** loaded with a freshly-signed short-lived GCS URL to the actual artifact the public would see.
- **Admin-only metadata block**: uploader email.
- **Public metadata block**: title, role, seniority, notes, submitted/published timestamps, current status, prior rejection reason if any.
- **Action buttons** (all `POST` to the respective admin API routes, each server-side re-checks `isAdmin`). Buttons are non-overlapping — only the actions valid for the current status are rendered:
  - **Approve** — sets `status = PUBLISHED`, stamps `publishedAt` (on first approve only — preserves original publish date on re-approve) and `reviewedAt`, clears `rejectionReason`. Available when current status is `PENDING_REVIEW`, `REJECTED`, or `UNPUBLISHED`.
  - **Reject** — opens a modal requiring a freetext reason (max 500 chars). Sets `status = REJECTED`, stores `rejectionReason`, stamps `reviewedAt`. Available **only when current status is `PENDING_REVIEW`**.
  - **Unpublish** — same modal as Reject. Transitions `PUBLISHED → UNPUBLISHED` with reason. Available **only when current status is `PUBLISHED`**. Use this when something slipped through review and you want to take it down; the distinct status preserves the fact that it was once live.

State transitions allowed:

```
PENDING_REVIEW  -> PUBLISHED | REJECTED
REJECTED        -> PUBLISHED
UNPUBLISHED     -> PUBLISHED
PUBLISHED       -> UNPUBLISHED
```

### 7.5 What the uploader sees

In the "My submissions" tab of `/app/resumes/marketplace`, each submission shows a status badge (Pending / Published / Rejected / Unpublished) and, when applicable, the rejection or unpublish reason. Submissions are not editable — to fix one, the user submits a new one.

### 7.6 Audit trail

Deliberately minimal: `status`, `reviewedAt`, `publishedAt`, `rejectionReason` on the record tell the story of the most recent decision. No separate audit log table.

Each admin action also emits a structured log line:

```
{
  event: "admin.marketplace.action",
  action: "approve" | "reject" | "unpublish",
  adminEmail: <string>,
  publicResumeId: <string>,
  reason: <string | null>,
  previousStatus: <string>,
}
```

---

## 8. Browse, detail, ratings

### 8.1 Marketplace landing — `/app/resumes/marketplace`

Authenticated. Two tabs:

- **Browse** (default).
- **My submissions.**

Top-right shows an **Admin** link to `/app/admin/marketplace` only when the `/api/me/is-admin` response is `true`.

### 8.2 Browse tab

**Filter/search/sort bar (top):**

| Control | Values | Default |
|---|---|---|
| Search input (debounced 250ms) | free text, max 100 chars | empty |
| Role category | All / SWE / PM / Design / Data / Other | All |
| Seniority | All / Student / Intern / Entry / Mid / Senior / Staff+ | All |
| Sort | Newest / Top-rated / Most-rated | Newest |

Search, filters, and sort all reflected in URL query string. Back/forward works.

**Results:** grid of cards (built on the `CompanyCard` primitive; per style guide), one per `PublicResume` with `status = PUBLISHED`. Card content:

- Title (Inter, `--color-ink`).
- Role + seniority badges (mono uppercase labels, `--color-line` border, `--color-ink-muted` text).
- Rating (`font-mono tabular-nums`): `4.3 ★ (12)` or `No ratings yet`.
- Page count and published date (mono, ink-muted).
- **No uploader info.**

Clicking opens `/app/resumes/marketplace/[id]`.

**Pagination:** cursor-based via `publishedAt`. "Load more" button pulls next 30. No virtualized list.

**Empty states:**

- Zero published overall → illustrative empty state with "Be the first" CTA that opens the My submissions tab.
- Filters/search yield zero → "No matches" + "Clear filters" button.

### 8.3 Sort SQL

- **Newest:** `ORDER BY publishedAt DESC`.
- **Top-rated:** `ORDER BY (ratingSum::float / NULLIF(ratingCount,0)) DESC NULLS LAST, ratingCount DESC`.
- **Most-rated:** `ORDER BY ratingCount DESC, publishedAt DESC`.

### 8.4 Search SQL

When `q` is non-empty:

```sql
WHERE lower("title" || ' ' || coalesce("notes",'')) LIKE '%' || lower($q) || '%'
```

The `GIN pg_trgm` index accelerates this `LIKE` pattern. Case-insensitive. Combines freely with role/seniority filters.

### 8.5 Detail view — `/app/resumes/marketplace/[id]`

Authenticated. 404 if `status != PUBLISHED` and caller is not admin.

Layout (top to bottom):

- **Header strip:** title, role + seniority badges, "submitted <relative date>", aggregate rating.
- **Notes block** if present.
- **PDF iframe**: `src` is a short-lived signed GCS URL minted server-side inside `GET /api/marketplace/[id]`.
- **Rating widget**: 5-star input.
  - If viewer hasn't rated: unfilled stars; click to commit.
  - If rated: stars show current value; "Change" replaces them, "Remove" clears.
  - **Hidden** when viewer is the uploader.

### 8.6 Rating API

`PUT /api/marketplace/[id]/rating` body `{ stars: 1|2|3|4|5 }`. Prisma upsert by `(publicResumeId, raterUserId)`. Inside the same transaction, recompute:

```sql
UPDATE "PublicResume"
SET "ratingCount" = (SELECT COUNT(*) FROM "PublicResumeRating" WHERE "publicResumeId" = $1),
    "ratingSum"   = (SELECT COALESCE(SUM(stars),0) FROM "PublicResumeRating" WHERE "publicResumeId" = $1)
WHERE id = $1;
```

`DELETE /api/marketplace/[id]/rating` — delete the rating; run the same recompute.

**Server-side rules (return 400/403):**

- Target must exist and be `status = PUBLISHED`.
- `stars` must be integer 1..5.
- Caller cannot rate own submission: `raterUserId != uploaderUserId`.

**Rate limit:** 60 rating writes per user per hour, in-memory counter per Cloud Run instance.

### 8.7 Public response shape (never leak uploader)

`GET /api/marketplace` and `GET /api/marketplace/[id]` return only these fields:

```ts
{
  id,
  title,
  roleCategory,
  seniority,
  notes,
  pageCount,
  sizeBytes,
  publishedAt,
  ratingCount,
  ratingSum,
  ratingAverage,   // derived client-side or server-side
  myRating?,       // detail view only
  signedUrl?,      // detail view only
}
```

No `uploaderUserId`, no `createdAt` at row level beyond what `publishedAt` provides, no reviewer info, no internal status history.

---

## 9. Non-functional

### 9.1 Per-user submission cap

Server-side at `POST /api/marketplace/submissions`:

```
pending   = count(PublicResume where uploaderUserId = me and status = PENDING_REVIEW)
published = count(PublicResume where uploaderUserId = me and status = PUBLISHED)
reject if pending >= 5 or published >= 10
```

Error response includes both counts and both limits.

### 9.2 Rate limits

- Rating writes: 60 per user per hour, in-memory.
- Submission creates: 10 per user per hour, in-memory.
- Admin endpoints: no rate limit.

In-memory counters are per-instance. Cloud Run at v1 scale runs as a single instance; if horizontal scale-out ever happens, move to a shared store (Redis, etc.) — called out as known follow-up work.

### 9.3 GCS layout (single bucket, `$RESUMES_BUCKET`)

| Prefix | Purpose | Lifecycle |
|---|---|---|
| `resumes/<resumeId>.pdf` | Private resumes (existing) | None |
| `marketplace-staging/<userId>/<sessionCuid>.pdf` | In-flight submissions | Delete after 1 day |
| `marketplace/<publicResumeId>.pdf` | Approved-or-pending public artifacts | None |

Bucket remains private. All reads via signed URLs minted by API routes that check access (public = `PUBLISHED` or admin).

### 9.4 Env / config checklist

New:

- `ADMIN_EMAILS` — comma-separated real emails of admins.

Unchanged but relevant:

- `RESUMES_BUCKET` — same bucket; no new bucket needed.

One-time GCS lifecycle rule per environment — see §6.4.

### 9.5 Observability

- Structured log for each admin action (see §7.6).
- Structured log for each rasterization: `{ event: "marketplace.rasterize", userId, pageCount, inputBytes, outputBytes, durationMs }`. Useful for tuning DPI or the 8 MB ceiling.
- No new dashboards in v1; Cloud Run request logs suffice.

### 9.6 Migrations

Single migration, `marketplace_v1`:

1. Create enums (§5.1).
2. Create `PublicResume` and `PublicResumeRating` tables with indexes (§5.2, §5.3).
3. Add back-relations to `User` (§5.4).
4. Create `pg_trgm` extension and GIN trigram index (§5.5).

Runs through the existing migration job pipeline:

```bash
$IMAGE = gcloud run services describe jobtracker --region us-central1 --format="value(spec.template.spec.containers[0].image)"
gcloud run jobs update jobtracker-migrate --region us-central1 --image $IMAGE
gcloud run jobs execute jobtracker-migrate --region us-central1
```

---

## 10. UI: visual system adherence

All marketplace UI follows `docs/superpowers/STYLE-GUIDE.md` (MKVDATA editorial system).

**Palette** — only the nine tokens:

- Page bg: `var(--color-canvas)`.
- Cards and inputs: `var(--color-surface)`.
- Primary text: `var(--color-ink)`.
- Labels / meta / timestamps: `var(--color-ink-muted)`.
- Borders: hairline `var(--color-line)`; `var(--color-line-subtle)` for internal dividers.
- Status accents:
  - Published, Approve button, positive deltas → `var(--color-survive)` (background tint `var(--color-survive-soft)` for chips if needed).
  - Rejected, Unpublished, errors → `var(--color-sink)`.
  - Pending → neutral ink on line border. No accent color.

**Typography** — Inter (sans) + JetBrains Mono (labels + numerics). Every number, date, count, rating uses `font-mono tabular-nums`. Eyebrow labels: mono uppercase, 11px, 0.14em tracking.

**Component reuse from `components/landing/` primitives:**

- `MetricStrip` — top of admin queue (pending/published/rejected counts).
- `CompanyCard` — base for the Browse grid cards. Wrap with a marketplace-specific className variant (neutral ink palette, no survive column tint) rather than the hero's offer-column styling.
- `StageColumn` — not used here; marketplace is a catalog, not a pipeline.

**New components live under** `components/app/marketplace/`. Pure hooks/helpers under `lib/app/marketplace/`. Colocate `*.test.ts` next to the source.

**Motion** — restrained. `.card-enter` (fade-up 480 ms ease-out-quart) on Browse grid on mount. 180 ms color transition on rating star hover. No flight paths, no count flashes, no sprites. Respects `prefers-reduced-motion` — either skip or snap to final state.

**Explicitly banned in marketplace code** (per style guide §9): cyan/neon, glow shadows, serif fonts, gradient-* utilities, ambient grid backgrounds, tickers, section-index labels in accent color, terminal metaphors ("Enter Terminal"), `bg-surface-0/1/2/3`, `text-accent`, width/height/top/left animations, perceivable loop resets.

**Note on the existing `/app/resumes` page**: it currently uses some legacy tokens (`section-index text-purple`). The broader authed-app restyle is a separate ongoing effort (see `PROJECT_STATE.md` and the landing-auth-rework plan). The marketplace UI is built to the new system from day one; the share button added to the existing resumes list can be styled minimally to fit whatever tokens that page currently uses, without blocking on the broader rework.

**Copy voice:** imperative, no marketing adjectives (§8 of the style guide). Concrete strings to use verbatim:

- Primary share action: "Share a redacted version".
- Primary submit action: "Submit for review".
- Affirmation: see §6.2.
- Rejection reason placeholder: "Tell the submitter what to fix — they'll see this."
- Browse empty state: "No published resumes yet. Be the first."
- Filter empty state: "No matches." / "Clear filters".
- Submission cap error: "You have N pending and M published submissions. Limits are 5 and 10. Wait for admin review or an existing submission to clear."

---

## 11. Libraries to add

| Package | Purpose | Usage |
|---|---|---|
| `pdfjs-dist` | PDF rendering | Client (preview / canvas) and server (rasterize) |
| `@napi-rs/canvas` | Node canvas backend | Server-side rasterization; no native system deps |
| `pdf-lib` | PDF assembly | Build output image-only PDFs |

All three are pure JS/TS packages — no Dockerfile changes, no system packages, fits existing Cloud Run deploy model.

---

## 12. Testing

### 12.1 Unit tests (Vitest)

Colocated `*.test.ts` files.

- `lib/auth/admin.ts` — parser handles whitespace, empty env, mixed case; correct compare against session display email; never matches synthetic `provider:id@oauth.local`.
- Rasterization pipeline — one integration test that runs a small fixture PDF through the pipeline and asserts:
  - Output is an image-only PDF (no extractable text via `pdf-lib` or `pdfjs` text extraction).
  - Metadata fields `/Author`, `/Subject`, `/Keywords` are empty/null.
  - `/Producer` is `"jobtracker-marketplace"`.
  - Rectangles appear as solid black pixels at expected pixel regions (sample a few coordinates).
- Submission API — happy path, cap enforcement, affirmation missing, rectangles out of bounds, invalid stagingKey, oversized output.
- Rating API — upsert creates and updates; aggregate recomputed correctly after create, update, and delete; self-rate blocked; invalid stars rejected; unique-per-user enforced.
- Admin API — non-admin returns 404; each transition updates the expected fields; action log emitted.

Fixtures under `tests/fixtures/marketplace/` (not under `public/`).

### 12.2 E2E tests (Playwright via playwright-cli)

Authored and run using the `playwright-cli` skill. Spec files under `tests/e2e/marketplace/`, fixture PDFs under `tests/e2e/fixtures/`.

Flows:

1. **Submit (upload-new)** — auth, open My submissions, click Add submission → Upload new, pick fixture PDF, draw one rectangle, fill metadata, check affirmation, submit, expect "Pending" badge on the new row.
2. **Submit (share-existing)** — auth with a user who has ≥1 private resume, open `/app/resumes`, click "Share a redacted version" on the row, complete redaction and metadata, submit, expect "Pending" badge.
3. **Affirmation gate** — complete all fields except the checkbox; verify submit button is disabled; check it; verify enabled.
4. **Cap enforcement** — seed 5 pending rows for user, attempt a 6th; expect 409 error surfaced in UI.
5. **Admin approve** — auth as admin, open queue, click a Pending row, click Approve, verify status transitions and row appears in Browse when loaded as a non-admin.
6. **Admin reject** — same as 5 with Reject + reason; switch to uploader session, verify reason visible in My submissions.
7. **Browse filtering + search** — seed varied published rows, exercise each filter and the search input; verify result set matches expectation.
8. **Rating + self-rate block** — rate another user's resume; verify aggregate updates; verify the rating widget is hidden when viewing own submission; confirm 403 from a direct API call.

Not wired into Cloud Build CI in v1; noted as follow-up.

---

## 13. Documentation updates

Update `PROJECT_STATE.md`:

1. Add section **9a. Marketplace system** after the existing Resume section (§9), with:
   - Summary of the flow (submit → redact → admin review → published).
   - Models added (`PublicResume`, `PublicResumeRating`) and status enum.
   - Key routes (user and admin).
   - Env/config notes (`ADMIN_EMAILS`, GCS lifecycle rule, `RESUMES_BUCKET`).
2. Remove the "no admin interface" and "no marketplace" items from the non-goals list where contradicted.
3. Add to "Known gaps and outstanding work": comments spec, report button, favoriting, automated PII, mobile redaction.

The plan will include the exact paragraphs to insert so the implementer doesn't freestyle prose.

---

## 14. Deployment checklist (in order)

1. Merge migration `marketplace_v1`.
2. Deploy the migration job with the new image:
   ```bash
   $IMAGE = gcloud run services describe jobtracker --region us-central1 --format="value(spec.template.spec.containers[0].image)"
   gcloud run jobs update jobtracker-migrate --region us-central1 --image $IMAGE
   gcloud run jobs execute jobtracker-migrate --region us-central1
   ```
3. Set `ADMIN_EMAILS` on the Cloud Run service (§7.2).
4. Apply the GCS lifecycle rule (§6.4).
5. Deploy the service revision.
6. Smoke test: submit a fixture PDF as admin user → approve own submission as admin → verify it shows in Browse → rate from a second account → unpublish from admin → verify removed.

Local dev setup: `ADMIN_EMAILS` in `.env.local`; `pg_trgm` is already available in standard Postgres ≥ 9.1.

---

## 15. Known follow-ups (next specs)

- `2026-04-17-resume-marketplace-comments-design.md` (stub written now) — threaded or flat comments with moderation.
- Report button + report queue.
- Opt-in uploader handles for users who want lightweight attribution/reputation.
- Favoriting / saving.
- Automated PII detection to pre-fill rectangles.
- Rich taxonomy (industry, target companies, tags).
- Mobile redaction tool.
- Moving rate limits to a shared store if Cloud Run scales out.
- Wiring Playwright E2E into Cloud Build CI.
