import type { ComponentProps } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={`z-50 rounded-md bg-elevated px-2.5 py-1.5 text-xs text-fg shadow-[var(--shadow-border)] ${className ?? ""}`}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
