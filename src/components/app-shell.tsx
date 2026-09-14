import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Box, Camera, LayoutGrid, Tag, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventory } from "@/lib/store";
import { money } from "@/lib/money";

const NAV = [
  { to: "/", label: "Lot", icon: LayoutGrid },
  { to: "/scan", label: "Scan", icon: Camera },
  { to: "/inventory", label: "Storage", icon: Warehouse },
  { to: "/sell", label: "Sell", icon: Tag },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = useInventory((s) => s.items);
  const selectedIds = useInventory((s) => s.selectedIds);
  const lotValue = items
    .filter((item) => item.status !== "sold")
    .reduce((sum, item) => sum + item.marketMid * item.quantity, 0);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-sm bg-elevated shadow-[var(--shadow-border)]">
              <Box className="size-4 text-accent" strokeWidth={1.75} />
            </span>
            <span className="font-display text-lg tracking-tight italic">Crate</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150",
                    active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <item.icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                  {item.to === "/sell" && selectedIds.length > 0 ? (
                    <span className="tabular-nums text-accent">{selectedIds.length}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="text-right">
            <p className="text-[10px] font-medium tracking-widest text-muted uppercase">Lot value</p>
            <p className="font-display text-lg leading-none tabular-nums">{money(lotValue)}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 md:pb-12">{children}</main>

      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-bg/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <item.icon className="size-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
