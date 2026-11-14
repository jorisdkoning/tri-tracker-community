import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listMyGroups } from "@/lib/groups-data";
import { METRIC_LABELS } from "@/lib/groups";
import { CreateGroupForm, JoinGroupForm } from "./GroupForms";

const ERRORS: Record<string, string> = {
  invalid: "Please fill in all fields.",
  notfound: "That invite link doesn't work. Ask for a new one.",
  full: "That group is full.",
  limit: "You've started the maximum number of groups. Delete one first.",
};

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, { error }] = await Promise.all([requireUser(), searchParams]);
  const groups = await listMyGroups(user.id);
  const defaultName = user.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Groups &amp; challenges</h1>
        <p className="text-sm text-foreground/70">
          Train together with friends or your club. People in a group only see your chosen name and your total for
          the challenge, never your workouts, health or food.
        </p>
      </div>
      {error && ERRORS[error] && (
        <p className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">{ERRORS[error]}</p>
      )}
      {groups.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/groups/${group.id}`} className="card block p-4 hover:border-accent">
                <p className="font-medium">{group.name}</p>
                <p className="text-sm text-foreground/60">
                  {METRIC_LABELS[group.metric]} · {group._count.members}{" "}
                  {group._count.members === 1 ? "member" : "members"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <CreateGroupForm defaultName={defaultName} />
        <JoinGroupForm defaultName={defaultName} />
      </div>
    </div>
  );
}
