# Maakavoda (MKVDATA)

Personal job-application tracker — Kanban board, pipeline analytics, resume vault. Branded **Maakavoda** on the marketing surface and **MKVDATA** internally; both refer to the same app.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind v4 + hand-rolled design CSS in `styles/design/*.css` |
| Database | Postgres via Prisma 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth 5 (Google, GitHub, email/password with bcrypt + timing-attack mitigation) |
| File storage | Google Cloud Storage (resume PDFs) |
| Email | SMTP (password resets) |
| Tests | Vitest |
| Deploy | Cloud Run via Cloud Build (image in Artifact Registry) |

## Local dev

```bash
git clone <repo> && cd jobtracker
npm install                         # postinstall runs prisma generate
cp .env.local.example .env.local    # if a sample exists; else create manually
npx prisma migrate dev              # apply schema to local DB
npm run dev                         # http://localhost:3000
```

### Required env vars

Put these in `.env.local` (loaded automatically by Next).

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | NextAuth JWT signing secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth (read by NextAuth automatically) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth |
| `RESUMES_BUCKET` | GCS bucket name for resume uploads |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service-account JSON (for GCS) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | Outbound mail for password reset |
| `EMAIL_FROM` | From-address for transactional mail |

## Routes

| Route | Live file | Notes |
|-------|-----------|-------|
| `/` | `app/(public)/page.tsx` | Marketing landing |
| `/login` | `app/(auth)/login/page.tsx` | Sign in |
| `/register` | `app/(auth)/register/page.tsx` | Create account |
| `/forgot` | `app/(auth)/forgot/page.tsx` | Password reset |
| `/app` | `app/(app)/app/page.tsx` | Dashboard |
| `/app/applications` | `app/(app)/app/applications/page.tsx` | Kanban board |
| `/app/analytics` | `app/(app)/app/analytics/page.tsx` | Pipeline analytics |
| `/app/resumes` | `app/(app)/app/resumes/page.tsx` | Resume vault |
| `/app/account` | `app/(app)/app/account/page.tsx` | Settings |

## Project structure

```
app/
  (public)/        Marketing surface — landing page, public layout, fonts
  (auth)/          /login, /register, /forgot — shared auth-shell layout
  (app)/           Authenticated app — dashboard, applications, analytics, resumes, account
  api/             Route handlers (NextAuth, applications, resumes, dashboard, etc.)
  globals.css      Tailwind import + dashboard/app-shell CSS
  layout.tsx       Root HTML shell
components/
  landing/         Hero, stages, demo-board, marketplace, CTA, footer — composed by (public)/page.tsx
  auth/            auth-shell, mini-board, rotating-caption, password-strength
  app/             sidebar-nav, topbar, kanban/, dashboard/
  ui/              Shared primitives
lib/               Server utilities — prisma client, auth helpers, GCS, motion utilities, board logic
prisma/
  schema.prisma    Domain: User, Application, Resume, ApplicationStatusEvent, plus enums
  migrations/      Versioned SQL migrations
styles/design/     Layered design system — base.css, landing.css, sections.css, auth.css, app-shell.css, dashboard.css
public/            Static assets + design-reference/ (prototyping artifacts, not built)
src/types/         Ambient TypeScript module augmentation for next-auth Session/JWT
auth.ts            NextAuth config (canonical) — providers, session, timing-attack mitigation
```

## Design system

Three font families load from `app/(public)/layout.tsx` for the marketing surface:

- **Fraunces** (display) — landing headlines
- **Inter Tight** (sans) — body
- **JetBrains Mono** (mono) — numeric / metric callouts

CSS layering (`@import` order matters):

- `base.css` — reset + tokens
- `sections.css` — section primitives
- `landing.css` — landing-only components
- `auth.css` — auth-shell layout
- `app-shell.css` + `dashboard.css` — authed app

## Database

```bash
npx prisma migrate dev        # apply pending migrations
npx prisma migrate dev --name <name>   # create new migration
npx prisma studio             # GUI inspector at http://localhost:5555
npx prisma generate           # regenerate client (also runs on postinstall)
```

Domain core: `User` → owns `Application[]` (company, role, status, source, priority, salary, notes) → owns `Resume[]` (GCS-backed PDFs) and `ApplicationStatusEvent[]` (audit trail of stage transitions). Pipeline has 10 stages: `APPLIED → RECRUITER_SCREEN → OA → INTERVIEW_ROUND_1/2/3 → OFFER` with terminals `REJECTED`, `WITHDRAWN`, `GHOSTED`.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint over the repo |
| `npm test` | Vitest single run |
| `npm run test:watch` | Vitest watch mode |

## Testing

Vitest configured at `vitest.config.ts`. Test files live next to source as `*.test.ts(x)`. Run `npm test`.

## CI/CD

Every push to `main` automatically builds, tests, and deploys to Cloud Run via a Cloud Build GitHub trigger using `cloudbuild.yaml`.

Pipeline steps (in order):

1. Install npm deps + `prisma generate`
2. Run `npm run lint` and `npm test` in parallel — fail = no deploy
3. Build Docker image tagged with `$COMMIT_SHA`
4. Push image to Artifact Registry (`cloud-run-source-deploy/jobtracker`)
5. Deploy new Cloud Run revision **with `--no-traffic`** (zero-impact)
6. Update `jobtracker-migrate` job to the new image
7. Execute the migrate job and wait
8. Promote the new revision to 100% traffic — only if migrations succeeded

If steps 1–7 fail, prod keeps serving the previous good revision. No partial deploys.

Trigger config (set in GCP Console → Cloud Build → Triggers):

- Region: `us-central1`
- Event: push to branch `^main$`
- Config: `cloudbuild.yaml` (in repo)
- Service account: default Cloud Build SA

Required IAM on the Cloud Build service account (`<PROJECT_NUMBER>@cloudbuild.gserviceaccount.com`):

- `roles/run.admin`
- `roles/iam.serviceAccountUser`
- `roles/artifactregistry.writer`
- `roles/secretmanager.secretAccessor` (only if app uses Secret Manager)

### Manual deploy (fallback)

If the trigger is disabled or you need to ship from your laptop:

```bash
gcloud run deploy jobtracker --source . --region us-central1 --allow-unauthenticated
IMAGE=$(gcloud run services describe jobtracker --region us-central1 \
  --format="value(spec.template.spec.containers[0].image)")
gcloud run jobs update jobtracker-migrate --region us-central1 --image $IMAGE
gcloud run jobs execute jobtracker-migrate --region us-central1 --wait
```
