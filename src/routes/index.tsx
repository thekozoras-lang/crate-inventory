import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Package, Tag, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/item-card";
import { money } from "@/lib/money";
import { itemListPrice, useInventory } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const items = useInventory((s) => s.items);
  const bins = useInventory((s) => s.bins);
  const listings = useInventory((s) => s.listings);
  const loadSample = useInventory((s) => s.loadSample);

  const stored = items.filter((i) => i.status === "stored");
  const listed = items.filter((i) => i.status === "listed");
  const sold = items.filter((i) => i.status === "sold");
  const market = items
    .filter((i) => i.status !== "sold")
    .reduce((s, i) => s + i.marketMid * i.quantity, 0);
  const listedValue = listed.reduce((s, i) => s + itemListPrice(i) * i.quantity, 0);
  const realized = sold.reduce((s, i) => s + (i.soldPrice ?? 0) * i.quantity, 0);
  const recent = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-4">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Resale catalog</p>
          <h1 className="font-display max-w-xl text-4xl leading-[1.1] tracking-tight md:text-5xl">
            Film the room. Crate what you find.
          </h1>
          <p className="max-w-lg text-muted">
            Walk a camera through a garage, closet, or storage unit. Crate pulls out each sellable
            piece, classifies it, prices it against typical online listings, and files it in a bin.
            Then pick what to list — at a percentage of market you choose.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/scan">
                Scan a video
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {items.length === 0 ? (
              <Button variant="secondary" onClick={loadSample}>
                Load a sample lot
              </Button>
            ) : (
              <Button variant="secondary" asChild>
                <Link to="/sell">Review sell tray</Link>
              </Button>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <Stat label="Lot value" value={money(market)} icon={Package} />
          <Stat label="On listings" value={money(listedValue)} icon={Tag} />
          <Stat label="In storage" value={String(stored.length)} icon={Warehouse} />
          <Stat label="Realized" value={money(realized)} icon={Camera} />
        </dl>
      </section>

      {items.length === 0 ? (
        <section className="rounded-xl bg-surface p-8 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-2xl">An empty crate</h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Drop a walkthrough video or a handful of stills on the scan desk. Or load a sample lot
            to try storage, selection, and listing math without filming anything.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Mini
              label="Stored"
              value={stored.length}
              hint={`${bins.length} bins`}
              to="/inventory"
            />
            <Mini label="Listed" value={listed.length} hint={`${listings.length} drafts`} to="/sell" />
            <Mini label="Sold" value={sold.length} hint={money(realized)} to="/inventory" />
          </section>
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl">Recent intake</h2>
              <Link to="/inventory" className="text-sm text-muted hover:text-fg">
                All storage
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between text-muted">
        <p className="text-xs tracking-widest uppercase">{label}</p>
        <Icon className="size-4" strokeWidth={1.5} />
      </div>
      <p className="mt-3 font-display text-2xl leading-none tabular-nums">{value}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: number;
  hint: string;
  to: "/inventory" | "/sell";
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
    >
      <div>
        <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
        <p className="font-display text-xl tabular-nums">{value}</p>
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </Link>
  );
}
