import { METRIC_LABELS } from "@/lib/groups";
import { createGroup, joinGroup } from "./actions";

const INPUT = "w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm";
const BUTTON = "rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium";

export function NameField({ defaultName }: { defaultName: string }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>Your name in the group</span>
      <input name="displayName" required maxLength={40} defaultValue={defaultName} className={INPUT} />
      <span className="block text-xs font-normal text-foreground/60">Others only see this name and your total.</span>
    </label>
  );
}

export function CreateGroupForm({ defaultName }: { defaultName: string }) {
  return (
    <form action={createGroup} className="card space-y-3 p-4">
      <h2 className="text-lg font-medium">Start a group</h2>
      <label className="block space-y-1 text-sm font-medium">
        <span>Group name</span>
        <input name="name" required maxLength={60} placeholder="e.g. Running club" className={INPUT} />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        <span>Challenge</span>
        <select name="metric" className={`${INPUT} dark:bg-black`}>
          {Object.entries(METRIC_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <NameField defaultName={defaultName} />
      <button type="submit" className={BUTTON}>
        Create group
      </button>
    </form>
  );
}

export function JoinGroupForm({ defaultName, code = "" }: { defaultName: string; code?: string }) {
  return (
    <form action={joinGroup} className="card space-y-3 p-4">
      <h2 className="text-lg font-medium">{code ? "Join this group" : "Join a group"}</h2>
      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <label className="block space-y-1 text-sm font-medium">
          <span>Invite link or code</span>
          <input name="code" required maxLength={300} placeholder="Paste the link you got" className={INPUT} />
        </label>
      )}
      <NameField defaultName={defaultName} />
      <button type="submit" className={BUTTON}>
        Join
      </button>
    </form>
  );
}
