import { APP_NAME } from "@/lib/brand";
import { LogoMark } from "@/components/LogoMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <LogoMark size={36} />
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="card space-y-5 p-6">{children}</div>
      </div>
    </div>
  );
}
