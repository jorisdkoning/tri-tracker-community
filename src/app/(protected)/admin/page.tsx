import type { SignupMode } from "@prisma/client";
import { requireAdmin } from "@/lib/session";
import { getSignupMode } from "@/lib/accounts";
import { loadAdminOverview } from "@/lib/admin";
import { getBaseUrl } from "@/lib/base-url";
import { CopyField } from "../settings/CopyField";
import { ResetLinkButton } from "./ResetLinkButton";
import {
  createInviteAction,
  deleteInviteAction,
  deleteUserAction,
  setAdminAction,
  setSignupModeAction,
} from "./actions";

const MODE_INFO: Record<SignupMode, { label: string; help: string }> = {
  OPEN: { label: "Anyone can join", help: "Anyone with the address can create an account." },
  INVITE: { label: "Invite only", help: "People need an invite link you create below." },
  CLOSED: { label: "Closed", help: "No new accounts. Existing people can still sign in." },
};

const dateFmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [mode, { users, invites }, base] = await Promise.all([getSignupMode(), loadAdminOverview(), getBaseUrl()]);
  const now = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-foreground/60">Only admins see this page. You cannot see anyone&apos;s training data here.</p>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Who can create an account?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(MODE_INFO) as SignupMode[]).map((m) => (
            <form key={m} action={setSignupModeAction}>
              <input type="hidden" name="mode" value={m} />
              <button
                type="submit"
                aria-pressed={mode === m}
                className={`h-full w-full rounded-xl border p-4 text-left transition-colors ${
                  mode === m ? "border-accent bg-accent/[0.08]" : "border-line hover:bg-foreground/[0.03]"
                }`}
              >
                <span className="block font-medium">{MODE_INFO[m].label}</span>
                <span className="block text-xs text-foreground/60">{MODE_INFO[m].help}</span>
              </button>
            </form>
          ))}
        </div>
        <p className="text-sm text-foreground/65">
          Sign-up page: <a href="/signup" className="text-accent underline">{base}/signup</a>
        </p>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Invite links</h2>
          <p className="text-sm text-foreground/60">Each link lets one person join, for 14 days. Works in every mode except Closed.</p>
        </div>
        <form action={createInviteAction} className="flex flex-wrap gap-2">
          <input name="note" placeholder="Who is it for? (optional)" maxLength={80} className="field max-w-xs" />
          <button type="submit" className="btn-primary">Create invite link</button>
        </form>
        <ul className="space-y-3">
          {invites.map((inv) => {
            const status = inv.usedAt
              ? `Used by ${inv.usedByEmail ?? "someone"}`
              : inv.expiresAt <= now
                ? "Expired"
                : `Open until ${dateFmt(inv.expiresAt)}`;
            return (
              <li key={inv.id} className="space-y-1 border-t border-line pt-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <b>{inv.note ?? "Invite"}</b> · <span className="text-foreground/60">{status}</span>
                  </span>
                  <form action={deleteInviteAction}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">Remove</button>
                  </form>
                </div>
                {!inv.usedAt && inv.expiresAt > now && <CopyField value={`${base}/signup?invite=${inv.code}`} />}
              </li>
            );
          })}
          {invites.length === 0 && <li className="text-sm text-foreground/55">No invites yet.</li>}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["People", users.length],
          ["Active this week", users.filter((u) => u.status.active).length],
          ["Finished setup", users.filter((u) => u.onboardedAt).length],
          ["Sync problems", users.filter((u) => u.status.syncStale).length],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-foreground/60">{label}</p>
          </div>
        ))}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">People ({users.length})</h2>
        <ul className="space-y-4">
          {users.map((u) => (
            <li key={u.id} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {u.name ?? "(no name)"} {u.isAdmin && <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-xs text-accent">admin</span>}
                  </p>
                  <p className="text-sm text-foreground/60">{u.email}</p>
                </div>
                <p className="text-xs text-foreground/55">
                  Joined {dateFmt(u.createdAt)} · {u.onboardedAt ? "set up" : "not set up yet"} ·{" "}
                  {[u.stravaAccount && "Strava", u.intervalsAccount && "Intervals.icu"].filter(Boolean).join(" + ") || "no apps"} ·{" "}
                  {u._count.activities} workouts · last active{" "}
                  {u.status.lastActive ? dateFmt(u.status.lastActive) : "never"}
                </p>
                {u.status.syncStale && (
                  <p className="w-full text-xs text-red-600 dark:text-red-400">
                    Their connected app hasn&apos;t updated for over 2 days. They may need to reconnect it in Settings.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-4">
                <ResetLinkButton userId={u.id} />
                {u.id !== admin.id && (
                  <>
                    <form action={setAdminAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="makeAdmin" value={u.isAdmin ? "0" : "1"} />
                      <button type="submit" className="text-xs text-foreground/60 hover:underline">
                        {u.isAdmin ? "Remove admin" : "Make admin"}
                      </button>
                    </form>
                    <details>
                      <summary className="cursor-pointer text-xs text-red-600">Delete…</summary>
                      <form action={deleteUserAction} className="mt-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" className="rounded bg-red-600 px-2 py-1 text-xs text-white">
                          Yes, delete {u.email} and all their data
                        </button>
                      </form>
                    </details>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
