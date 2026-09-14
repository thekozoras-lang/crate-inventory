import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemCard } from "@/components/item-card";
import { EMPTY_DRAFT, ItemFields, type ItemDraft } from "@/components/item-form";
import { useInventory } from "@/lib/store";
import type { ItemStatus } from "@/lib/types";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

function InventoryPage() {
  const items = useInventory((s) => s.items);
  const bins = useInventory((s) => s.bins);
  const hydrated = useInventory((s) => s.hydrated);
  const addManual = useInventory((s) => s.addManual);
  const addBin = useInventory((s) => s.addBin);
  const loadSample = useInventory((s) => s.loadSample);
  const selectMany = useInventory((s) => s.selectMany);

  const [query, setQuery] = useState("");
  const [binId, setBinId] = useState("all");
  const [status, setStatus] = useState<"all" | ItemStatus>("all");
  const [open, setOpen] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [draft, setDraft] = useState<ItemDraft>(EMPTY_DRAFT);
  const [binName, setBinName] = useState("");
  const [binZone, setBinZone] = useState("Warehouse");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (binId !== "all" && item.storageId !== binId) return false;
      if (status !== "all" && item.status !== status) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      );
    });
  }, [items, query, binId, status]);

  function saveManual() {
    if (!draft.name.trim() || !draft.marketMid) {
      toast.error("Name and market mid are required.");
      return;
    }
    addManual({ ...draft, name: draft.name.trim() });
    setDraft({ ...EMPTY_DRAFT, listingPercent: draft.listingPercent });
    setOpen(false);
    toast.success("Added to storage");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Storage</p>
          <h1 className="font-display text-4xl tracking-tight">The crate</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setBinOpen(true)}>
            New bin
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add item
          </Button>
        </div>
      </header>

      <div className="grid gap-2 md:grid-cols-[1fr_160px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="Search name, brand, category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={binId} onValueChange={setBinId}>
          <SelectTrigger>
            <SelectValue placeholder="Bin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bins</SelectItem>
            {bins.map((bin) => (
              <SelectItem key={bin.id} value={bin.id}>
                {bin.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="stored">In storage</SelectItem>
            <SelectItem value="listed">Listed</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-surface p-8 shadow-[var(--shadow-border)]">
          <p className="font-display text-2xl">Nothing filed yet</p>
          <p className="mt-2 text-sm text-muted">Scan a video, add a piece by hand, or load a sample lot.</p>
          <Button className="mt-4" variant="secondary" onClick={loadSample} disabled={!hydrated}>
            Load sample lot
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">No items match those filters.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted">
            <p>
              {filtered.length} {filtered.length === 1 ? "piece" : "pieces"}
            </p>
            <button
              type="button"
              className="hover:text-fg"
              onClick={() =>
                selectMany(
                  filtered.filter((i) => i.status !== "sold").map((i) => i.id),
                  true,
                )
              }
            >
              Select visible
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to storage</DialogTitle>
            <DialogDescription>Manual intake when you already know the piece.</DialogDescription>
          </DialogHeader>
          <ItemFields value={draft} onChange={setDraft} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveManual}>File it</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={binOpen} onOpenChange={setBinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New bin</DialogTitle>
            <DialogDescription>A named shelf, aisle, or tote.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Name"
              value={binName}
              onChange={(e) => setBinName(e.target.value)}
            />
            <Input
              placeholder="Zone"
              value={binZone}
              onChange={(e) => setBinZone(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBinOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!binName.trim()) return;
                addBin(binName.trim(), binZone.trim() || "Warehouse");
                setBinName("");
                setBinOpen(false);
                toast.success("Bin added");
              }}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
