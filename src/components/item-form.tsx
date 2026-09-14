import type { ReactNode } from "react";
import { CATEGORIES, CONDITIONS, type InventoryItem } from "@/lib/types";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory } from "@/lib/store";

export type ItemDraft = Omit<InventoryItem, "id" | "createdAt" | "source" | "status">;

export const EMPTY_DRAFT: ItemDraft = {
  name: "",
  category: "Other",
  brand: "",
  condition: "good",
  description: "",
  quantity: 1,
  marketLow: 0,
  marketMid: 0,
  marketHigh: 0,
  priceBasis: "",
  listingPercent: 80,
  storageId: "bin_receiving",
  notes: "",
};

export function ItemFields({
  value,
  onChange,
}: {
  value: ItemDraft;
  onChange: (next: ItemDraft) => void;
}) {
  const bins = useInventory((s) => s.bins);
  const set = (patch: Partial<ItemDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4">
      <Field label="Name">
        <Input value={value.name} onChange={(e) => set({ name: e.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={value.category} onValueChange={(category) => set({ category })}>
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
            value={value.condition}
            onValueChange={(condition) => set({ condition: condition as ItemDraft["condition"] })}
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand">
          <Input value={value.brand} onChange={(e) => set({ brand: e.target.value })} />
        </Field>
        <Field label="Quantity">
          <Input
            type="number"
            min={1}
            value={value.quantity}
            onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Market low">
          <Input
            type="number"
            min={0}
            value={value.marketLow || ""}
            onChange={(e) => set({ marketLow: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Market mid">
          <Input
            type="number"
            min={0}
            value={value.marketMid || ""}
            onChange={(e) => set({ marketMid: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Market high">
          <Input
            type="number"
            min={0}
            value={value.marketHigh || ""}
            onChange={(e) => set({ marketHigh: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>
      <Field label="Storage">
        <Select value={value.storageId} onValueChange={(storageId) => set({ storageId })}>
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
      <Field label="Description">
        <Textarea
          rows={3}
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
    </div>
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
