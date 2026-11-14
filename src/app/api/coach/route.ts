import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { buildCoachContext } from "@/lib/coach-context";
import { coachErrorMessage, getCoachKey } from "@/lib/coach-key";
import { COACH_INSTRUCTIONS } from "@/lib/coach-prompt";
import {
  costMicros,
  dailyBudgetCents,
  isOverDailyBudget,
  recordCoachUsage,
} from "@/lib/coach-budget";

export const runtime = "nodejs";


export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }


  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2000) {
    return new Response("Missing or invalid question", { status: 400 });
  }

  const userId = session.user.id;
  const coachKey = await getCoachKey(userId);
  if (!coachKey) {
    return new Response("Add your Claude key in Settings to use the coach.", { status: 400 });
  }
  if (!coachKey.ownKey && (await isOverDailyBudget(userId))) {
    return new Response(
      `Daily Coach limit reached (${dailyBudgetCents()} cents). Try again tomorrow.`,
      { status: 429 }
    );
  }

  const context = await buildCoachContext(userId);
  const client = new Anthropic({ apiKey: coachKey.apiKey });

  const claudeStream = client.messages.stream({
    model: "claude-haiku-5-5",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: `${COACH_INSTRUCTIONS}\n\n# Athlete data\n\n${context}`,
    messages: [{ role: "user", content: question }],
  });

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      claudeStream.on("text", (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      let failed = false;
      claudeStream.on("error", (err) => {
        console.error("Coach stream error", err);
        failed = true;
        controller.enqueue(encoder.encode(`\n\n${coachErrorMessage(err)}`));
        controller.close();
      });
      claudeStream.on("end", async () => {
        if (failed) return;
        try {
          const final = await claudeStream.finalMessage();
          await recordCoachUsage(
            userId,
            costMicros(final.usage.input_tokens, final.usage.output_tokens)
          );
        } catch (err) {
          console.error("Failed to record Coach usage", err);
        }
        controller.close();
      });
    },
    cancel() {
      claudeStream.abort();
    },
  });

  return new Response(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
