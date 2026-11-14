"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/training", label: "Training" },
  { href: "/health", label: "Health" },
  { href: "/gym", label: "Gym" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/budget", label: "Budget" },
  { href: "/races", label: "Events" },
  { href: "/goals", label: "Goals" },
  { href: "/coach", label: "Coach" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, { href: "/admin", label: "Admin" }] : NAV_ITEMS;

  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-0.5 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
