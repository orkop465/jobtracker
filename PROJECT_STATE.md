# JobTracker Project State and PRD

## Document purpose

This document is the current product, engineering, and operations reference for the `jobtracker` project.
It describes:

- what the product is supposed to do
- what is already implemented
- what is deployed in Google Cloud
- how authentication, data ownership, and analytics currently work
- how the repository is organized
- how to run, build, deploy, and migrate the application
- what has already been completed from the multi-phase roadmap
- what is still incomplete or in-flight

Current branch: `dev`
Current committed HEAD when this document was written: `7097358`

## 1. Product summary

JobTracker is a personal job application tracking web app.

At a high level, the app lets a logged-in user:

- create an account with email/password
- sign in with Google
- sign in with GitHub
- track job applications
- assign a resume to an application
- view application status history
- undo the most recent status transition
- upload resumes as PDFs
- securely view uploaded resumes through signed URLs
- see analytics for response rate, funnel progression, current pipeline counts, time-in-stage, and Sankey flow data

The app is designed as a multi-tenant system even though the current expected use case is likely personal/small-scale. Every user-owned record is scoped by `userId`.

## 2. Product goals

### Primary goals

- Provide a simple but professional application tracking tool.
- Support multiple auth methods without unsafe implicit account linking.
- Prevent cross-user data access on every server-side route.
- Make resumes first-class objects that can be attached to applications.
- Provide useful analytics without requiring manual export.
- Run cleanly on Google Cloud Run with Prisma/Postgres.

### Non-goals right now

- No employer/company-side collaboration.
- No public marketing site yet; `/` is still mostly starter content.
- No admin interface.
- No email verification, password reset, or magic-link flow.
- No mobile-native app.
- No polished design system yet; most UI is functional and inline-styled.

## 3. Current user-facing product state

### Public routes

- `/` public landing page placeholder
- `/login` public login page
- `/register` public registration page

### Protected routes

- `/app` dashboard
- `/app/applications`
- `/app/resumes`
- `/app/analytics`
- `/app/account`

### Authentication behavior

Implemented:

- Google OAuth login
- GitHub OAuth login
- email/password registration and login
- global protection for `/app/*`
- sign-out from account page

Current auth policy:

- OAuth provider identities are intentionally isolated
- no dangerous automatic cross-provider email linking
- Google and GitHub providers use provider-specific internal synthetic emails
- the real provider email is restored for session display in the UI
- credentials users use their actual email in the `User` table

This was done to avoid `OAuthAccountNotLinked` instability and to avoid insecure automatic provider merging.

### Applications behavior

Implemented:

- create application
- list applications
- delete application
- update application status
- attach/change resume on an application
- show timeline of status events
- undo most recent status change

Status model currently in use:

- `APPLIED`
- `RECRUITER_SCREEN`
- `OA`
- `INTERVIEW_ROUND_1`
- `INTERVIEW_ROUND_2`
- `INTERVIEW_ROUND_3`
- `OFFER`
- `REJECTED`
- `WITHDRAWN`
- `GHOSTED`

Display labels in UI and analytics:

- Applied
- Recruiter Screen
- OA
- Round 1
- Round 2
- Final Round
- Offer
- Rejected
- Withdrawn
- Ghosted

### Resumes behavior

Implemented:

- upload PDF resume
- label resume
- list resumes
- delete resume
- view resume using a signed URL route

### Analytics behavior

Implemented:

- response rate
- funnel counts
- current pipeline counts
- average time in stage
- Sankey node/link data
- SankeyMATIC-friendly export text
- Google Charts Sankey rendering directly on the site

### Account behavior

Implemented:

- show signed-in identity
- show linked provider rows for the current app account
- sign out

Current policy:

- provider linking UI is effectively disabled as a product direction right now
- previous linked rows were cleaned up at the database level for at least one affected user

## 4. Architecture summary

### Stack

- Next.js 16 App Router
- React 19
- TypeScript
- NextAuth/Auth.js v5 beta
- Prisma 7
- PostgreSQL
- Google Cloud Storage for resume files
- Google Cloud Run for service hosting
- Google Cloud Run Jobs for DB migrations
- Cloud Build for CI/CD

### Runtime model

- frontend pages and backend API routes live in the same Next.js app
- Prisma is used directly inside API routes and auth callbacks
- Auth.js uses Prisma adapter tables plus JWT session strategy
- file uploads go through API route, then to GCS, metadata stored in Postgres
- app routes under `/app/*` are protected in `proxy.ts`

## 5. Repository structure

### Root files

- `package.json`
  - dependencies, scripts, framework versions
- `package-lock.json`
  - lockfile
- `Dockerfile`
  - multi-stage build for Cloud Run image
- `docker-compose.yml`
  - local Postgres helper
- `cloudbuild.yaml`
  - CI/CD pipeline definition for Cloud Build
- `auth.ts`
  - source of truth for Auth.js configuration
- `proxy.ts`
  - route protection for `/app/*`
- `prisma.config.ts`
  - Prisma CLI configuration
- `tsconfig.json`
  - TypeScript config
- `next.config.ts`
  - Next config
- `eslint.config.mjs`
  - lint config
- `postcss.config.mjs`
  - PostCSS config
- `README.md`
  - still partly template-derived, includes Cloud Build notes
- `PROJECT_STATE.md`
  - this document

### `app/`

App Router source code.

- `app/layout.tsx`
  - root layout
- `app/globals.css`
  - global CSS
- `app/favicon.ico`
  - favicon

#### `app/(public)/`

- `app/(public)/page.tsx`
  - current public landing page placeholder
  - still mostly default starter content

#### `app/(auth)/`

- `app/(auth)/login/page.tsx`
  - server wrapper for login page
  - redirects authenticated users to `/app`
- `app/(auth)/login/login-client.tsx`
  - client login UI
  - Google, GitHub, credentials sign-in
  - shows `OAuthAccountNotLinked` message when relevant
- `app/(auth)/register/page.tsx`
  - credentials registration page
  - auto signs in after successful register

#### `app/(app)/app/`

- `app/(app)/app/page.tsx`
  - dashboard/home for signed-in users
- `app/(app)/app/applications/page.tsx`
  - applications management screen
  - currently has local uncommitted Phase J UX improvements
- `app/(app)/app/resumes/page.tsx`
  - resumes management screen
  - currently has local uncommitted Phase J UX improvements
- `app/(app)/app/analytics/page.tsx`
  - analytics dashboard with Sankey rendering
- `app/(app)/app/account/page.tsx`
  - account summary and sign-out access
- `app/(app)/app/account/sign-out-button.tsx`
  - sign-out button component

### `app/api/`

#### Health

- `app/api/health/db/route.ts`
  - DB health check route

#### Auth

- `app/api/auth/[...nextauth]/route.ts`
  - Auth.js route handler wiring

#### Registration

- `app/api/register/route.ts`
  - credentials account creation endpoint

#### Applications

- `app/api/applications/route.ts`
  - list current user applications
  - create application with current `userId`
- `app/api/applications/[id]/route.ts`
  - get, patch, delete single application with ownership enforcement
- `app/api/applications/[id]/status-events/route.ts`
  - timeline events scoped to application and user
- `app/api/applications/[id]/undo-status/route.ts`
  - undo most recent status transition

#### Resumes

- `app/api/resumes/route.ts`
  - list resumes, upload resume
- `app/api/resumes/[id]/route.ts`
  - delete resume with ownership check
- `app/api/resumes/[id]/view/route.ts`
  - verify ownership and return signed GCS URL

#### Analytics

- `app/api/analytics/route.ts`
  - tenant-scoped analytics endpoint
  - returns summary, funnel, time-in-stage, pipeline counts, Sankey data

### `lib/`

- `lib/prisma.ts`
  - Prisma client singleton

### `src/`

This directory contains compatibility/re-export helpers and types.

- `src/auth.ts`
  - re-export of root `auth.ts`
- `src/lib/prisma.ts`
  - duplicate/re-export style helper
- `src/types/next-auth.d.ts`
  - NextAuth type augmentation so `session.user.id` exists

### `prisma/`

- `prisma/schema.prisma`
  - database schema
- `prisma/migrations/*`
  - SQL migrations

Current migrations:

- `20260129162243_init`
- `20260129202728_application_fields`
- `20260202025425_resumes`
- `20260203053838_status_events`
- `20260208204657_auth_multitenant`
- `20260218173500_status_redesign`

### `scripts/`

- `scripts/cleanup-provider-links.js`
  - one-off database cleanup script used to remove old GitHub provider links for users who also had Google-linked identities, as part of the auth cleanup effort

### `public/`

Static assets, mostly starter assets from the default Next template.

## 6. Database model

The database is PostgreSQL and Prisma-managed.

### Core tables

#### `User`

- primary identity table
- stores:
  - email
  - name
  - image
  - password hash for credentials users
  - timestamps

#### `Account`

- Auth.js provider account table
- one row per linked auth provider account
- unique on `(provider, providerAccountId)`

#### `Session`

- Auth.js session table
- still present because Prisma adapter expects it
- app runtime currently uses JWT session strategy rather than DB session strategy

#### `VerificationToken`

- Auth.js support table
- not heavily used in current feature set

#### `Resume`

- user-owned resume metadata row
- stores:
  - `userId`
  - label
  - `gcsPath`
  - original filename
  - mime type
  - size in bytes
  - createdAt

#### `Application`

- user-owned application row
- stores:
  - company
  - role title
  - job URL
  - location
  - current status
  - appliedAt
  - optional `resumeId`
  - createdAt / updatedAt

#### `ApplicationStatusEvent`

- append-style status transition history
- stores:
  - `userId`
  - `applicationId`
  - `fromStatus`
  - `toStatus`
  - occurredAt
  - voiding fields for undo/audit future-proofing

### Multi-tenancy enforcement

This has already been implemented as a hard rule:

- every user-owned query is scoped by `userId`
- list queries use `where: { userId }`
- object queries use composite ownership conditions
- update/delete operations are ownership-scoped
- resume signed URL route verifies ownership before signing
- application create/update validates attached `resumeId` belongs to the same user

## 7. Authentication design and current policy

### Current providers

- Google
- GitHub
- Credentials

### Files involved

- `auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/login-client.tsx`
- `app/(auth)/register/page.tsx`
- `proxy.ts`
- `src/types/next-auth.d.ts`

### Why the auth setup looks unusual

The project originally hit several real-world auth failures:

- build/type issues with Auth.js callback typing
- `Configuration` errors in production
- Prisma adapter failures due to missing DB tables during a bad migration state
- `OAuthAccountNotLinked` issues when signing in with Google and GitHub using the same real-world email
- inconsistent behavior around linked providers

The current resolution is:

- use JWT sessions for reliability with credentials login
- keep provider identities isolated rather than auto-linking by email
- store provider-specific synthetic emails internally:
  - `google:<provider-id>@oauth.local`
  - `github:<provider-id>@oauth.local`
- store real provider email in JWT for display so the UI still shows the real email
- force account-selection behavior where needed:
  - Google prompt `select_account`
  - GitHub prompt `login`
- redirect authenticated users away from `/login` back to `/app`

### Credentials auth

- `POST /api/register` creates a user with bcrypt hash
- login uses Auth.js credentials provider
- password minimum is 8 chars
- bcrypt compare is done in provider `authorize`

### OAuth auth

Google:

- prompt selection enforced to reduce wrong-account silent reuse

GitHub:

- login prompt enforced to reduce cached-session mismatches

### Provider-linking policy

Current product direction:

- do not rely on implicit email-based provider linking
- do not enable dangerous account linking
- treat providers as isolated identities unless explicit DB relationship exists

Historical note:

- there was a temporary explicit provider-linking feature
- later the direction was changed away from that
- a DB cleanup script removed at least one legacy cross-linked GitHub relation

## 8. Status system

### Canonical backend statuses

- `APPLIED`
- `RECRUITER_SCREEN`
- `OA`
- `INTERVIEW_ROUND_1`
- `INTERVIEW_ROUND_2`
- `INTERVIEW_ROUND_3`
- `OFFER`
- `REJECTED`
- `WITHDRAWN`
- `GHOSTED`

### Human display mapping

- Applied
- Recruiter Screen
- OA
- Round 1
- Round 2
- Final Round
- Offer
- Rejected
- Withdrawn
- Ghosted

### Status history

- every meaningful status change creates an `ApplicationStatusEvent`
- timeline UI reads from `/api/applications/[id]/status-events`
- undo uses `/api/applications/[id]/undo-status`
- timeline and undo were previously broken because events were not being created during update; that was fixed

## 9. Resume system

### What is implemented

- upload PDF
- store metadata in Postgres
- store file in GCS
- delete resume row
- view via signed URL
- attach resume to application
- validate ownership when attaching resume to application

### Security rules

- signed URLs are only generated after ownership verification
- application `resumeId` is only accepted if the resume belongs to the current user

### Not yet implemented

- content hash dedupe
- `(userId, fileHash)` uniqueness
- rename/edit resume metadata beyond current label at upload time

## 10. Analytics design

### API

`GET /api/analytics`

Returns:

- `summary`
  - total applications
  - responded applications
  - response rate
- `funnel`
  - applied
  - screen
  - interview
  - offer
  - terminal outcomes
- `pipelineCounts`
  - raw backend enum keyed counts
- `pipelineCountsLabeled`
  - human-labeled counts
- `timeInStage`
  - average hours and sample counts
- `sankey`
  - `nodes`
  - `links`
  - `sankeymaticText`
  - `googleChartRows`

### UI

- analytics page renders Google Charts Sankey directly on-site
- Sankey styling was adjusted to look closer to SankeyMATIC
- tooltip clutter was removed
- labels were changed from enum format to human-readable format

## 11. Current PRD status by phase

### Auth baseline

Completed:

- Google auth works
- GitHub auth works
- credentials auth works
- `/app/*` is protected
- login redirect behavior is correct
- sign-out exists

### Phase D: multi-tenancy enforcement

Completed.

Implemented across applications, resumes, signed URL routes, and status event routes.

### Phase E: auth routing UX and structure

Completed.

- `/` public
- `/login` public
- `/register` public
- `/app/*` protected through `proxy.ts`

### Phase F: status redesign

Completed.

- backend enum redesigned
- migration added
- UI labels updated

### Phase G: resume selection on applications

Completed.

- create application can include resume
- update application can change resume
- ownership enforced

### Phase H: analytics groundwork

Completed.

- summary
- funnel
- pipeline counts
- time-in-stage
- Sankey-ready structure
- on-site Sankey rendering

### Phase I: CI/CD

Partially completed / scaffolded.

Implemented:

- `cloudbuild.yaml`
- README notes
- intended build/deploy/update-migrate-job/execute-migrate-job pipeline

Not yet confirmed end-to-end via GitHub trigger in this repository state:

- actual GitHub trigger creation in GCP console
- IAM confirmation for Cloud Build service account
- automatic production deploy validation from Git push

### Phase J: minimal UX tightening

In progress locally, not yet committed or deployed.

Local uncommitted work:

- better applications filtering
- load more on applications list
- improved empty states
- more consistent inline error banners

## 12. Google Cloud / production environment

### Known GCP components

Service:

- Cloud Run service: `jobtracker`
- Region: `us-central1`

Migration runtime:

- Cloud Run job: `jobtracker-migrate`
- used to run Prisma migrations against production DB

Artifact destination:

- Artifact Registry image path pattern:
  - `us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/jobtracker:$COMMIT_SHA`

Domain:

- production site is served at `https://maakavoda.com`

### Production auth callback URIs

Google OAuth callback:

- `https://maakavoda.com/api/auth/callback/google`

GitHub OAuth callback:

- `https://maakavoda.com/api/auth/callback/github`

### Current deployment model

The service is deployed from source using Cloud Build / Cloud Run buildpacks or Docker build path through:

- manual `gcloud run deploy ... --source .`
- or intended future GitHub-triggered `cloudbuild.yaml`

Migrations are intentionally separated into a Cloud Run Job so schema changes can be run with the exact same image as the service.

### Required runtime secrets / environment variables

Known required variables:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Likely/optionally required depending on environment setup:

- `AUTH_URL`
- `AUTH_TRUST_HOST`
- `RESUMES_BUCKET`

### Historical production issues already encountered

- failed Prisma migration left Auth tables missing
- service deployed while schema was out of sync
- provider account collisions caused login issues
- Cloud Run traffic sometimes remained pinned to older revisions after new deploys

Operational lesson:

- after deploy, always verify active traffic revision if UI changes do not appear

## 13. Deployment and operations commands

### Local database helper

Start local Postgres:

```powershell
docker compose up -d
```

### Local development

This environment has Node installed in `C:\Program Files\nodejs`, but `npm` may not resolve correctly in some shells.

Reliable local commands:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
& 'C:\Program Files\nodejs\npm.cmd' run dev
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run lint
```

### Prisma

Generate Prisma client:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
```

Run local migrations:

```powershell
npx prisma migrate dev
```

Deploy migrations:

```powershell
npx prisma migrate deploy
```

### Manual Cloud Run deploy

```powershell
gcloud run deploy jobtracker --source . --region us-central1 --allow-unauthenticated
```

### Update migration job to same image as service and execute

```powershell
$IMAGE = gcloud run services describe jobtracker --region us-central1 --format="value(spec.template.spec.containers[0].image)"
$IMAGE
gcloud run jobs update jobtracker-migrate --region us-central1 --image $IMAGE
gcloud run jobs execute jobtracker-migrate --region us-central1
```

### Cloud Build trigger pipeline

The intended Cloud Build pipeline is defined in `cloudbuild.yaml`.

It performs:

1. Docker build
2. Docker push
3. Cloud Run deploy
4. migration job image update
5. migration job execution with wait

### Useful operational checks

Health check:

```powershell
Invoke-WebRequest https://maakavoda.com/api/health/db
```

Auth providers route:

```powershell
Invoke-WebRequest https://maakavoda.com/api/auth/providers
```

Cloud Run service image:

```powershell
gcloud run services describe jobtracker --region us-central1 --format="value(spec.template.spec.containers[0].image)"
```

### Git

Current branch:

```powershell
git branch --show-current
```

Current short SHA:

```powershell
git rev-parse --short HEAD
```

## 14. Major implementation history so far

This section is a practical summary of the major work completed through the collaboration history.

### Auth stabilization

- introduced root `auth.ts` as source of truth
- replaced old middleware flow with `proxy.ts`
- fixed Next.js/Auth.js build/type issues
- switched credentials auth to JWT sessions
- stabilized OAuth flows for Google and GitHub
- added real-email session display on top of synthetic provider emails
- restored sign-out UI

### Migration recovery

- production auth broke because Prisma adapter tables were missing after failed migration state
- production DB was reset and migrations were reapplied cleanly
- migration job flow was restored

### Multi-tenant enforcement

- all core application/resume routes now require authenticated session
- all key queries are `userId` scoped
- signed resume view route checks ownership first
- application-resume ownership is validated

### Status and timeline system

- redesigned statuses to a more realistic recruiting pipeline
- added status-event creation on updates
- fixed timeline display and undo functionality

### Resume-to-application integration

- create flow now supports selecting a resume
- edit flow supports changing associated resume

### Analytics groundwork

- built analytics API
- added pipeline, response rate, time-in-stage, and Sankey support
- improved Sankey display labels and styling

### CI/CD groundwork

- added `cloudbuild.yaml`
- documented intended trigger and IAM needs

## 15. Known gaps and outstanding work

### Product/design gaps

- `/` is still starter placeholder content
- login/register/app pages are functional but not polished
- no toasts or shared design primitives
- no mobile-first refinement pass yet

### Feature gaps

- no password reset
- no email verification
- no resume dedupe/hash support
- no search/sort/pagination at API level yet
- no explicit tests in repo
- no robust account settings management

### DevOps gaps

- Cloud Build trigger existence/config still needs final validation
- README is still partly default Next.js template text
- no formal environment setup doc yet beyond this file

### Current local in-progress work

- Phase J UX changes in applications/resumes pages
- built locally but not committed/deployed

## 16. Recommended immediate next steps

1. Review and either commit or revise the local Phase J UX changes.
2. Start the app locally and verify Applications and Resumes UX changes.
3. Deploy Phase J only after local review.
4. Replace the placeholder public landing page at `/`.
5. Finalize and validate the GitHub-to-Cloud-Run Cloud Build trigger.
6. Add automated tests for auth-protected API routes and ownership checks.

