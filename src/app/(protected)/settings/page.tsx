import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  connectIntervals,
  disconnectIntervals,
  disconnectStrava,
} from "./actions";
import { SyncButton } from "./SyncButton";
import { StravaSyncButton } from "./StravaSyncButton";
import { CopyField } from "./CopyField";

const STRAVA_ERRORS: Record<string, string> = {
  denied: "Strava authorization was cancelled.",
  missing_code: "Strava did not return an authorization code.",
  exchange_failed: "Exchanging the Strava authorization code failed.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava_error?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { strava_error } = await searchParams;

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const mcpToken = process.env.MCP_TOKEN;
  const calendarToken = process.env.CALENDAR_TOKEN;
  const calendarPath =
    calendarToken && calendarToken.length >= 32 ? `://${host}/api/calendar/${calendarToken}` : null;
  const connectorUrl =
    mcpToken && mcpToken.length >= 32
      ? `${protocol}://${host}/api/mcp/${mcpToken}`
      : null;

  const [account, stravaAccount] = await Promise.all([
    prisma.intervalsAccount.findUnique({ where: { userId } }),
    prisma.stravaAccount.findUnique({ where: { userId } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-4 card p-6">
        <h2 className="text-lg font-medium">intervals.icu</h2>

        {account ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">
              Connected as athlete{" "}
              <span className="font-mono">{account.athleteId}</span>.
              {account.lastSyncAt
                ? ` Last synced ${account.lastSyncAt.toLocaleString()}.`
                : " Never synced yet."}
            </p>

            <SyncButton />

            <form action={disconnectIntervals}>
              <button
                type="submit"
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Disconnect
              </button>
            </form>
          </div>
        ) : (
          <form action={connectIntervals} className="space-y-3">
            <p className="text-sm text-foreground/70">
              Find your API key at{" "}
              <span className="font-mono">
                intervals.icu → Settings → Developer
              </span>
              .
            </p>
            <div className="space-y-1">
              <label htmlFor="apiKey" className="text-sm font-medium">
                API Key
              </label>
              <input
                id="apiKey"
                name="apiKey"
                type="password"
                required
                className="w-full max-w-sm rounded-md border border-line bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
            >
              Connect
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4 card p-6">
        <h2 className="text-lg font-medium">Strava</h2>
        <p className="text-sm text-foreground/70">
          Direct connection for full activity details (name, distance,
          duration, heart rate) — intervals.icu can&apos;t share these for
          Strava-sourced activities.
        </p>

        {strava_error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {STRAVA_ERRORS[strava_error] ?? "Connecting Strava failed."}
          </p>
        )}

        {stravaAccount ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">
              Connected as athlete{" "}
              <span className="font-mono">
                {stravaAccount.athleteId.toString()}
              </span>
              .
              {stravaAccount.lastSyncAt
                ? ` Last synced ${stravaAccount.lastSyncAt.toLocaleString()}.`
                : " Never synced yet."}
            </p>

            <StravaSyncButton />

            <form action={disconnectStrava}>
              <button
                type="submit"
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Disconnect
              </button>
            </form>
          </div>
        ) : (
          <a
            href="/api/strava/connect"
            className="inline-block rounded-md bg-[#fc4c02] px-4 py-2 text-sm font-medium text-white"
          >
            Connect with Strava
          </a>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">Claude connector</h2>
        <p className="text-sm text-foreground/70">
          Log food by chatting with Claude on your phone. Add this URL once as a
          custom connector in Claude (claude.ai → Settings → Connectors → Add
          custom connector), then tell Claude what you ate and it lands in
          Nutrition.
        </p>
        {connectorUrl ? (
          <>
            <CopyField value={connectorUrl} />
            <p className="text-xs text-foreground/50">
              Treat this URL like a password: anyone who has it can read and add
              your meals. To rotate it, change MCP_TOKEN in Vercel and redeploy.
            </p>
          </>
        ) : (
          <p className="text-sm text-foreground/70">
            Set MCP_TOKEN (32+ characters) in the environment to enable this.
          </p>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">Calendar</h2>
        <p className="text-sm text-foreground/70">
          Your planned workouts (from the intervals.icu calendar) and races as a
          calendar subscription, with a reminder an hour before. On your iPhone,
          tap the button below and choose Subscribe. Or add the link under
          Settings → Calendar → Accounts → Add Account → Other → Add Subscribed
          Calendar.
        </p>
        {calendarPath ? (
          <>
            <a
              href={`webcal${calendarPath}`}
              className="inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Subscribe in Calendar
            </a>
            <CopyField value={`${protocol}${calendarPath}`} />
            <p className="text-xs text-foreground/50">
              Treat this link like a password. Calendar apps refresh it every
              few hours, so a new workout can take a while to show up. To
              rotate it, change CALENDAR_TOKEN in Vercel and redeploy.
            </p>
          </>
        ) : (
          <p className="text-sm text-foreground/70">
            Set CALENDAR_TOKEN (32+ characters) in the environment to enable this.
          </p>
        )}
      </section>
    </div>
  );
}
