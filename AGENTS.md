<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# David Revenue Engine — agent guide

A 24-hour hackathon MVP. Read `README.md` first. Positioning is **David Revenue Engine / GTM Fitting Engine** — a system that makes David recurring revenue, **not** a generic Apollo/Clay outbound clone.

## Run it

```bash
npm install
npm run smoke       # keyless deterministic engine check — keep this green
npm run dev
npm run typecheck
```

## Architecture (where things live)

- `lib/` is the **deterministic revenue brain** and the source of truth — no UI, no LLM. Scoring (`scoring.ts`), leak→offer routing (`routing.ts`, `constants.ts`), outreach (`outreach.ts`), reply routing (`reply-router.ts`), validators (`validators.ts`), strategy (`strategy.ts`), seed builder (`seed.ts`), Zustand store (`store.ts`).
- `app/api/{fitting/analyze,outreach/generate,replies/route}` are **optional Claude proxies**. Each one tries the LLM and **falls back to the deterministic `lib/` function**. The app must keep working with no `ANTHROPIC_API_KEY`.
- `components/` is the single-page UI (anchored sections). Theme tokens + utility classes live in `app/globals.css`; class maps in `lib/theme.ts`.
- `data/seed-accounts.json` + `data/seed-replies.json` are the demo data.

## Hard rules (do not violate)

- **Deterministic-first.** Every feature must work with zero API keys. The LLM is a pure enhancement behind a fallback; never make the demo depend on it.
- **Do not build:** real email sending, auth, CRM integration, scraping, billing, multi-tenant permissions.
- **Every account must surface how it becomes recurring revenue** (offer path + Revenue Opportunity + recurring potential + land-and-expand). This is enforced in `seed.ts` and asserted by `scripts/smoke.ts`.
- **Outbound copy rules** (`lib/validators.ts`): subject lowercase + 2–4 words; body < 100 words; reference the leak; one low-friction CTA; no invented claims. Unsubscribe replies → suppress, no persuasion.
- **LLM specifics:** use the official `@anthropic-ai/sdk` with `claude-opus-4-8` and structured outputs (`output_config.format`). Do not pass `temperature`/`top_p`/`budget_tokens` (they 400 on Opus 4.8). Validate LLM output before using it.

## Conventions

Components PascalCase, functions camelCase, files kebab-case. Keep `lib/` internal imports relative (so `npm run smoke` runs under `tsx`); UI code uses the `@/` alias. After changes, run `npm run typecheck` and `npm run smoke`.
