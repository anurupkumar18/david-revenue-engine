# Phase 2 handoff

Living handoff doc. Updated on every push so anyone (or codex) can resume cold.
Full plan: `~/.claude/plans/i-m-working-on-the-abundant-hanrahan.md`.

## Goal

Add (1) real scheduled email sending with guardrails, (2) AI multi-turn reply
conversations, (3) daily/weekly stats-&-insights briefs — **keeping the keyless,
offline demo working**. Every live feature is gated behind a key with a deterministic
fallback (see env matrix in `README.md`).

## Architecture in one paragraph

Deterministic brain stays single-sourced in `lib/` (TS). FastAPI (`backend/`) is the
durable I/O + scheduling spine (tables, auth, ESP adapter, APScheduler, suppression/
caps/compliance). FastAPI calls back into Next (`NEXT_INTERNAL_URL`) for any decision
that needs the brain (drafting replies, computing briefs). No `RESEND_API_KEY` →
simulated send; no `AUTH_SECRET` → demo auto-login; no `ANTHROPIC_API_KEY` →
deterministic; `SCHEDULER_ENABLED` unset → no jobs.

## Status

### Phase 2a — Foundation ✅ (branch `feature/phase2a-foundation`)
- [x] `lib/sending.ts` — `shouldAutoSend` (conservative) + `scheduleStepTwo`. Smoke-tested.
- [x] Schema: `users`, `messages`, `send_jobs`, `suppressions`, `daily_send_counts`,
      `briefs` in `backend/models.py`; `user_id` on `icp_profiles`; additive
      `ensure_migrations` in `backend/database.py`.
- [x] Services: `security.py` (PBKDF2 + HMAC tokens), `esp_adapter.py` (Resend +
      simulated), `compliance.py` (unsubscribe tokens, suppression, CAN-SPAM footer),
      `auth.py` (sessions + demo bypass).
- [x] `routers/auth.py` (signup/login/logout/me); APScheduler skeleton
      (`services/scheduler.py`, gated) wired into `main.py` lifespan; `next.config.ts`
      rewrites for the new FastAPI paths.
- [x] Backend pytest suite begun (`backend/tests/`, 13 tests); `npm run test:backend`.
- [x] Boundary docs updated (`AGENTS.md`, `README.md`) + this handoff.

### Phase 2b — Sending ✅ (branch `feature/phase2b-sending`)
- [x] `services/sends.py`: `cap_remaining`/`record_send` vs `DAILY_SEND_CAP`,
      `decide_outbound` (mirrors `lib/sending.ts`), `drain_send_queue` (suppression + cap
      checks, CAN-SPAM footer, `List-Unsubscribe` header, simulated/real send).
- [x] `routers/sending.py`: `POST /api/sequences/{profile_id}/start` (step 1 now, step 2
      +3d), `GET /api/send-jobs/{profile_id}`, `/approve`, `/skip`, and `/run` (manual
      drain for keyless demo).
- [x] `routers/email.py`: `GET /api/unsubscribe?token=` → suppression + HTML page.
- [x] `services/scheduler.py send_queue_tick` → `drain_send_queue`.
- [x] UI: `lib/icp-api.ts` clients + `components/sending-panel.tsx` (enroll, queue,
      approve/skip, process-now, cap) wired as workspace section "06 · Send & Schedule".
- [x] 7 pytest cases; verified end-to-end in browser via the proxy.
- Note: standalone `app/inbox/[profileId]` deferred to 2c (lives with the reply review
  inbox). Verification left synthetic send/suppression rows on demo profile #4 (`Pattern`).

### Phase 2c — AI reply conversations ⬜
- `lib/reply-conversation.ts` (`buildReplyDraft`) + `lib/reply-validators.ts`
  (`validateReplyDraft`) — deterministic, smoke-tested, reuse `routeReply` + `validators`.
- `app/api/replies/converse/route.ts` — LLM draft → validate → fallback; never lose
  suppression (mirror `app/api/replies/route/route.ts` safety net).
- `routers/email.py`: `POST /api/email/inbound` (verify Svix sig with
  `RESEND_WEBHOOK_SECRET`) + `POST /api/email/simulate-inbound` (keyless). Thread by
  in-reply-to / sender; store inbound `messages`; call Next converse; apply conservative
  policy (`shouldAutoSend`) → auto-send via ESP or `needs_review`. Honor opt-outs.
- `GET/PATCH /api/threads/...` for the review inbox (approve/edit/send/discard).

### Phase 2d — Briefs ⬜
- `lib/brief.ts` (`buildBrief(counts, campaign)`) reusing `buildCampaignMetrics` +
  learning derivation. `app/api/briefs/generate/route.ts`.
- `routers/briefs.py`: `GET /api/briefs`, `GET /api/briefs/{profile_id}`,
  `POST /api/briefs/{profile_id}/run`. Scheduler `daily_brief_tick`/`weekly_brief_tick`
  aggregate DB counts → POST Next generate → store `briefs`.
- UI: `app/briefs/page.tsx` (all customers) + `app/briefs/[profileId]/page.tsx`.

## How to resume

```bash
git checkout feature/phase2a-foundation     # or the current phase branch
npm install
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && cd ..
# Green gate (must all pass before every push):
npm run smoke && npm run verify:campaign && npm run typecheck && npm run lint && npm run build && npm run test:backend
```

Run the stack: `./start.sh` (Next :3000 proxies to FastAPI :8000).
Drive the loop keyless: create a campaign → Start sequence (simulated) →
`POST /api/email/simulate-inbound` → review/auto-send → run a brief.

## Conventions / gotchas
- `lib/` internal imports must be **relative** (so `tsx` smoke runs).
- Next rewrites are afterFiles: Next brain routes (`/api/replies/converse`,
  `/api/briefs/generate`) win over the FastAPI proxy for the same prefix.
- Backend uses bare imports (`import database`); run pytest/uvicorn from `backend/`.
- Commit + push after every green increment. One branch per phase.
