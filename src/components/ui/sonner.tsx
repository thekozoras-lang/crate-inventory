import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "bg-surface text-fg shadow-[0_0_0_1px_rgb(243_239_230_/_0.12)]",
          title: "text-fg",
          description: "text-muted",
        },
      }}
    />
  );
}
