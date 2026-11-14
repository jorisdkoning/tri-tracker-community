import { APP_NAME } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
            TT
          </span>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="card space-y-5 p-6">{children}</div>
      </div>
    </div>
  );
}
