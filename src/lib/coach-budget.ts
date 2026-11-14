import { prisma } from "@/lib/prisma";
import { localDateString } from "@/lib/time";

// Claude Haiku 5.5 list prices (prompts up to 100K tokens): $0.10 per million
// input tokens and $0.50 per million output tokens. One dollar-per-million is
// exactly one micro-dollar per token, so cost in micro-dollars is
// input * 0.10 + output * 0.50. Update these if the model or its pricing changes.
const INPUT_MICROS_PER_TOKEN = 0.1;
const OUTPUT_MICROS_PER_TOKEN = 0.5;
const MICROS_PER_CENT = 10_000;
const DEFAULT_DAILY_BUDGET_CENTS = 50;

export function dailyBudgetCents(): number {
  const configured = Number(process.env.COACH_DAILY_BUDGET_CENTS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_DAILY_BUDGET_CENTS;
}

export function costMicros(inputTokens: number, outputTokens: number): number {
  return Math.ceil(
    inputTokens * INPUT_MICROS_PER_TOKEN + outputTokens * OUTPUT_MICROS_PER_TOKEN
  );
}

export async function isOverDailyBudget(userId: string): Promise<boolean> {
  const row = await prisma.coachUsage.findUnique({
    where: { userId_date: { userId, date: new Date(localDateString("UTC")) } },
    select: { costMicros: true },
  });
  return (row?.costMicros ?? 0) >= dailyBudgetCents() * MICROS_PER_CENT;
}

export async function recordCoachUsage(userId: string, micros: number) {
  const date = new Date(localDateString("UTC"));
  await prisma.coachUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { costMicros: { increment: micros }, requests: { increment: 1 } },
    create: { userId, date, costMicros: micros, requests: 1 },
  });
}
