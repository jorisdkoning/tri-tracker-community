"use client";

import { useState, type FormEvent } from "react";

const EXAMPLE_PROMPTS = [
  "How am I doing overall right now?",
  "Should I train hard or take it easy this week?",
  "What should I change based on my recent training?",
  "Review my food intake and tell me what to improve.",
];

export default function CoachPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok || !res.body) {
        setError(await res.text());
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnswer(text);
      }
    } catch {
      setError("Something went wrong asking the coach.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    await ask(question);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Coach</h1>
      <p className="text-sm text-foreground/70">
        Ask about your training, health, and how you&apos;re doing — answers use
        your real fitness, health, race, and budget data.
      </p>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => {
              setQuestion(prompt);
              ask(prompt);
            }}
            className="rounded-full bg-foreground/[0.06] px-3 py-1 text-xs text-foreground/70 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask something about your training or health..."
          className="flex-1 rounded-md border border-line bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {answer && (
        <div className="whitespace-pre-wrap card p-4 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
