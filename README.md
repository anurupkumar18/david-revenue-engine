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

Do not build these in this MVP:

- Real email sending
- Auth
- CRM integration
- Billing
- Multi-tenant permissions
- Massive lead database
- Live scraping dependency for tests

LLM and live APIs are optional enhancements after the deterministic demo loop is green.

## David-Specific Language

David-specific offer language is only appropriate when David is the input campaign. Generic product inputs should show neutral campaign angles such as local demand capture, workflow diagnostic, workflow automation, channel expansion, or partner campaign.
