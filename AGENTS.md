<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI GTM Campaign Builder — agent guide

A 24-hour hackathon MVP. Read `README.md` first. Positioning is **AI GTM Campaign Builder** with the promise: **Campaign intelligence, not campaign sending.** The product turns any website or product description into a campaign strategy, ICP filters, buying signals, a two-step sequence, reply router, tracker, learning insights, and improved next campaign. Do not position it as a generic Apollo/Clay outbound clone.

## Run it

```bash
npm install
npm run smoke       # keyless deterministic engine check — keep this green
npm run verify:campaign
npm run dev
npm run typecheck
```

## Architecture (where things live)

- `lib/` is the **deterministic campaign brain** and the source of truth — no UI, no LLM. Campaign intelligence (`campaign.ts`), scoring (`scoring.ts`), leak→angle routing (`routing.ts`, `constants.ts`), outreach (`outreach.ts`), reply routing (`reply-router.ts`), validators (`validators.ts`), strategy (`strategy.ts`), seed builder (`seed.ts`), ROI (`roi.ts`), send guardrails (`sending.ts`), Zustand store (`store.ts`).
- `app/api/{fitting/analyze,outreach/generate,replies/route}` are **optional Claude proxies**. Each one tries the LLM and **falls back to the deterministic `lib/` function**. The app must keep working with no `ANTHROPIC_API_KEY`.
- `components/` is the single-page UI (anchored sections). Theme tokens + utility classes live in `app/globals.css`; class maps in `lib/theme.ts`.
- `data/seed-accounts.json` + `data/seed-replies.json` are the demo data.

## Hard rules (do not violate)

- **Deterministic-first, keyless demo is the top invariant.** Every feature must work with zero API keys, offline. The LLM, the ESP, real auth, and the scheduler are all pure enhancements behind fallbacks; never make the demo depend on a key. `npm run smoke`, `npm run verify:campaign`, `npm run typecheck`, `npm run lint`, `npm run build` must stay green.
- **Every live/external feature is gated behind a key with a graceful fallback** (see the env matrix in `README.md`): no `RESEND_API_KEY` → simulated send (DB + pipeline only, no network); no `AUTH_SECRET` → Demo Workspace auto-login; no `ANTHROPIC_API_KEY` → deterministic copy/briefs; `SCHEDULER_ENABLED` unset → no background jobs.
- **Phase 2 changed the old boundary.** Real email sending, accounts/auth, inbound email, a job scheduler, suppression/caps, and per-customer briefs are now **in scope** — but only behind the gates above. **Still do not build:** CRM integration, billing, live scraping dependency for tests, or a massive lead database.
- **Every campaign must surface recurring value** (campaign tracking, performance metrics, learning insights, and improved next campaign). This is enforced in `campaign.ts` and asserted by `scripts/smoke.ts` plus `scripts/verify-campaign-flow.ts`.
- **David-specific offer language is only allowed when David is the input.** Generic inputs must use neutral campaign angles.
- **Outbound copy rules** (`lib/validators.ts`): subject lowercase + 2–4 words; body < 100 words; reference the leak; one low-friction CTA; no invented claims. Unsubscribe replies → suppress, no persuasion. **Opt-outs are honored instantly, always.**
- **Sending guardrails are single-sourced in `lib/sending.ts`** (`shouldAutoSend`): conservative auto-send — opt-out, failed validation, exhausted cap, sensitive intent, sub-0.90 confidence, or grade-D account all route to human review. The suppression list is checked before every send.
- **LLM specifics:** use the official `@anthropic-ai/sdk` with `claude-opus-4-8` and structured outputs (`output_config.format`). Do not pass `temperature`/`top_p`/`budget_tokens` (they 400 on Opus 4.8). Validate LLM output before using it.

## Phase 2 architecture (spine vs brain)

- **The deterministic brain stays single-sourced in `lib/` (TS).** Never duplicate brain logic in Python.
- **FastAPI (`backend/`) is the durable I/O + scheduling spine:** new tables (`users`, `messages`, `send_jobs`, `suppressions`, `daily_send_counts`, `briefs` in `models.py`; additive `ensure_migrations` in `database.py`), session auth (`services/auth.py` + `routers/auth.py`, demo-bypass), an ESP adapter (`services/esp_adapter.py`, Resend + simulated), compliance (`services/compliance.py`), and an APScheduler loop (`services/scheduler.py`, gated by `SCHEDULER_ENABLED`, started in `main.py` lifespan).
- **FastAPI calls back into Next for any *decision* that needs the brain** (drafting/classifying replies, computing briefs) via `NEXT_INTERNAL_URL` (default `http://127.0.0.1:3000`). Next is always running in the demo, so this is safe. New Next brain routes: `app/api/replies/converse`, `app/api/briefs/generate`.
- **Backend tests:** `npm run test:backend` (pytest in `backend/.venv`). Set up the venv with `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt`.

## Conventions

Components PascalCase, functions camelCase, files kebab-case. Keep `lib/` internal imports relative (so `npm run smoke` runs under `tsx`); UI code uses the `@/` alias. After changes, run `npm run typecheck` and `npm run smoke`.
