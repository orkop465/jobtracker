# Resume Marketplace Comments — Design Stub

> **Status:** stub — **not ready for implementation**. Needs another brainstorming pass before a plan can be written.
> **Date:** 2026-04-17
> **Parent spec:** `2026-04-17-resume-marketplace-design.md`
> **Depends on:** parent spec is implemented and shipped first.

This is a deliberately incomplete spec. It captures the basic idea, the things that are already decided, and — importantly — the **open questions** that the future implementer (or a future brainstorming session) must answer before this can be planned in detail.

---

## 1. Goal

Let users leave written feedback on a published marketplace resume in addition to a star rating. The intent is richer, more actionable signal than a number: "this one-page layout is tight, but the skills section is redundant with the bullets," not just "3 stars."

This was deferred from v1 because comments introduce moderation surface that star ratings do not, and that moderation work is worth a focused spec.

---

## 2. What's carried over from the parent spec

These apply and should not be re-decided:

- **Publishing is anonymous** to the public (§3 of parent). Commenters are also anonymous unless the future spec explicitly changes this. Commenter identity is stored (FK) for moderation; never returned to non-admin callers.
- **Admin is identified via `ADMIN_EMAILS` env var** (§7 of parent). Comments reuse this mechanism — no new role system.
- **Ratings remain unchanged.** Comments are additive; no rating behavior is modified. Aggregates on `PublicResume` continue to be `ratingCount` / `ratingSum` only.
- **Style system**: MKVDATA editorial per `STYLE-GUIDE.md`. New components under `components/app/marketplace/`.
- **Storage**: no file attachments on comments in any foreseeable version. Text only.
- **Trust boundary**: server is authoritative on all actions; no client-trusted display or action.

---

## 3. Decided (locked) even at the stub level

- **One model**, `PublicResumeComment`, linked to `PublicResume` by FK.
- **Author** stored as FK to `User`; never exposed publicly.
- **Soft delete** via a nullable `deletedAt` + `deletedReason`. Never hard-delete from the DB so moderation history survives.
- **Hidden comments** remain in the DB but are filtered out of public responses; admin can view them.
- **Commenting is signed-in only.**

Proposed minimal shape (open to change — see §5):

```prisma
model PublicResumeComment {
  id              String         @id @default(cuid())
  publicResumeId  String
  publicResume    PublicResume   @relation(fields: [publicResumeId], references: [id], onDelete: Cascade)

  authorUserId    String
  author          User           @relation(fields: [authorUserId], references: [id], onDelete: Cascade)

  body            String         // plain text only in v1, no markdown
  deletedAt       DateTime?
  deletedReason   String?
  deletedByAdmin  Boolean        @default(false)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([publicResumeId, createdAt])
  @@index([authorUserId])
}
```

---

## 4. Deferred / stub-level (explicit non-goals)

- No notifications (email, in-app). Commenters don't get pinged on replies. Adding this is a follow-up to the comments spec itself.
- No markdown or HTML rendering. Plain text, newlines preserved.
- No @-mentions.
- No edit history beyond "was this comment edited? show a small marker." No full version trail.
- No reactions (like/upvote on comments).
- No admin-authored "pinned" comments from you on a resume.

---

## 5. Open questions (must be answered before implementation planning)

These are the prompts the implementer or next brainstormer must resolve. Pasting these verbatim into a clarifying-questions pass is the intended workflow.

### 5.1 Structure

**Q1. Flat or threaded?** Flat (single-level list) ships faster, moderates more easily, loses conversational flow. Threaded (one level of reply) matches intuition for feedback-on-feedback but adds pagination complexity, parent-child deletion rules, and ordering choices.
- Recommendation placeholder: flat, one-level.

**Q2. Ordering?** Newest-first, oldest-first, highest-rated-author-first (not possible without reputation — skip), or admin-curated? Needs a decision before UI can be designed.

**Q3. Pagination?** "Load more" like the Browse grid, or show all up to a cap (say 100)? Or infinite scroll? Which is consistent with the rest of the app?

### 5.2 Rate limiting and abuse

**Q4. Per-user create rate limit?** Ratings are 60/hour; comments should probably be lower (10/hour?). Per-resume cap ("one comment per user per resume"), or allow multiple comments from the same user on the same resume?

**Q5. Minimum and maximum length?** Minimum discourages "nice!" / "👍"; max prevents essays. Proposal: 20–2000 chars. Needs confirmation.

**Q6. Cooldown after rejection?** If an admin deletes a user's comment, do we apply any consequences — temp ban from commenting, require admin pre-approval for next N comments, or nothing? What's the product stance on repeat offenders?

### 5.3 Moderation UX

**Q7. Pre-moderation or post-moderation?** Pre (comments land in a queue, only visible after admin approves) is maximally safe and matches the resume-submission flow; post (comments go live immediately, admin reviews reports) is more conversational but requires a report button to scale at all.

**Q8. User report button on comments** — needed for v1 of comments, or can we rely on direct admin spot-checks? If yes, this is the first place a `Report` model lands in the app.

**Q9. Admin surface.** Reuse `/app/admin/marketplace/[id]` detail view with a Comments section showing all comments (including deleted/hidden) and per-comment hide/restore actions? Or a separate `/app/admin/marketplace/comments` queue?

### 5.4 Display

**Q10. Commenter anonymity — really fully anonymous?** The parent spec made resumes anonymous. For comments on those resumes, do we stick with "anonymous" (no handle, indistinguishable commenters in a thread) or do we take this chance to introduce the **opt-in uploader handles** deferred idea as an opt-in commenter handle? Threaded conversations without any kind of handle are confusing ("who is this responding to which?").

**Q11. Self-comment — does the uploader comment on their own resume?** Allowed (useful for follow-up context) or blocked (avoid the uploader biasing discussion)?

**Q12. Where does the comment box live?** Bottom of detail view below the rating, collapsed by default behind a "Add a comment" button, or always expanded?

### 5.5 API shape

**Q13. Endpoints:**
- `GET /api/marketplace/[id]/comments` — list.
- `POST /api/marketplace/[id]/comments` — create.
- `DELETE /api/marketplace/[id]/comments/[commentId]` — delete own comment.
- `POST /api/admin/marketplace/comments/[id]/hide` — admin hide.
- `POST /api/admin/marketplace/comments/[id]/restore` — admin restore.

Confirm shape once Q1 (threading) is answered — threaded adds a `parentId` field and either nested or flat output.

### 5.6 Testing

**Q14.** All parent-spec testing patterns apply: unit tests for trust-boundary rules, Playwright E2E via `playwright-cli` skill for the happy paths, hide/restore, and self-delete. Specific E2E flows to be enumerated once Q1–Q12 resolve.

### 5.7 Migration

**Q15.** Single migration `marketplace_comments_v1`. No changes to existing `PublicResume` model unless Q-answers require a comment count denorm (likely yes, symmetric with rating aggregates — to be decided in the next pass).

---

## 6. Next steps to unblock

1. Run a brainstorming pass on this stub. Use Q1–Q15 as the clarifying-question list. Prefer multiple choice.
2. Produce a full design spec (replace this stub) following the same structure as the parent spec.
3. Then write an implementation plan.

Do **not** start implementation from this stub. It's incomplete by design.
