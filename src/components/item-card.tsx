import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemThumb } from "@/components/item-thumb";
import { ConditionStamp, StatusStamp } from "@/components/condition-stamp";
import { money } from "@/lib/money";
import { itemListPrice, useInventory } from "@/lib/store";
import type { InventoryItem } from "@/lib/types";

export function ItemCard({ item, selectable = true }: { item: InventoryItem; selectable?: boolean }) {
  const bins = useInventory((s) => s.bins);
  const selectedIds = useInventory((s) => s.selectedIds);
  const toggleSelected = useInventory((s) => s.toggleSelected);
  const bin = bins.find((b) => b.id === item.storageId);
  const selected = selectedIds.includes(item.id);
  const list = itemListPrice(item);

  return (
    <article className="group relative overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]">
      {selectable && item.status !== "sold" ? (
        <label className="absolute top-3 left-3 z-10 flex size-11 items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={() => toggleSelected(item.id)}
            aria-label={`Select ${item.name}`}
          />
        </label>
      ) : null}
      <Link to="/inventory/$id" params={{ id: item.id }} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-elevated">
          <ItemThumb category={item.category} thumbnail={item.thumbnail} name={item.name} />
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs tracking-widest text-muted uppercase">{item.category}</p>
              <h3 className="font-display text-lg leading-snug">{item.name}</h3>
            </div>
            <StatusStamp status={item.status} />
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted">Market mid</p>
              <p className="font-display text-xl leading-none tabular-nums">{money(item.marketMid)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">List at {item.listingPercent}%</p>
              <p className="text-sm tabular-nums text-accent">{money(list)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <ConditionStamp condition={item.condition} />
            <span>{bin ? `${bin.zone} · ${bin.name}` : "Unassigned"}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
