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
- Vercel's build does not run migrations. After merging a migration, it still has to be applied with `db:migrate:prod`. Other people host their own copies too, so migrations must apply cleanly to an existing database (no edits to merged migrations).

## Multi-user rules

- This app is multi-user. Every query on user data filters by `userId`; never use `prisma.user.findFirst()` to find "the" user. Upserts on external ids use the composite keys (`userId_intervalsId`, `userId_externalId`).
- Requests without a browser session (Health Auto Export, calendar, Claude MCP) are authenticated with a per-user `PersonalLink` token (`lib/tokens`: `findUserByLinkToken`), not env secrets. Only the cron route uses an env secret (`CRON_SECRET`).
- "Today" depends on the user's `timezone`: pass it to `localDateString(timeZone)`. Money uses `formatMoney(amount, user.currency)`.
- FODMAP warnings only show when `user.showFodmap` is on.
- Admin-only server actions call `requireAdmin()`. Admins must not see other users' training or health data.

## Code layout

- **Pages stay thin.** A page in `src/app/(protected)/` authenticates, loads data and composes components. Queries and calculations live in `src/lib/`, and page-specific components in an underscore folder next to the page (for example `_dashboard/`).
- **Pure vs database code.** Calculations that need no database are their own modules so they can be unit tested: `dashboard-summary`, `health-parse`, `ics`, `nutrition`, `nutrition-insights`' rules. Modules that talk to Prisma (`dashboard-data`, `health-ingest`, `sync`) call into them.
- **Route handlers do three things:** check the credential, parse the request, call a function in `src/lib/`. See `api/ingest/health/route.ts` and `api/calendar/[token]/route.ts`.
- **Shared helpers, do not redefine them locally:** `lib/format` (durations, distances), `lib/time` (`DAY_MS`, `daysAgo`, `startOfWeekUtc`, `localDateString`, `DEFAULT_TIMEZONE`), `lib/secrets` (constant-time secret comparison), `lib/session` (`requireUser` for pages, `requireUserId` for server actions, `requireAdmin`), `lib/tokens` (personal links).
- **The cron secret** is compared with `lib/secrets` and fails closed when the env var is missing or too short.

## Checks before pushing

Run `npm test`, `npx tsc --noEmit` and `npm run build`. Add a test next to any new pure calculation (`src/lib/__tests__/`). If a change is visible in the app, open it locally against the `dev` branch; do not assume it renders.
