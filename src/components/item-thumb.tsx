import {
  Bike,
  BookOpen,
  Box,
  Camera,
  Hammer,
  Lamp,
  Monitor,
  Shirt,
  Sofa,
  Utensils,
  WashingMachine,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Box> = {
  Furniture: Sofa,
  Electronics: Monitor,
  Tools: Hammer,
  Kitchen: Utensils,
  Apparel: Shirt,
  Sporting: Bike,
  Decor: Lamp,
  Collectibles: Camera,
  Media: BookOpen,
  Appliances: WashingMachine,
  Other: Box,
};

export function ItemThumb({
  category,
  thumbnail,
  name,
  className,
}: {
  category: string;
  thumbnail?: string;
  name: string;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Box;
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt={name}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-elevated", className)}>
      <Icon className="size-8 text-muted" strokeWidth={1.25} />
    </div>
  );
}
