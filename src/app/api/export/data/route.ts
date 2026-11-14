import { auth } from "@/auth";
import { APP_NAME } from "@/lib/brand";
import { exportUserData } from "@/lib/data-export";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const data = await exportUserData(session.user.id);
  const date = data.exportedAt.slice(0, 10);
  const filename = `${APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-my-data-${date}.json`;
  return new Response(JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
