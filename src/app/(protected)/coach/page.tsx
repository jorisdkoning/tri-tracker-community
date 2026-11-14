import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getCoachKey } from "@/lib/coach-key";
import { CoachClient } from "./CoachClient";

function OwnAssistantCard() {
  return (
    <div className="card space-y-3 p-5">
      <p className="font-medium">Use your own ChatGPT or Claude</p>
      <p className="text-sm text-foreground/70">
        Download a file with coaching instructions and a summary of your recent training, health and food.
        Upload or paste it into ChatGPT, Claude or another AI chat, then ask your questions there. No key or
        extra cost needed. Download a fresh one whenever you want advice on new data.
      </p>
      <a href="/api/coach/export" className="btn-secondary inline-block">
        Download for ChatGPT / Claude
      </a>
    </div>
  );
}

export default async function CoachPage() {
  const user = await requireUser();
  if (!(await getCoachKey(user.id))) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Coach</h1>
        <OwnAssistantCard />
        <div className="card space-y-3 p-5">
          <p className="font-medium">Or ask the coach right here</p>
          <p className="text-sm text-foreground/70">
            The built-in coach runs on Claude and uses your own Claude key, so questions are billed to your own
            Anthropic account (usually a fraction of a cent each). It takes about two minutes to set up.
          </p>
          <Link href="/settings#claude-key" className="btn-primary inline-block">
            Add my Claude key
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <CoachClient />
      <OwnAssistantCard />
    </div>
  );
}
