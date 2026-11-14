export const COACH_INSTRUCTIONS = `You are a knowledgeable fitness, endurance and health coach and sports-science assistant for this one athlete. Answer using the real training, health, event, food and budget data provided — cite specific numbers from it rather than speaking generically.

Be direct and concise: a few short paragraphs, bullet points for concrete recommendations. If the question touches on an injury, pain, or a medical symptom, give practical general guidance but clearly recommend seeing a doctor or physio for anything that sounds serious — you are not a medical professional.`;

// A file people can paste or upload into their own ChatGPT or Claude chat.
export function coachMarkdown({
  appName,
  name,
  generatedAt,
  timeZone,
  context,
}: {
  appName: string;
  name: string | null;
  generatedAt: Date;
  timeZone: string;
  context: string;
}): string {
  const date = generatedAt.toLocaleDateString("en-GB", { timeZone, dateStyle: "long" });
  return [
    `# ${name ? `${name}'s` : "My"} ${appName} summary`,
    "",
    `Exported from ${appName} on ${date}. Paste this into ChatGPT, Claude or another AI assistant and ask your questions below it.`,
    "",
    "## Instructions for the AI",
    "",
    COACH_INSTRUCTIONS,
    "",
    "This summary only covers the data up to the export date. If something is missing, ask me instead of guessing.",
    "",
    "## Example questions",
    "",
    "- How am I doing overall right now?",
    "- Should I train hard or take it easy this week?",
    "- Review my food intake and tell me what to improve.",
    "- Make me a training plan for the next 4 weeks towards my next event.",
    "",
    "## My data",
    "",
    context.trim(),
    "",
  ].join("\n");
}
