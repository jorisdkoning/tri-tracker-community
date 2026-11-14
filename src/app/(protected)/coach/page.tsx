import { CoachClient } from "./CoachClient";

export default function CoachPage() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Coach</h1>
        <div className="card space-y-2 p-5">
          <p className="font-medium">The AI coach is switched off on this app.</p>
          <p className="text-sm text-foreground/70">
            It needs an Anthropic API key, which costs the person running this app money for every question.
            If you run this app yourself, see &quot;AI coach&quot; in the README to turn it on.
          </p>
        </div>
      </div>
    );
  }
  return <CoachClient />;
}
