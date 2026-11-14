<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working alongside other agents

Claude Code and Devin both work on this repo, and neither can message the other directly. This file and PR descriptions are how they share context.

- Before starting and before pushing, fetch `main` and check open and recently merged PRs.
- Say what changed and why in the commit or PR, and call out anything the other agent needs to know.
- Add lasting rules here so both agents see them.

## Database

- Local `.env` points `DATABASE_URL` at the Neon `dev` branch. Production is only reached through `npm run db:status:prod` and `npm run db:migrate:prod`.
- Vercel's build does not run migrations. After merging a migration, it still has to be applied with `db:migrate:prod`.
- Do not run a Strava sync against the `dev` branch: it holds a copy of the production tokens, and refreshing them can invalidate production's copy.

## Code layout

- **Pages stay thin.** A page in `src/app/(protected)/` authenticates, loads data and composes components. Queries and calculations live in `src/lib/`, and page-specific components in an underscore folder next to the page (for example `_dashboard/`).
- **Pure vs database code.** Calculations that need no database are their own modules so they can be unit tested: `dashboard-summary`, `health-parse`, `ics`, `nutrition`, `nutrition-insights`' rules. Modules that talk to Prisma (`dashboard-data`, `health-ingest`, `sync`) call into them.
- **Route handlers do three things:** check the credential, parse the request, call a function in `src/lib/`. See `api/ingest/health/route.ts` and `api/calendar/[token]/route.ts`.
- **Shared helpers, do not redefine them locally:** `lib/format` (durations, distances), `lib/time` (`DAY_MS`, `daysAgo`, `startOfWeekUtc`, `localDateString`, `LOCAL_TIMEZONE`), `lib/secrets` (constant-time secret comparison), `lib/session` (`requireUserId` for server actions).
- **Secrets in URLs or headers** (MCP, calendar, cron, ingest) are compared with `lib/secrets` and fail closed when the env var is missing or too short.

## Checks before pushing

Run `npm test`, `npx tsc --noEmit` and `npm run build`. Add a test next to any new pure calculation (`src/lib/__tests__/`). If a change is visible in the app, open it locally against the `dev` branch; do not assume it renders.
