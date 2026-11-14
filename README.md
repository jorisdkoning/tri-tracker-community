# Tri Tracker (community edition)

A training and wellness tracker for triathletes that anyone can sign up for.
Each person gets their own private dashboard and connects their own apps:

- **Strava** – runs, rides and swims, with maps and segment PRs
- **Intervals.icu** – fitness/fatigue, sleep, HRV, resting heart rate, planned workouts
- **Apple Health** – through the Health Auto Export iPhone app and a personal link
- **Calendar** – planned workouts and races in any calendar app
- **Claude** – log meals by chatting (optional)

Plus a daily check-in, races and countdown, goals, nutrition targets that follow
your training, gym sessions, a race budget, and an optional AI coach. Anything
can also be entered by hand, so nobody *needs* to connect an app.

The first person to sign up becomes the **admin**. The Admin page lets you choose
who can join (anyone / invite links only / nobody), create invite links, and make
password-reset links (the app sends no email).

People can install it on their phone like an app: open it in Safari → Share →
*Add to Home Screen* (Android/Chrome: menu → *Install app*).

## Host your own copy (about 20 minutes, free tiers)

You need free accounts on [GitHub](https://github.com), [Neon](https://neon.tech)
and [Vercel](https://vercel.com).

1. **Copy the code.** Fork this repository on GitHub (or use it as a template).
2. **Create the database.** In Neon, create a project. Under *Connect*, copy the
   connection string.
3. **Create the tables.** On your computer (Node 20+):
   ```bash
   git clone https://github.com/YOU/tri-tracker-community && cd tri-tracker-community
   npm ci
   cp .env.example .env      # paste the Neon string into DATABASE_URL
   npx prisma migrate deploy
   ```
4. **Deploy.** In Vercel, *Add New → Project*, pick your fork, and add these
   environment variables (see `.env.example` for what each one is):
   `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`.
   Generate the secrets with `openssl rand -base64 32`.
5. **Sign up first.** Open your new site and create an account – you are now the
   admin. Go to **Admin** and pick *Invite only* if you don't want strangers joining.

The daily sync runs at 04:00 UTC through Vercel Cron (`vercel.json`). The free
Vercel plan allows one cron job, which is all this needs.

### Optional extras

- **Strava:** create an app at <https://www.strava.com/settings/api>, set the
  *Authorization Callback Domain* to your domain (e.g. `my-tri.vercel.app`), and
  add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`. A new Strava app only lets
  **one** athlete connect (you). To allow more people, request a higher athlete
  limit from Strava (on the same page, or through Strava's developer program form).
  Until then, others can connect Intervals.icu, which also reads their Strava data.
- **Google sign-in:** create an OAuth client (type *Web application*) in the Google
  Cloud console with redirect URI `https://YOUR-DOMAIN/api/auth/callback/google`,
  then add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
- **AI coach:** add `ANTHROPIC_API_KEY`. Each question is billed to *your*
  Anthropic account; `COACH_DAILY_BUDGET_CENTS` caps the spend per person per day.
- **Your own name:** set `NEXT_PUBLIC_APP_NAME`.

### Updating

Pull the latest code into your fork (GitHub: *Sync fork*). If the update has a new
folder under `prisma/migrations`, run `npx prisma migrate deploy` against your
database before or right after Vercel redeploys.

## Privacy and security

- Every row of training, health and food data belongs to one user, and every query
  is filtered by the signed-in user. Admins see names, emails and counts only.
- Strava/Intervals.icu tokens and personal links are encrypted with `ENCRYPTION_KEY`.
- Personal links (Apple Health, calendar, Claude) are long random tokens; each
  person can replace theirs in Settings. Only a hash is used for lookups.
- Deleting an account (Settings → Account) removes all of that person's data.

## Development

```bash
npm ci
cp .env.example .env   # point DATABASE_URL at a Neon dev branch
npx prisma migrate dev
npm run dev            # http://localhost:3000
```

Checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
See `AGENTS.md` for code layout rules.
