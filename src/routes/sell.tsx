import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, LoaderCircle, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ItemThumb } from "@/components/item-thumb";
import { writeListings } from "@/lib/analyze";
import { templateListings } from "@/lib/catalog";
import { money, moneyExact } from "@/lib/money";
import { itemLineTotal, itemListPrice, itemMarketTotal, useInventory } from "@/lib/store";
import { FEE_PRESETS } from "@/lib/types";

export const Route = createFileRoute("/sell")({ component: SellPage });

function SellPage() {
  const items = useInventory((s) => s.items);
  const listings = useInventory((s) => s.listings);
  const selectedIds = useInventory((s) => s.selectedIds);
  const listingPercent = useInventory((s) => s.listingPercent);
  const feeRate = useInventory((s) => s.feeRate);
  const toggleSelected = useInventory((s) => s.toggleSelected);
  const applyPercentToSelected = useInventory((s) => s.applyPercentToSelected);
  const setFeeRate = useInventory((s) => s.setFeeRate);
  const updateItem = useInventory((s) => s.updateItem);
  const applyListings = useInventory((s) => s.applyListings);
  const markSold = useInventory((s) => s.markSold);

  const [writing, setWriting] = useState(false);
  const [tab, setTab] = useState<"tray" | "live">("tray");

  const selected = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id) && item.status !== "sold"),
    [items, selectedIds],
  );

  const subtotal = selected.reduce((s, i) => s + itemLineTotal(i), 0);
  const market = selected.reduce((s, i) => s + itemMarketTotal(i), 0);
  const fees = subtotal * feeRate;
  const total = subtotal - fees;
  const spread = market - subtotal;

  async function generate() {
    if (selected.length === 0) return;
    setWriting(true);
    try {
      const payload = selected.slice(0, 12).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        brand: item.brand,
        condition: item.condition,
        description: item.description,
        listPrice: itemListPrice(item),
        marketMid: item.marketMid,
        percent: item.listingPercent,
      }));
      let listings = templateListings(payload);
      let usedFallback = true;
      try {
        const result = await writeListings({ data: { items: payload } });
        if (result.ok && result.listings.length > 0) {
          listings = result.listings;
          usedFallback = Boolean(result.fallback);
        }
      } catch {
        usedFallback = true;
      }
      const prices: Record<string, number> = {};
      for (const item of selected) prices[item.id] = itemListPrice(item);
      applyListings(listings, prices);
      toast.success(
        usedFallback
          ? `${listings.length} listings drafted from your item details`
          : `${listings.length} listings drafted`,
      );
      setTab("live");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not write listings.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Sell desk</p>
        <h1 className="font-display text-4xl tracking-tight">Price the lot, then list it</h1>
        <p className="max-w-xl text-muted">
          Check pieces in storage, set a listing percentage of market, and generate copy. Totals
          update as you go.
        </p>
      </header>

      <div className="flex gap-2">
        <Button variant={tab === "tray" ? "default" : "secondary"} onClick={() => setTab("tray")}>
          Tray
        </Button>
        <Button variant={tab === "live" ? "default" : "secondary"} onClick={() => setTab("live")}>
          Listings
          {listings.length > 0 ? (
            <span className="tabular-nums opacity-70">{listings.length}</span>
          ) : null}
        </Button>
      </div>

      {tab === "tray" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs tracking-widest text-muted uppercase">Listing percent of market</p>
                  <p className="font-display text-3xl tabular-nums">{listingPercent}%</p>
                </div>
                <p className="max-w-xs text-right text-xs text-muted">
                  Applied to every selected piece. Override any one on its card.
                </p>
              </div>
              <Slider
                className="mt-2"
                min={25}
                max={150}
                step={5}
                value={[listingPercent]}
                onValueChange={([v]) => applyPercentToSelected(v ?? 80)}
              />
            </section>

            {selected.length === 0 ? (
              <div className="rounded-xl bg-surface p-8 shadow-[var(--shadow-border)]">
                <p className="font-display text-2xl">Nothing in the tray</p>
                <p className="mt-2 text-sm text-muted">
                  Open storage and check the pieces you want to sell, or load a sample lot first.
                </p>
                <Button className="mt-4" variant="secondary" asChild>
                  <Link to="/inventory">Go to storage</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {selected.map((item) => {
                  const list = itemListPrice(item);
                  const line = itemLineTotal(item);
                  return (
                    <li
                      key={item.id}
                      className="grid gap-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:grid-cols-[72px_1fr_auto]"
                    >
                      <Link
                        to="/inventory/$id"
                        params={{ id: item.id }}
                        className="h-20 overflow-hidden rounded-md bg-elevated"
                      >
                        <ItemThumb
                          category={item.category}
                          thumbnail={item.thumbnail}
                          name={item.name}
                          className="h-20 w-full"
                        />
                      </Link>
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked
                            onCheckedChange={() => toggleSelected(item.id)}
                            aria-label={`Remove ${item.name}`}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.name}</p>
                            <p className="text-xs text-muted">
                              {item.quantity} × market {money(item.marketMid)} · {item.listingPercent}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            className="h-9 max-w-28"
                            value={item.listingPriceOverride ?? list}
                            onChange={(e) =>
                              updateItem(item.id, {
                                listingPriceOverride: Number(e.target.value) || 0,
                              })
                            }
                          />
                          <span className="text-xs text-muted">each</span>
                        </div>
                      </div>
                      <p className="font-display text-right text-xl tabular-nums">{money(line)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside className="h-fit rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] lg:sticky lg:top-20">
            <p className="text-xs tracking-widest text-muted uppercase">Ticket</p>
            <Line label={`${selected.length} items`} value="" />
            <Line label="Subtotal" value={moneyExact(subtotal)} />
            <Line label="Vs. market mid" value={moneyExact(market)} muted />
            <Line
              label="Buyer save vs market"
              value={spread >= 0 ? moneyExact(spread) : moneyExact(-spread)}
              muted
            />
            <div className="my-3">
              <Select
                value={String(feeRate)}
                onValueChange={(v) => setFeeRate(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fees" />
                </SelectTrigger>
                <SelectContent>
                  {FEE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={String(preset.rate)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Line label="Fees" value={moneyExact(fees)} muted />
            <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
              <p className="text-sm text-muted">Total to you</p>
              <p className="font-display text-3xl leading-none tabular-nums">{money(total)}</p>
            </div>
            <Button
              className="mt-5 w-full"
              onClick={() => void generate()}
              disabled={selected.length === 0 || writing}
            >
              {writing ? <LoaderCircle className="size-4 animate-spin" /> : <PenLine className="size-4" />}
              Write listings
            </Button>
            <p className="mt-3 text-xs text-muted">
              Drafts titles and bodies at the list prices above, then files them as active listings.
            </p>
          </aside>
        </div>
      ) : (
        <ListingsBoard
          listings={listings}
          items={items}
          onSold={(itemId, price) => {
            markSold(itemId, price);
            toast.success("Marked sold");
          }}
        />
      )}
    </div>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={muted ? "tabular-nums text-muted" : "tabular-nums"}>{value}</span>
    </div>
  );
}

function ListingsBoard({
  listings,
  items,
  onSold,
}: {
  listings: ReturnType<typeof useInventory.getState>["listings"];
  items: ReturnType<typeof useInventory.getState>["items"];
  onSold: (itemId: string, price: number) => void;
}) {
  if (listings.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-8 shadow-[var(--shadow-border)]">
        <p className="font-display text-2xl">No listings yet</p>
        <p className="mt-2 text-sm text-muted">Select items in the tray and write listings.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {listings.map((listing) => {
        const item = items.find((i) => i.id === listing.itemId);
        return (
          <li key={listing.id} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-widest text-muted uppercase">{listing.status}</p>
                <h2 className="font-display text-2xl">{listing.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {moneyExact(listing.listPrice)} · {listing.percent}% of {money(listing.marketMid)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const text = `${listing.title}\n\n${listing.body}\n\nPrice: ${moneyExact(listing.listPrice)}`;
                    await navigator.clipboard.writeText(text);
                    toast.success("Copied listing");
                  }}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
                {item && listing.status !== "sold" ? (
                  <Button size="sm" onClick={() => onSold(listing.itemId, listing.listPrice)}>
                    Mark sold
                  </Button>
                ) : null}
              </div>
            </div>
            {item ? (
              <Textarea
                className="mt-4"
                rows={6}
                value={item.listingBody ?? listing.body}
                onChange={(e) =>
                  useInventory.getState().updateItem(item.id, { listingBody: e.target.value })
                }
              />
            ) : (
              <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{listing.body}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
