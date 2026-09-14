import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: ComponentProps<"span"> & { tone?: "default" | "ok" | "warn" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider",
        tone === "default" && "bg-elevated text-fg shadow-[var(--shadow-border)]",
        tone === "ok" && "bg-ok/15 text-ok",
        tone === "warn" && "bg-accent/15 text-accent",
        tone === "muted" && "bg-elevated text-muted",
        className,
      )}
      {...props}
    />
  );
}
