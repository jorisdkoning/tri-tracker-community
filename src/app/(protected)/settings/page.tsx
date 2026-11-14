import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getBaseUrl } from "@/lib/base-url";
import { getOrCreateLinkToken } from "@/lib/tokens";
import { ProfileFields } from "@/components/ProfileFields";
import { disconnectIntervals, disconnectStrava, removeClaudeKey } from "./actions";
import { ClaudeKeyForm } from "./ClaudeKeyForm";
import { SyncButton } from "./SyncButton";
import { StravaSyncButton } from "./StravaSyncButton";
import { CopyField } from "./CopyField";
import { IntervalsForm } from "./IntervalsForm";
import { ProfileForm } from "./ProfileForm";
import { DeleteAccountForm, PasswordForm } from "./AccountForms";
import { ConnectionCard, NewLinkButton, Steps } from "./_parts";
import { RemindersCard } from "./RemindersCard";
import { vapidPublicKey } from "@/lib/push";

const STRAVA_ERRORS: Record<string, string> = {
  denied: "You cancelled the Strava connection. You can try again any time.",
  missing_code: "Strava didn't finish the connection. Please try again.",
  exchange_failed:
    "Strava refused the connection. If several people already connected, this app may have reached Strava's athlete limit — tell the person who runs it.",
  taken: "That Strava account is already connected to another account in this app.",
};

const stravaConfigured = Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

function lastSynced(date: Date | null, timeZone: string) {
  return date
    ? `Last updated ${date.toLocaleString("en-GB", { timeZone, dateStyle: "medium", timeStyle: "short" })}.`
    : "Not updated yet — press the button below.";
}

function DisconnectButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
        Disconnect
      </button>
    </form>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ strava_error?: string; welcome?: string }>;
}) {
  const user = await requireUser();
  const { strava_error, welcome } = await searchParams;

  const [intervals, strava, base, healthToken, calendarToken, claudeToken, coachKey] = await Promise.all([
    prisma.intervalsAccount.findUnique({ where: { userId: user.id } }),
    prisma.stravaAccount.findUnique({ where: { userId: user.id } }),
    getBaseUrl(),
    getOrCreateLinkToken(user.id, "HEALTH"),
    getOrCreateLinkToken(user.id, "CALENDAR"),
    getOrCreateLinkToken(user.id, "CLAUDE"),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { anthropicApiKey: true, remindCheckIn: true, remindWeekly: true },
    }),
  ]);
  const hasClaudeKey = Boolean(coachKey?.anthropicApiKey);
  const healthUrl = `${base}/api/ingest/health/${healthToken}`;
  const calendarUrl = `${base}/api/calendar/${calendarToken}`;
  const claudeUrl = `${base}/api/mcp/${claudeToken}`;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {welcome && (
        <div className="card border-accent/40 bg-accent/[0.06] p-5">
          <h2 className="font-semibold">You&apos;re in! One more step: connect your apps.</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Pick whichever you already use — one is enough. Your workouts and health data then appear on
            your dashboard automatically, once a day. You can always come back here later.
          </p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
            Skip for now and go to my dashboard →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Connect your apps</h2>

        <ConnectionCard
          title="Strava"
          subtitle="Brings in your runs, rides and swims with maps and segments."
          connected={Boolean(strava)}
          badge={stravaConfigured ? undefined : "Use Intervals.icu"}
        >
          {strava_error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {STRAVA_ERRORS[strava_error] ?? "Connecting Strava failed. Please try again."}
            </p>
          )}
          {strava ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground/70">{lastSynced(strava.lastSyncAt, user.timezone)}</p>
              <StravaSyncButton />
              <DisconnectButton action={disconnectStrava} />
            </div>
          ) : stravaConfigured ? (
            <div className="space-y-2">
              <a href="/api/strava/connect" className="btn-primary bg-[#fc4c02] text-white">
                Connect with Strava
              </a>
              <p className="text-xs text-foreground/55">
                You&apos;ll go to Strava, press Authorize, and come straight back here.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-foreground/70">
              <p>This app doesn&apos;t connect to Strava directly. Use Intervals.icu instead:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  Make a free account at{" "}
                  <a href="https://intervals.icu" target="_blank" rel="noreferrer" className="font-medium underline">
                    intervals.icu
                  </a>
                  .
                </li>
                <li>
                  In Intervals.icu, open{" "}
                  <a
                    href="https://intervals.icu/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                  >
                    Settings
                  </a>{" "}
                  and connect your watch or app (Garmin, Coros, Suunto, Wahoo, Polar…).
                </li>
                <li>Then connect Intervals.icu in the card below.</li>
              </ol>
              <p className="text-xs text-foreground/55">
                Tip: connect your watch itself, not only Strava. Strava doesn&apos;t let other apps pass its workouts on.
              </p>
            </div>
          )}
        </ConnectionCard>

        <ConnectionCard
          title="Intervals.icu"
          subtitle="Fitness and fatigue, sleep, HRV, resting heart rate and your planned workouts."
          connected={Boolean(intervals)}
        >
          {intervals ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground/70">{lastSynced(intervals.lastSyncAt, user.timezone)}</p>
              <SyncButton />
              <DisconnectButton action={disconnectIntervals} />
            </div>
          ) : (
            <div className="space-y-4">
              <Steps
                steps={[
                  <>
                    Open{" "}
                    <a href="https://intervals.icu/settings" target="_blank" rel="noreferrer" className="text-accent underline">
                      intervals.icu/settings
                    </a>{" "}
                    and sign in (it&apos;s free).
                  </>,
                  <>Scroll all the way down to <b>Developer Settings</b>.</>,
                  <>Next to <b>API Key</b>, press <b>View</b> (or Generate) and copy the key.</>,
                  <>Paste it below and press Connect.</>,
                ]}
              />
              <IntervalsForm />
            </div>
          )}
        </ConnectionCard>

        <ConnectionCard
          title="Apple Health (iPhone)"
          subtitle="Steps, sleep, weight, heart rate, and swim and gym workouts from your iPhone or Apple Watch."
        >
          <Steps
            steps={[
              <>Install the <b>Health Auto Export</b> app from the App Store (the automatic export needs its paid upgrade).</>,
              <>In the app, go to <b>Automations</b> → <b>New automation</b> → <b>REST API</b>.</>,
              <>Paste your personal link below into the <b>URL</b> field.</>,
              <>Set <b>Format</b> to JSON, <b>Aggregation</b> to Days, and choose Health Metrics and Workouts.</>,
              <>Turn the automation on. New data arrives every few hours.</>,
            ]}
          />
          <CopyField value={healthUrl} />
          <p className="text-xs text-foreground/55">
            This link is only for you. Anyone who has it can add data to your account, so don&apos;t share it.
          </p>
          <NewLinkButton kind="HEALTH" />
        </ConnectionCard>

        <ConnectionCard
          title="Calendar"
          subtitle="See your planned workouts and events in your phone's calendar."
        >
          <a href={calendarUrl.replace(/^https?/, "webcal")} className="btn-secondary">
            Add to my calendar
          </a>
          <p className="text-sm text-foreground/65">
            Or copy this link into Google Calendar (Other calendars → From URL) or Outlook:
          </p>
          <CopyField value={calendarUrl} />
          <NewLinkButton kind="CALENDAR" />
        </ConnectionCard>

        <div id="claude-key" className="scroll-mt-20">
          <ConnectionCard
            title="AI coach (optional)"
            subtitle="Ask questions about your training, health and food on the Coach page. Uses your own Claude key."
            connected={hasClaudeKey}
          >
            {hasClaudeKey ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Your key is saved (encrypted). Questions are billed to your own Anthropic account.
                </p>
                <Link href="/coach" className="btn-secondary inline-block">
                  Open the coach
                </Link>
                <form action={removeClaudeKey}>
                  <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
                    Remove key
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <Steps
                  steps={[
                    <>
                      Open{" "}
                      <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-accent underline">
                        console.anthropic.com
                      </a>{" "}
                      and sign up or sign in. This is separate from a claude.ai subscription.
                    </>,
                    <>Under <b>Billing</b>, add a few dollars of credit. Each question usually costs less than a cent.</>,
                    <>Under <b>API keys</b>, press <b>Create key</b>, give it a name (e.g. FitLog) and copy it.</>,
                    <>Paste it below and press Save. Only you can use it.</>,
                  ]}
                />
                <ClaudeKeyForm />
              </div>
            )}
          </ConnectionCard>
        </div>

        <ConnectionCard
          title="Claude (optional)"
          subtitle="Tell Claude what you ate, and it lands on your Nutrition page."
        >
          <Steps
            steps={[
              <>On claude.ai, open <b>Settings</b> → <b>Connectors</b> → <b>Add custom connector</b>.</>,
              <>Paste this link and save. Then just tell Claude what you ate.</>,
            ]}
          />
          <CopyField value={claudeUrl} />
          <Link href="/help/food-logging" className="text-sm font-medium text-accent hover:underline">
            Full step-by-step guide →
          </Link>
          <NewLinkButton kind="CLAUDE" />
        </ConnectionCard>
      </div>

      <section id="reminders" className="card scroll-mt-20 space-y-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Reminders</h2>
          <p className="text-sm text-foreground/65">
            A nudge on your phone or computer to check in, and a short weekly summary. Turn it on for each device you
            use.
          </p>
        </div>
        <RemindersCard
          vapidKey={vapidPublicKey()}
          remindCheckIn={coachKey?.remindCheckIn ?? true}
          remindWeekly={coachKey?.remindWeekly ?? true}
        />
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <ProfileForm>
          <ProfileFields values={user} />
        </ProfileForm>
      </section>

      <section className="card space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-sm text-foreground/65">Signed in as {user.email}</p>
        </div>
        <PasswordForm hasPassword={Boolean(user.passwordHash)} />
        <div className="space-y-2">
          <h3 className="font-medium">Your data</h3>
          <p className="text-sm text-foreground/65">
            Download everything you logged or synced as one file, for example to keep a copy or move to another app.
          </p>
          <a href="/api/export/data" className="btn-secondary inline-block">
            Download all my data
          </a>
        </div>
        <DeleteAccountForm email={user.email} />
      </section>
    </div>
  );
}
