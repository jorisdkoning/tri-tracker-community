import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cleanJoinCode, METRIC_LABELS } from "@/lib/groups";
import { JoinGroupForm } from "../../GroupForms";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const [user, { code: raw }] = await Promise.all([requireUser(), params]);
  const code = cleanJoinCode(raw);
  const group = code
    ? await prisma.group.findUnique({
        where: { joinCode: code },
        select: { id: true, name: true, metric: true, _count: { select: { members: true } } },
      })
    : null;
  if (!group) {
    return (
      <div className="card max-w-md space-y-2 p-5">
        <h1 className="text-xl font-semibold">This invite link doesn&apos;t work</h1>
        <p className="text-sm text-foreground/70">It may have been replaced. Ask the person who sent it for a new one.</p>
        <Link href="/groups" className="text-sm text-accent hover:underline">
          Go to groups
        </Link>
      </div>
    );
  }
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    select: { userId: true },
  });
  if (member) redirect(`/groups/${group.id}`);

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-sm text-foreground/60">
          {METRIC_LABELS[group.metric]} · {group._count.members} {group._count.members === 1 ? "member" : "members"}
        </p>
      </div>
      <JoinGroupForm defaultName={user.name?.split(" ")[0] ?? ""} code={code!} />
    </div>
  );
}
