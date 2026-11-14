import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/brand";
import { buildCoachContext } from "@/lib/coach-context";
import { coachMarkdown } from "@/lib/coach-prompt";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const [user, context] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, timezone: true } }),
    buildCoachContext(userId),
  ]);
  const markdown = coachMarkdown({
    appName: APP_NAME,
    name: user?.name ?? null,
    generatedAt: new Date(),
    timeZone: user?.timezone ?? "UTC",
    context,
  });
  const filename = `${APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-summary.md`;
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
