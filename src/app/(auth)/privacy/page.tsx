import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `Privacy · ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Privacy policy</h1>
        <p className="text-xs text-foreground/55">Last updated 14 November 2026</p>
      </div>
      <p>
        {APP_NAME} is a personal health and fitness log. This page explains what it stores about you and why.
      </p>

      <h2 className="font-semibold">What we store</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your account: name, email address and a scrambled (hashed) version of your password. If you sign in with Google, we receive only your name, email address and profile picture.</li>
        <li>Your settings: timezone, weight, currency and the foods you avoid.</li>
        <li>What you log or connect: workouts, health values such as sleep and heart rate, meals, goals, events and expenses.</li>
        <li>Keys for apps you connect, such as an Intervals.icu API key. These are stored encrypted.</li>
      </ul>

      <h2 className="font-semibold">How it is used</h2>
      <p>
        Only to show you your own dashboard, charts and advice. Other users cannot see your data. We do not sell your
        data, show ads or share it with anyone for marketing.
      </p>

      <h2 className="font-semibold">Services that handle your data</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Vercel (hosting) and Neon (database) store and serve the app.</li>
        <li>Intervals.icu and Apple Health (through Health Auto Export) send data in only when you connect them.</li>
        <li>Google, only if you choose &quot;Continue with Google&quot;.</li>
        <li>Anthropic (Claude), only if the AI coach is turned on and you ask it something. Your question and a summary of your recent data are then sent to answer it.</li>
      </ul>

      <h2 className="font-semibold">Your choices</h2>
      <p>
        You can change or remove what you logged at any time. In Settings you can delete your account, which
        permanently removes all your data. For questions, contact the person who invited you or runs this app.
      </p>

      <p className="border-t border-line pt-4 text-center">
        <Link href="/login" className="text-accent">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
