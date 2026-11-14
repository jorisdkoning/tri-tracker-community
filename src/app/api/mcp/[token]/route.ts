import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkFodmap, effectiveFodmapRisk } from "@/lib/nutrition";
import { computeNutritionPlan } from "@/lib/nutrition-plan";

import { localDateString, localHour } from "@/lib/time";
import { findUserByLinkToken } from "@/lib/tokens";
export const runtime = "nodejs";

// Claude connects to /api/mcp/<token>, where the token is the user's personal
// CLAUDE link from Settings. Anyone without a valid token gets a plain 404.

const MEAL_TYPES = [
  "BREAKFAST",
  "PRE_TRAINING",
  "ON_BIKE",
  "LUNCH",
  "DINNER",
  "SNACK",
] as const;

function guessMealType(timeZone: string): (typeof MEAL_TYPES)[number] {
  const hour = localHour(timeZone);
  if (hour < 10) return "BREAKFAST";
  if (hour < 15) return "LUNCH";
  if (hour < 21) return "DINNER";
  return "SNACK";
}

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("YYYY-MM-DD, defaults to today in the user's timezone");

function text(message: string) {
  return { content: [{ type: "text" as const, text: message }] };
}

function dayLines(
  showFodmap: boolean,
  meals: {
    id: string;
    mealType: string;
    description: string;
    calories: number | null;
    proteinG: number | null;
    fodmapRisk: string;
    safeFoodId: string | null;
  }[]
) {
  const kcal = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const protein = meals.reduce((sum, m) => sum + (m.proteinG ?? 0), 0);
  const lines = meals.map(
    (m) =>
      `- [${m.id}] ${m.mealType.toLowerCase()}: ${m.description} (${m.calories ?? "?"} kcal, ${m.proteinG ?? "?"} g protein${showFodmap && effectiveFodmapRisk(m) === "HIGH" ? ", HIGH FODMAP" : ""})`
  );
  return { kcal, protein, lines };
}

async function targetLine(userId: string, timeZone: string, day: string, kcal: number, protein: number) {
  const plan = await computeNutritionPlan(userId, day, timeZone);
  const { calories, proteinG, carbsG } = plan.targets;
  return [
    `Target for a ${plan.tier} day: ${calories} kcal, ${proteinG} g protein, ${carbsG} g carbs. Remaining: ${Math.max(0, calories - kcal)} kcal, ${Math.max(0, proteinG - protein)} g protein.`,
    ...plan.reasons,
  ].join("\n");
}

function buildServer(userId: string, timeZone: string, showFodmap: boolean) {
  const server = new McpServer({ name: "tri-tracker", version: "1.0.0" });

  server.registerTool(
    "log_meal",
    {
      description:
        "Log food the user ate to their nutrition dashboard. If the user did not give calories or protein, estimate both yourself from the description with realistic portions (ask a brief question only if the portion is truly unclear).",
      inputSchema: {
        description: z.string().min(1).max(200).describe("What was eaten, e.g. '2 eggs on toast with jam'"),
        calories: z.number().int().positive().max(10000).optional().describe("Estimated total kcal"),
        protein_g: z.number().int().min(0).max(500).optional().describe("Estimated protein in grams"),
        meal_type: z.enum(MEAL_TYPES).optional().describe("Defaults from the time of day"),
        date: dateField,
      },
    },
    async ({ description, calories, protein_g, meal_type, date }) => {
      const day = date ?? localDateString(timeZone);
      const check = checkFodmap(description);

      const meal = await prisma.meal.create({
        data: {
          userId,
          date: new Date(day),
          mealType: meal_type ?? guessMealType(timeZone),
          description,
          calories: calories ?? null,
          proteinG: protein_g ?? null,
          fodmapRisk: check.risk === "high" ? "HIGH" : "LOW",
        },
      });

      const meals = await prisma.meal.findMany({ where: { userId, date: new Date(day) } });
      const totals = dayLines(showFodmap, meals);
      return text(
        [
          `Logged (${meal.id}): ${description}${calories ? `, ${calories} kcal` : ""}${protein_g != null ? `, ${protein_g} g protein` : ""}.`,
          showFodmap && check.risk === "high"
            ? `Heads up: contains possible high-FODMAP ingredient(s): ${check.matched.join(", ")}.`
            : null,
          `Total for ${day}: ${totals.kcal} kcal, ${totals.protein} g protein across ${meals.length} entries.`,
          await targetLine(userId, timeZone, day, totals.kcal, totals.protein),
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
  );

  server.registerTool(
    "get_meals",
    {
      description: "List what the user has logged for a day, with totals and entry ids.",
      inputSchema: { date: dateField },
    },
    async ({ date }) => {
      const day = date ?? localDateString(timeZone);
      const meals = await prisma.meal.findMany({
        where: { userId, date: new Date(day) },
        orderBy: { createdAt: "asc" },
      });
      if (meals.length === 0) return text(`Nothing logged for ${day}.`);
      const totals = dayLines(showFodmap, meals);
      return text(
        `${day}: ${totals.kcal} kcal, ${totals.protein} g protein\n${totals.lines.join("\n")}\n${await targetLine(userId, timeZone, day, totals.kcal, totals.protein)}`
      );
    }
  );

  server.registerTool(
    "delete_meal",
    {
      description: "Delete a logged meal by its id (from get_meals or log_meal).",
      inputSchema: { id: z.string().min(1) },
    },
    async ({ id }) => {
      const { count } = await prisma.meal.deleteMany({ where: { id, userId } });
      return text(count > 0 ? "Deleted." : "No meal with that id.");
    }
  );

  server.registerTool(
    "list_safe_foods",
    {
      description:
        "The user's saved foods with exact calories and protein. Prefer these values over estimates when the user eats one of them.",
      inputSchema: {},
    },
    async () => {
      const foods = await prisma.safeFood.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      });
      if (foods.length === 0) return text("No saved foods yet.");
      return text(
        foods
          .map(
            (f) =>
              `- ${f.name}: ${f.calories ?? "?"} kcal, ${f.proteinG ?? "?"} g protein, FODMAP ${f.fodmapRisk.toLowerCase()}`
          )
          .join("\n")
      );
    }
  );

  return server;
}

async function handle(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const user = await findUserByLinkToken("CLAUDE", token);
  if (!user) {
    console.warn(`[mcp] rejected ${request.method}: bad token`);
    return new Response("Not found", { status: 404 });
  }

  const server = buildServer(user.id, user.timezone, user.showFodmap);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
