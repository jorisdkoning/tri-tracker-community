import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { pushConfigured } from "@/lib/push";
import { sendDueReminders } from "@/lib/reminders-send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: "push not configured" });
  const summary = await sendDueReminders();
  console.log("[cron] reminders done", JSON.stringify(summary));
  return NextResponse.json(summary);
}
