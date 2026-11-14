import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { APP_NAME } from "@/lib/brand";
import { ProfileFields } from "@/components/ProfileFields";
import { WelcomeForm } from "./WelcomeForm";

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.onboardedAt) redirect("/");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-6 space-y-1">
        <p className="text-sm font-medium text-accent">Step 1 of 2</p>
        <h1 className="text-2xl font-semibold">Welcome to {APP_NAME}{user.name ? `, ${user.name}` : ""}!</h1>
        <p className="text-foreground/65">A few quick questions so everything fits you. You can change all of this later in Settings.</p>
      </div>
      <WelcomeForm detectTimezone={!user.passwordHash}>
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">About you</h2>
          <ProfileFields values={user} />
        </section>
        <section className="card space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Your next event (optional)</h2>
            <p className="text-sm text-foreground/60">We&apos;ll count down to it on your dashboard.</p>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Event name</span>
            <input name="raceName" maxLength={120} placeholder="e.g. City 10K, marathon, triathlon" className="field" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Date</span>
              <input name="raceDate" type="date" className="field" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Type</span>
              <select name="raceDistance" defaultValue="OTHER" className="field">
                <option value="OTHER">Run, ride, walk or other event</option>
                <option value="SPRINT">Sprint triathlon</option>
                <option value="OLYMPIC">Olympic triathlon</option>
                <option value="HALF_IRONMAN">Half Ironman (70.3)</option>
                <option value="IRONMAN">Ironman</option>
              </select>
            </label>
          </div>
        </section>
      </WelcomeForm>
    </div>
  );
}
