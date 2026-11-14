import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { buildCoachContext } from "@/lib/coach-context";
import {
  costMicros,
  dailyBudgetCents,
  isOverDailyBudget,
  recordCoachUsage,
} from "@/lib/coach-budget";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a knowledgeable fitness, endurance and health coach and sports-science assistant for this one athlete. Answer using the real training, health, race, and budget data provided below — cite specific numbers from it rather than speaking generically.

Be direct and concise: a few short paragraphs, bullet points for concrete recommendations. If the question touches on an injury, pain, or a medical symptom, give practical general guidance but clearly recommend seeing a doctor or physio for anything that sounds serious — you are not a medical professional.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("Coach is not configured (missing ANTHROPIC_API_KEY)", {
      status: 503,
    });
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2000) {
    return new Response("Missing or invalid question", { status: 400 });
  }

  const userId = session.user.id;
  if (await isOverDailyBudget(userId)) {
    return new Response(
      `Daily Coach limit reached (${dailyBudgetCents()} cents). Try again tomorrow.`,
      { status: 429 }
    );
  }

  const context = await buildCoachContext(userId);
  const client = new Anthropic({ apiKey });

  const claudeStream = client.messages.stream({
    model: "claude-haiku-5-5",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: `${SYSTEM_PROMPT}\n\n# Athlete data\n\n${context}`,
    messages: [{ role: "user", content: question }],
  });

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      claudeStream.on("text", (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      claudeStream.on("error", (err) => {
        console.error("Coach stream error", err);
        controller.error(err);
      });
      claudeStream.on("end", async () => {
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
