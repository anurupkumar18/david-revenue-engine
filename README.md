# David Revenue Engine

> **The sales brain for David AI.** It finds businesses leaking time, leads, or margin, diagnoses the right David offer path, writes the outreach, and routes every reply into the fastest path to recurring revenue.

This is a 24-hour hackathon MVP. It is **not** a generic Apollo/Clay clone — it's a GTM Fitting Engine positioned entirely around how David makes recurring revenue (David Marketing retainers, Growth Plans, The Fitting, Custom Agents, Custom AI OS builds, Embedded AI Teams, White-label Deployments, and the Partner Program).

## The demo loop

```
Product input → Fitting Strategy → target accounts → Leaks & Levers →
Fitting Score → Revenue Opportunity Score → Recommended David Offer Path →
land-and-expand plan → Conversion Outreach → Fast Conversion Router →
Revenue Pipeline update
```

Every account visibly answers: *who to sell to, what leak makes them buy, which David offer to route them into, how much recurring revenue they're worth, and the fastest next conversion action.*

## Quickstart

```bash
npm install
npm run smoke    # proves the deterministic engine works with NO API key
npm run dev      # http://localhost:3000
```

The entire demo runs **with zero API keys**. Everything is deterministic seed data + a deterministic scoring/routing/outreach/reply engine.

## Optional: enable the Claude layer

Copy `.env.local.example` → `.env.local` and add a key:

```env
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-opus-4-8   # optional override
```

When a key is present, the three API routes (Fitting Strategy, Conversion Outreach, Fast Conversion Router) use Claude (`claude-opus-4-8`, structured outputs) to author copy. **Every route falls back to the deterministic engine** when the key is absent or any call fails — the demo never depends on it. LLM-authored outreach is only used if it passes the same compliance validators as the deterministic copy.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the app locally |
| `npm run smoke` | Run the deterministic engine end-to-end and assert invariants (no network) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Architecture

- **`lib/` — the deterministic revenue brain (no UI, no LLM).** This is the source of truth.
  - `types.ts` — domain types (`RevenueAccount`, `DavidLeakType`, `DavidOfferPath`, `LandAndExpandPlan`, scores…)
  - `constants.ts` — offer-path metadata, leak metadata, leak→offer routing, CTAs, $ ranges
  - `scoring.ts` — Fitting Score + Revenue Opportunity Score (weighted formulas, grades)
  - `routing.ts` — leak → David offer path, land-and-expand plan, revenue model, rationale
  - `outreach.ts` — deterministic 2-step sequence generator (always passes validators)
  - `reply-router.ts` — keyword reply classifier → intent/stage/suppression + offer-aware templates
  - `validators.ts` — outbound copy rules (lowercase 2–4 word subjects, <100-word bodies, leak reference, low-friction CTA, no invented claims)
  - `strategy.ts` — deterministic Fitting Strategy generator
  - `seed.ts` — turns `data/seed-accounts.json` into fully scored + routed `RevenueAccount[]`
  - `store.ts` — Zustand client store (accounts, pipeline, drawer, strategy, outreach, routing)
  - `llm.ts` / `prompts.ts` — optional Claude layer + prompts/JSON schemas
- **`app/api/` — optional LLM proxies**, each with a deterministic fallback:
  - `fitting/analyze` · `outreach/generate` · `replies/route`
- **`components/` — the UI** (single-page, anchored sections): hero + KPIs, Fitting Strategy, Account Workspace + Revenue Opportunity drawer, Conversion Outreach, Fast Conversion Router, Revenue Pipeline board.
- **`data/`** — `seed-accounts.json` (15 prospects across local / applied-AI / partner buckets), `seed-replies.json`.
- **`scripts/smoke.ts`** — the keyless smoke test.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand · lucide-react · `@anthropic-ai/sdk`. Hand-rolled UI primitives (no component-library dependency). Dark "revenue-intelligence terminal" theme; fonts via Google Fonts `<link>` with system fallbacks.

## Non-negotiables (from the planning docs)

- Seed data + deterministic flow first; the demo must work with **no API keys**.
- **Do not** build real email sending, auth, CRM integration, scraping, or billing.
- Every account must show how it becomes recurring revenue for David.
- Outbound copy must follow the rules in `validators.ts`; unsubscribe replies are suppressed with no persuasion.

## Status

Built: deterministic engine, app shell + demo console, account workspace + Revenue Opportunity drawer, Fitting Strategy, Conversion Outreach, Fast Conversion Router → Revenue Pipeline, optional Claude layer.

Remaining polish ideas: richer loading/empty states, mobile pass, deploy to Vercel, pitch script. None are required for the core demo loop.

🤖 Built with [Claude Code](https://claude.com/claude-code)
