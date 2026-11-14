export function FormStatus({ state, savedText }: { state?: { error?: string; saved?: boolean }; savedText: string }) {
  if (state?.error) return <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>;
  if (state?.saved) return <p className="text-sm text-good">{savedText}</p>;
  return null;
}
