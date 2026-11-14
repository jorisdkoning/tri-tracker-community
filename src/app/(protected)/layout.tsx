import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";
import { APP_NAME } from "@/lib/brand";
import { LogoMark } from "@/components/LogoMark";
import { Nav } from "./Nav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboardedAt) redirect("/welcome");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-2 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="font-semibold tracking-tight">{APP_NAME}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-foreground/55 sm:inline">{user.name ?? user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button type="submit" className="text-sm text-foreground/60 hover:text-foreground">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <Nav isAdmin={user.isAdmin} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
