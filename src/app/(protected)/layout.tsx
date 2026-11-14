import { signOut } from "@/auth";
import { Nav } from "./Nav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-2 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
                TT
              </span>
              <span className="font-semibold tracking-tight">Tri Tracker</span>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-foreground/60 hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
          <Nav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
