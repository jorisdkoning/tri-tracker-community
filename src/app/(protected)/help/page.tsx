import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { Steps } from "../settings/_parts";

export const metadata = { title: `Help · ${APP_NAME}` };

function Topic({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-20 space-y-3 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const TOPICS = [
  ["install", "Put it on your phone"],
  ["watch", "Connect your watch"],
  ["apple-health", "Apple Health"],
  ["by-hand", "Add things by hand"],
  ["food", "Food and restrictions"],
  ["coach", "AI coach"],
  ["account", "Password, privacy and your data"],
] as const;

export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Help</h1>
        <p className="text-sm text-foreground/70">
          Short how-tos for everything in {APP_NAME}. You don&apos;t need to do all of it: one connection and a
          daily check-in already give you a useful dashboard.
        </p>
        <nav className="flex flex-wrap gap-2 text-sm">
          {TOPICS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full bg-foreground/[0.06] px-3 py-1 text-foreground/75 hover:bg-foreground/[0.1]">
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Topic id="install" title="Put it on your phone">
        <p className="text-sm text-foreground/70">{APP_NAME} works like an app once it&apos;s on your home screen. Nothing to download from an app store.</p>
        <p className="text-sm font-medium">iPhone</p>
        <Steps steps={[<>Open {APP_NAME} in <b>Safari</b>.</>, <>Tap the <b>Share</b> button (square with an arrow).</>, <>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</>]} />
        <p className="text-sm font-medium">Android</p>
        <Steps steps={[<>Open {APP_NAME} in <b>Chrome</b>.</>, <>Tap the <b>⋮</b> menu.</>, <>Choose <b>Install app</b> (or Add to Home screen).</>]} />
      </Topic>

      <Topic id="watch" title="Connect your watch (Garmin, Coros, Polar, Suunto, Wahoo…)">
        <p className="text-sm text-foreground/70">
          {APP_NAME} gets your workouts through the free service Intervals.icu, which talks to almost every watch.
        </p>
        <Steps
          steps={[
            <>Make a free account at <a href="https://intervals.icu" target="_blank" rel="noreferrer" className="text-accent underline">intervals.icu</a>.</>,
            <>In Intervals.icu, open <a href="https://intervals.icu/settings" target="_blank" rel="noreferrer" className="text-accent underline">Settings</a> and connect your watch brand.</>,
            <>In {APP_NAME}, go to <Link href="/settings" className="text-accent underline">Settings</Link> → Intervals.icu and follow the 4 steps there.</>,
          ]}
        />
        <p className="text-xs text-foreground/55">Connect the watch itself, not only Strava: Strava doesn&apos;t let other apps pass your workouts on.</p>
      </Topic>

      <Topic id="apple-health" title="Apple Health (iPhone and Apple Watch)">
        <p className="text-sm text-foreground/70">
          Steps, sleep, weight, heart rate and workouts from your iPhone arrive through the Health Auto Export app.
          The steps and your personal link are in <Link href="/settings" className="text-accent underline">Settings</Link> → Apple Health.
        </p>
      </Topic>

      <Topic id="by-hand" title="Add things by hand">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>Workouts: <Link href="/training" className="text-accent underline">Training</Link> → add a workout.</li>
          <li>Gym sessions: <Link href="/gym" className="text-accent underline">Gym</Link>.</li>
          <li>Weight, sleep and resting heart rate: <Link href="/health" className="text-accent underline">Health</Link>.</li>
          <li>How you feel: the check-in at the top of the <Link href="/" className="text-accent underline">Dashboard</Link>, one tap a day.</li>
          <li>Events and goals: <Link href="/races" className="text-accent underline">Events</Link> and <Link href="/goals" className="text-accent underline">Goals</Link>.</li>
        </ul>
      </Topic>

      <Topic id="food" title="Food and restrictions">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>Log meals on the <Link href="/nutrition" className="text-accent underline">Nutrition</Link> page. Save foods you eat often with exact numbers.</li>
          <li>Pick the foods you avoid (gluten, lactose, nuts, vegetarian… or your own words) in <Link href="/settings" className="text-accent underline">Settings</Link> → Your profile. Meals that seem to contain them get a warning.</li>
          <li>Rather chat than type? <Link href="/help/food-logging" className="text-accent underline">Log food by talking to Claude</Link>.</li>
        </ul>
      </Topic>

      <Topic id="coach" title="AI coach">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>Free option: on the <Link href="/coach" className="text-accent underline">Coach</Link> page, download your summary and upload it to your own ChatGPT or Claude chat.</li>
          <li>Built-in option: add your own Claude key in <Link href="/settings#claude-key" className="text-accent underline">Settings</Link> and ask questions right in {APP_NAME}. Questions are billed to your own Anthropic account.</li>
          <li>The coach gives general advice, not medical advice. See a doctor or physio for pain or injuries.</li>
        </ul>
      </Topic>

      <Topic id="account" title="Password, privacy and your data">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>Change your password in <Link href="/settings" className="text-accent underline">Settings</Link> → Account.</li>
          <li>Forgot it? Ask the person who runs this app for a reset link.</li>
          <li>Only you can see your data. It is never sold or shared for ads. Read the <Link href="/privacy" className="text-accent underline">privacy policy</Link>.</li>
          <li>You can delete your account and all your data at any time in Settings → Account.</li>
        </ul>
      </Topic>
    </div>
  );
}
