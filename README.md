# AI GTM Campaign Builder

> Campaign intelligence, not campaign sending.

This demo turns a website URL or product description into a full outbound campaign motion:
Product Input -> Generated Campaign Strategy -> ICP Filters -> Buying Signals -> 2-Step Sequence -> Dynamic Response Router -> Campaign Performance Tracker -> Learning Insights -> Improved Next Campaign -> Agency Workspace / Client Export.

It is deterministic-first. The full loop runs locally with no API keys, no live scraping dependency, no sending infrastructure, no CRM sync, no auth, no billing, and no lead database.

## Product Strategy

Sales teams do not need another tool that only sends more emails. They need a strategist that figures out who to target, why now, what to say, how to respond, and how to improve the next campaign.

The product creates recurring value through:

- Campaign tracking
- Outcome logging
- Performance dashboards
- Human approval and edit feedback
- Self-improving campaign recommendations
- Agency and client workspaces
- Reusable campaign memory

The app should not be positioned as an Apollo or Clay clone. The MVP is campaign intelligence before campaign sending.

## Demo Loop

```text
Product input
  -> campaign strategy
  -> ICP filters
  -> buying signals
  -> 2-step sequence
  -> reply router
  -> campaign tracker
  -> learning insights
  -> improved next campaign
  -> agency workspace / client export
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Campaign landing - fixture-backed URL input or manual campaign start |
| `/wizard` | 3-step campaign profile builder |
| `/review` | Accept/reject campaign profile |
| `/discover/:id` | Deterministic contact discovery handoff |
| `/business/:id` | Campaign workspace |
| `/dashboard` | Recover saved campaign profiles |
| `/dashboard/:id` | Campaign profile contacts and export queue |

## Quickstart

```bash
npm install
npm run smoke
npm run verify:campaign
npm run dev
```

For the full stack:

```bash
chmod +x start.sh
./start.sh
```

Open `http://localhost:3000`. The Next.js app proxies API calls to FastAPI on port 8000.

Or run separately:

```bash
# Terminal 1 - campaign profile API
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 - Next.js UI
npm install
npm run dev
```

Local data lives at `~/.icp-studio/data.db`. The internal table names still use the original ICP profile schema, but the product surface treats those rows as campaign profiles.

## Required Verification

| Command | What it proves |
| --- | --- |
| `npm run smoke` | Deterministic account engine plus campaign strategy, filters, signals, sequence, metrics, learning, and pricing invariants |
| `npm run verify:campaign` | Fixture/manual product input -> campaign profile creation -> accepted-profile handoff -> sequence copy/approval events -> reply routing/outcome logging -> persisted metrics and learning insights |
| `npm run typecheck` | TypeScript compile check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Architecture

- `lib/` is the deterministic brain and source of truth.
- `lib/campaign.ts` defines campaign-level state: input, strategy, filters, signals, two-step sequence, events, metrics, learning insights, next campaign, agency workspace, and pricing tiers.
- `lib/icp-bridge.ts` maps accepted campaign profiles into deterministic accounts, strategy, and persisted revenue/campaign state.
- `backend/` is FastAPI + SQLite for local profile, contact, outreach queue, and revenue-state persistence.
- `backend/fixtures/` contains fixture-backed website scrape inputs so `getdavid.ai` tests do not depend on network luck.
- `data/campaign-fixtures/` contains deterministic campaign verification inputs.
- `components/icp/` is the campaign profile builder shell.
- `components/` renders the campaign workspace: input, strategy, ICP filters, buying signals, two-step sequence, dynamic response router, tracker, learning insights, pipeline board, and agency export.
- `app/api/{fitting/analyze,outreach/generate,replies/route}` are optional Claude proxies. Each route falls back to deterministic logic and the demo must work without `ANTHROPIC_API_KEY`.

## Campaign Metrics

The deterministic campaign state tracks:

- Campaigns created
- Filters copied
- Sequences copied
- Replies routed
- Positive reply rate
- Meeting rate
- Bad-fit rate
- Winning signal
- Common objection
- Human edit rate
- Approval rate

## Pricing Mock

- Free
- Starter
- Pro
- Team
- Agency
- Enterprise
- White-label

## Boundaries

Phase 2 added real sending, accounts/auth, inbound email, a scheduler, suppression/caps,
and per-customer briefs — **all gated behind keys with a deterministic fallback so the
keyless demo never depends on them.** Still out of scope: CRM integration, billing, a
massive lead database, and any live-scraping dependency for tests.

LLM and live APIs are optional enhancements layered on top of the deterministic demo loop,
which must stay green at all times.

## Environment / secrets matrix

Every live feature is behind a key; unset = the demo-safe fallback.

| Var | Purpose | Unset behavior |
| --- | --- | --- |
| `RESEND_API_KEY` | Real send + inbound (Resend) | Simulated send (DB + pipeline only) |
| `RESEND_WEBHOOK_SECRET` | Verify inbound webhook (Svix) | `POST /api/email/simulate-inbound` only |
| `EMAIL_FROM` | Sender identity | `onboarding@resend.dev` (sandbox) |
| `AUTH_SECRET` | Session cookie signing | Demo Workspace auto-login (ungated) |
| `ANTHROPIC_API_KEY` | LLM copy/replies/briefs | Deterministic `lib/` output |
| `NEXT_INTERNAL_URL` | FastAPI → Next brain calls | `http://127.0.0.1:3000` |
| `SCHEDULER_ENABLED` | Run APScheduler jobs | Off (no background jobs) |
| `DAILY_SEND_CAP` | Per-customer daily cap | 50 |
| `AUTO_SEND_CONFIDENCE` | Auto-send threshold | 0.90 (conservative) |
| `COMPANY_POSTAL_ADDRESS` | CAN-SPAM footer | placeholder address |
| `TOKEN_ENCRYPTION_KEY` | Fernet key for OAuth tokens at rest | Derived from `AUTH_SECRET` in dev |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail OAuth (send via Gmail API) | Connect Gmail disabled |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft 365 OAuth (Graph `sendMail`) | Connect Microsoft disabled |
| `PUBLIC_BASE_URL` | OAuth redirect base (e.g. `http://localhost:3000`) | `http://localhost:3000` |

### OAuth mailbox sending (production)

1. Set `AUTH_SECRET` so sessions are real (signup/login in the UI).
2. Register OAuth apps:
   - **Google Cloud Console:** enable Gmail API, OAuth consent screen, redirect URI `{PUBLIC_BASE_URL}/api/email/callback/google`, scopes include `gmail.send`. Add test users while app is in Testing.
   - **Azure Portal:** app registration, redirect `{PUBLIC_BASE_URL}/api/email/callback/microsoft`, API permission `Mail.Send`.
3. Set `GOOGLE_CLIENT_ID/SECRET` and/or `MICROSOFT_CLIENT_ID/SECRET`, plus `TOKEN_ENCRYPTION_KEY` (optional; defaults to a hash of `AUTH_SECRET`).
4. Run `./start.sh` (sets `SCHEDULER_ENABLED=1` by default) or export it manually for automatic queue draining.
5. Sign in → **Dashboard** or **Send & Schedule** → Connect Gmail or Microsoft 365 → **Send test email** → start a sequence on a business profile.

Verify APIs: `npm run verify:email` (backend must be running on port 8000).

Manual E2E: connect mailbox as `sanjay.bhatia@quantiedge.com`, test send to that address, enroll a sequence using real `ICPContact.email` values from discovered contacts. `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt`, then `npm run test:backend`.

To exercise the automated back-and-forth email loop locally, run `npm run verify:email-loop` after the stack is up. It creates a demo profile, sends a sequence, drains the queue, and simulates two inbound replies through the same thread.

## David-Specific Language

David-specific offer language is only appropriate when David is the input campaign. Generic product inputs should show neutral campaign angles such as local demand capture, workflow diagnostic, workflow automation, channel expansion, or partner campaign.
