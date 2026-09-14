import type { ReactNode } from "react";
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ItemThumb } from "@/components/item-thumb";
import { ConditionStamp, StatusStamp } from "@/components/condition-stamp";
import { money, moneyExact } from "@/lib/money";
import { itemListPrice, useInventory } from "@/lib/store";
import { CATEGORIES, CONDITIONS, type Condition } from "@/lib/types";

export const Route = createFileRoute("/inventory_/$id")({ component: ItemDetail });

function ItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const item = useInventory((s) => s.items.find((i) => i.id === id));
  const bins = useInventory((s) => s.bins);
  const listings = useInventory((s) => s.listings.filter((l) => l.itemId === id));
  const updateItem = useInventory((s) => s.updateItem);
  const removeItem = useInventory((s) => s.removeItem);
  const toggleSelected = useInventory((s) => s.toggleSelected);
  const selected = useInventory((s) => s.selectedIds.includes(id));
  const markSold = useInventory((s) => s.markSold);
  const [soldPrice, setSoldPrice] = useState(item ? itemListPrice(item) : 0);

  if (!item) {
    return (
      <div className="space-y-4">
        <p className="text-muted">That piece is not in the crate.</p>
        <Button asChild variant="secondary">
          <Link to="/inventory">Back to storage</Link>
        </Button>
      </div>
    );
  }

  const list = itemListPrice(item);

  return (
    <div className="space-y-8">
      <Link
        to="/inventory"
        className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Storage
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <div className="aspect-[4/3] bg-elevated">
            <ItemThumb category={item.category} thumbnail={item.thumbnail} name={item.name} />
          </div>
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusStamp status={item.status} />
              <ConditionStamp condition={item.condition} />
              <Badge tone="muted">{item.category}</Badge>
            </div>
            <Input
              className="font-display h-auto border-0 bg-transparent px-0 text-3xl shadow-none"
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
            />
            <p className="text-sm text-muted">{item.priceBasis}</p>
            <Textarea
              value={item.description}
              onChange={(e) => updateItem(item.id, { description: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <p className="text-xs tracking-widest text-muted uppercase">Pricing</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <PriceField
                label="Low"
                value={item.marketLow}
                onChange={(n) => updateItem(item.id, { marketLow: n })}
              />
              <PriceField
                label="Mid"
                value={item.marketMid}
                onChange={(n) => updateItem(item.id, { marketMid: n })}
              />
              <PriceField
                label="High"
                value={item.marketHigh}
                onChange={(n) => updateItem(item.id, { marketHigh: n })}
              />
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between">
                <Label>List at {item.listingPercent}% of mid</Label>
                <p className="font-display text-2xl tabular-nums">{money(list)}</p>
              </div>
              <Slider
                min={25}
                max={150}
                step={5}
                value={[item.listingPercent]}
                onValueChange={([v]) =>
                  updateItem(item.id, { listingPercent: v ?? 80, listingPriceOverride: undefined })
                }
              />
            </div>
            <label className="mt-4 grid gap-1.5">
              <Label>Override list price</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={item.listingPriceOverride ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateItem(item.id, {
                    listingPriceOverride: raw === "" ? undefined : Number(raw),
                  });
                }}
              />
            </label>
          </section>

          <section className="grid gap-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand">
                <Input
                  value={item.brand}
                  onChange={(e) => updateItem(item.id, { brand: e.target.value })}
                />
              </Field>
              <Field label="Qty">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </Field>
              <Field label="Category">
                <Select
                  value={item.category}
                  onValueChange={(category) => updateItem(item.id, { category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Condition">
                <Select
                  value={item.condition}
                  onValueChange={(condition) =>
                    updateItem(item.id, { condition: condition as Condition })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Bin">
              <Select
                value={item.storageId}
                onValueChange={(storageId) => updateItem(item.id, { storageId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bins.map((bin) => (
                    <SelectItem key={bin.id} value={bin.id}>
                      {bin.zone} · {bin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </section>

          <div className="flex flex-wrap gap-2">
            {item.status !== "sold" ? (
              <Button
                variant={selected ? "secondary" : "default"}
                onClick={() => toggleSelected(item.id)}
              >
                {selected ? "In sell tray" : "Add to sell tray"}
              </Button>
            ) : null}
            {item.status === "listed" ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  markSold(item.id, soldPrice);
                  toast.success("Marked sold");
                }}
              >
                <Input
                  type="number"
                  className="max-w-28"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(Number(e.target.value) || 0)}
                />
                <Button type="submit" variant="secondary">
                  Mark sold
                </Button>
              </form>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                removeItem(item.id);
                toast.success("Removed");
                void navigate({ to: "/inventory" });
              }}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>

          {listings[0] ? (
            <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <p className="text-xs tracking-widest text-muted uppercase">Listing</p>
              <h2 className="mt-2 font-display text-xl">{listings[0].title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{listings[0].body}</p>
              <p className="mt-3 text-sm tabular-nums">{moneyExact(listings[0].listPrice)}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted">{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}
