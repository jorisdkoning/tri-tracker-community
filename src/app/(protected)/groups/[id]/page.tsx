import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getBaseUrl } from "@/lib/base-url";
import { loadGroupForMember, loadLeaderboard } from "@/lib/groups-data";
import { formatScore, METRIC_LABELS, type Period } from "@/lib/groups";
import { deleteGroup, leaveGroup, newJoinCode } from "../actions";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [user, { id }, query] = await Promise.all([requireUser(), params, searchParams]);
  const group = await loadGroupForMember(id, user.id);
  if (!group) notFound();
  const period: Period = query.period === "month" ? "month" : "week";
  const [board, base] = await Promise.all([
    loadLeaderboard(group.members, group.metric, user.timezone, period),
    getBaseUrl(),
  ]);
  const isOwner = group.createdById === user.id;
  const tab = (p: Period, label: string) => (
    <Link
      href={`/groups/${group.id}?period=${p}`}
      className={`rounded-full px-3 py-1 text-sm ${period === p ? "bg-foreground text-background" : "border border-line"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/groups" className="text-sm text-accent hover:underline">
          ← All groups
        </Link>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-sm text-foreground/60">Challenge: {METRIC_LABELS[group.metric]}</p>
      </div>

      <section className="card space-y-4 p-5">
        <div className="flex gap-2">
          {tab("week", "This week")}
          {tab("month", "This month")}
        </div>
        <ol className="divide-y divide-line">
          {board.map((entry) => (
            <li
              key={entry.userId}
              className={`flex items-center justify-between py-2 ${entry.userId === user.id ? "font-semibold" : ""}`}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-right tabular-nums text-foreground/60">{entry.rank}</span>
                {entry.displayName}
                {entry.userId === user.id && <span className="text-xs font-normal text-foreground/60">(you)</span>}
              </span>
              <span className="tabular-nums">{formatScore(group.metric, entry.value)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-medium">Invite people</h2>
        <p className="text-sm text-foreground/70">
          Send this link to anyone you want in the group. They need a {process.env.NEXT_PUBLIC_APP_NAME ?? "FitLog"}{" "}
          account on this site.
        </p>
        <input
          readOnly
          value={`${base}/groups/join/${group.joinCode}`}
          className="w-full rounded-md border border-line bg-transparent px-3 py-2 font-mono text-xs"
          aria-label="Invite link"
        />
        {isOwner && (
          <form action={newJoinCode}>
            <input type="hidden" name="id" value={group.id} />
            <button type="submit" className="text-sm text-accent hover:underline">
              Make a new link (the old one stops working)
            </button>
          </form>
        )}
      </section>

      <div className="flex flex-wrap gap-4">
        <form action={leaveGroup}>
          <input type="hidden" name="id" value={group.id} />
          <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
            Leave group
          </button>
        </form>
        {isOwner && (
          <form action={deleteGroup}>
            <input type="hidden" name="id" value={group.id} />
            <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
              Delete group for everyone
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
