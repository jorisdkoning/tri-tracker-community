"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 rounded-md border border-line bg-transparent px-3 py-2 font-mono text-xs"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard blocked: the field is selectable as a fallback.
          }
        }}
        className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
