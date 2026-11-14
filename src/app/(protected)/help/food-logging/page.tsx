import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getBaseUrl } from "@/lib/base-url";
import { getOrCreateLinkToken } from "@/lib/tokens";
import { APP_NAME } from "@/lib/brand";
import { CopyField } from "../../settings/CopyField";
import { Steps } from "../../settings/_parts";

export const metadata = { title: `Log food with Claude · ${APP_NAME}` };

const EXAMPLES = [
  "I had two eggs on toast with butter for breakfast",
  "Log a chicken salad and an apple for lunch",
  "Yesterday's dinner was a big bowl of pasta bolognese",
  "What have I eaten today, and how much protein do I still need?",
  "Delete the last thing I logged",
];

export default async function FoodLoggingGuidePage() {
  const user = await requireUser();
  const [base, token] = await Promise.all([getBaseUrl(), getOrCreateLinkToken(user.id, "CLAUDE")]);
  const link = `${base}/api/mcp/${token}`;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/nutrition" className="text-sm text-accent">
          ← Nutrition
        </Link>
        <h1 className="text-2xl font-semibold">Log food by chatting with Claude</h1>
        <p className="text-sm text-foreground/70">
          Connect Claude once. After that, just tell Claude what you ate in normal words. It estimates calories
          and protein and puts the meal on your {APP_NAME} Nutrition page. No typing numbers.
        </p>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">What you need</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>
            A Claude account at{" "}
            <a href="https://claude.ai" target="_blank" rel="noreferrer" className="text-accent underline">
              claude.ai
            </a>
            . If you don&apos;t see &quot;Connectors&quot; in your Claude settings, your plan may not include custom
            connectors.
          </li>
          <li>A computer or tablet for the one-time setup. After that it also works in the Claude phone app.</li>
          <li>Your personal link below.</li>
        </ul>
        <CopyField value={link} />
        <p className="text-xs text-foreground/55">
          This link is only for you. Anyone who has it can see and add meals in your account, so don&apos;t share it.
        </p>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Set it up (about 2 minutes)</h2>
        <Steps
          steps={[
            <>Copy your personal link above (press <b>Copy</b>).</>,
            <>
              Open{" "}
              <a href="https://claude.ai" target="_blank" rel="noreferrer" className="text-accent underline">
                claude.ai
              </a>{" "}
              in your browser and sign in.
            </>,
            <>Click your name or initials (bottom left), then <b>Settings</b>, then <b>Connectors</b>.</>,
            <>Click <b>Add custom connector</b>.</>,
            <>Type the name <b>{APP_NAME}</b>, paste your link into the URL field, and click <b>Add</b>.</>,
            <>
              Start a new chat. If Claude doesn&apos;t use it on its own, open the tools menu below the message box and
              make sure <b>{APP_NAME}</b> is switched on.
            </>,
            <>Try it: say &quot;I had a banana for breakfast&quot;. It should appear on your Nutrition page.</>,
          ]}
        />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">Things you can say</h2>
        <ul className="space-y-1 text-sm">
          {EXAMPLES.map((example) => (
            <li key={example} className="rounded-md bg-foreground/[0.04] px-3 py-2 text-foreground/80">
              &ldquo;{example}&rdquo;
            </li>
          ))}
        </ul>
        <p className="text-sm text-foreground/70">
          Foods you saved on the Nutrition page are used with their exact numbers. Meals that may not fit your food
          restrictions get a warning, in Claude and in {APP_NAME}.
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">If something doesn&apos;t work</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/80">
          <li>
            <b>Claude answers but nothing shows up:</b> say &quot;log this in {APP_NAME}&quot;, and check the {APP_NAME}{" "}
            connector is switched on in that chat.
          </li>
          <li>
            <b>It logged the wrong day:</b> mention the day, like &quot;yesterday&quot; or &quot;on Monday&quot;, or ask
            Claude to delete it and log it again.
          </li>
          <li>
            <b>It stopped working after you made a new link:</b> the old link no longer works. In Claude, remove the
            connector and add it again with the new link.
          </li>
          <li>
            <b>The numbers look off:</b> they are estimates. Tell Claude the portion size, or save the food with exact
            numbers on the Nutrition page.
          </li>
        </ul>
      </section>
    </div>
  );
}
