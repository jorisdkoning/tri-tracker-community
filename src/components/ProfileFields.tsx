import { CURRENCIES, allTimezones } from "@/lib/profile";

export interface ProfileValues {
  name: string | null;
  timezone: string;
  weightKg: number | null;
  currency: string;
  showFodmap: boolean;
}

const labelCls = "block space-y-1";
const hintCls = "block text-xs text-foreground/55";

export function ProfileFields({ values }: { values: ProfileValues }) {
  return (
    <div className="space-y-4">
      <label className={labelCls}>
        <span className="text-sm font-medium">Your name</span>
        <input name="name" required maxLength={80} defaultValue={values.name ?? ""} className="field" />
      </label>
      <label className={labelCls}>
        <span className="text-sm font-medium">Timezone</span>
        <select name="timezone" defaultValue={values.timezone} className="field">
          {allTimezones().map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <span className={hintCls}>Used to decide what &quot;today&quot; is for you.</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="text-sm font-medium">Body weight in kg (optional)</span>
          <input
            name="weightKg"
            inputMode="decimal"
            defaultValue={values.weightKg ?? ""}
            placeholder="e.g. 70"
            className="field"
          />
          <span className={hintCls}>Makes your daily food targets fit you.</span>
        </label>
        <label className={labelCls}>
          <span className="text-sm font-medium">Currency</span>
          <select name="currency" defaultValue={values.currency} className="field">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className={hintCls}>For the budget page.</span>
        </label>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="showFodmap" defaultChecked={values.showFodmap} className="mt-1 h-4 w-4" />
        <span className="text-sm">
          <span className="font-medium">Warn me about high-FODMAP food</span>
          <span className={hintCls}>
            Only turn this on if you follow a low-FODMAP diet (for a sensitive stomach).
          </span>
        </span>
      </label>
    </div>
  );
}
