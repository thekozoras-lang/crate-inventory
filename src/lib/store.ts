import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DetectedItem, InventoryItem, Listing, PendingScan, StorageBin } from "./types";
import { blankDetected } from "./catalog";
import { DEFAULT_BINS, makeSampleLot } from "./sample-lot";
import { clampPercent, lineListPrice } from "./money";
import { uid } from "./utils";

type InventoryState = {
  hydrated: boolean;
  items: InventoryItem[];
  bins: StorageBin[];
  listings: Listing[];
  selectedIds: string[];
  pendingScan: PendingScan | null;
  listingPercent: number;
  feeRate: number;
  setHydrated: (value: boolean) => void;
  loadSample: () => void;
  setPendingScan: (scan: PendingScan | null) => void;
  updateDetected: (key: string, patch: Partial<DetectedItem>) => void;
  addDetected: (frameIndex?: number) => void;
  removeDetected: (key: string) => void;
  commitScan: (storageFor: Record<string, string>) => InventoryItem[];
  addManual: (item: Omit<InventoryItem, "id" | "createdAt" | "source" | "status">) => string;
  updateItem: (id: string, patch: Partial<InventoryItem>) => void;
  removeItem: (id: string) => void;
  toggleSelected: (id: string) => void;
  selectMany: (ids: string[], selected: boolean) => void;
  clearSelected: () => void;
  setListingPercent: (n: number) => void;
  applyPercentToSelected: (n: number) => void;
  setFeeRate: (n: number) => void;
  addBin: (name: string, zone: string) => string;
  applyListings: (
    drafts: { id: string; title: string; body: string }[],
    prices: Record<string, number>,
  ) => void;
  markSold: (itemId: string, soldPrice: number) => void;
};

function matchBinId(bins: StorageBin[], suggested: string): string {
  const needle = suggested.toLowerCase();
  const hit = bins.find(
    (bin) =>
      needle.includes(bin.name.toLowerCase()) ||
      needle.includes(bin.zone.toLowerCase()) ||
      bin.name.toLowerCase().includes(needle),
  );
  return hit?.id ?? bins[0]?.id ?? "bin_receiving";
}

export const useInventory = create<InventoryState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      items: [],
      bins: DEFAULT_BINS,
      listings: [],
      selectedIds: [],
      pendingScan: null,
      listingPercent: 80,
      feeRate: 0,
      setHydrated: (value) => set({ hydrated: value }),
      loadSample: () =>
        set((state) => {
          if (state.items.length > 0) return state;
          return { items: makeSampleLot(), bins: DEFAULT_BINS };
        }),
      setPendingScan: (scan) => set({ pendingScan: scan }),
      updateDetected: (key, patch) =>
        set((state) => {
          if (!state.pendingScan) return state;
          return {
            pendingScan: {
              ...state.pendingScan,
              items: state.pendingScan.items.map((item) =>
                item.key === key ? { ...item, ...patch } : item,
              ),
            },
          };
        }),
      addDetected: (frameIndex) =>
        set((state) => {
          if (!state.pendingScan) return state;
          const last = state.pendingScan.frames.length - 1;
          const index = Math.max(0, Math.min(frameIndex ?? 0, Math.max(0, last)));
          return {
            pendingScan: {
              ...state.pendingScan,
              items: [...state.pendingScan.items, blankDetected(index)],
            },
          };
        }),
      removeDetected: (key) =>
        set((state) => {
          if (!state.pendingScan) return state;
          return {
            pendingScan: {
              ...state.pendingScan,
              items: state.pendingScan.items.filter((item) => item.key !== key),
            },
          };
        }),
      commitScan: (storageFor) => {
        const { pendingScan, bins, listingPercent } = get();
        if (!pendingScan) return [];
        const kept = pendingScan.items.filter((item) => item.keep);
        const now = Date.now();
        const created: InventoryItem[] = kept.map((item) => {
          const frame = pendingScan.frames[item.frameIndex] ?? pendingScan.frames[0];
          return {
            id: uid("item"),
            name: item.name,
            category: item.category,
            brand: item.brand,
            condition: item.condition,
            description: item.description,
            quantity: item.quantity,
            marketLow: item.marketLow,
            marketMid: item.marketMid,
            marketHigh: item.marketHigh,
            priceBasis: item.priceBasis,
            listingPercent,
            storageId: storageFor[item.key] ?? matchBinId(bins, item.suggestedBin),
            status: "stored",
            thumbnail: frame,
            source: "scan",
            notes: "",
            createdAt: now,
          };
        });
        set((state) => ({
          items: [...created, ...state.items],
          pendingScan: null,
        }));
        return created;
      },
      addManual: (item) => {
        const id = uid("item");
        set((state) => ({
          items: [
            {
              ...item,
              id,
              source: "manual",
              status: "stored",
              createdAt: Date.now(),
            },
            ...state.items,
          ],
        }));
        return id;
      },
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedIds: state.selectedIds.filter((sid) => sid !== id),
          listings: state.listings.filter((listing) => listing.itemId !== id),
        })),
      toggleSelected: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        })),
      selectMany: (ids, selected) =>
        set((state) => {
          const setIds = new Set(state.selectedIds);
          for (const id of ids) {
            if (selected) setIds.add(id);
            else setIds.delete(id);
          }
          return { selectedIds: [...setIds] };
        }),
      clearSelected: () => set({ selectedIds: [] }),
      setListingPercent: (n) => set({ listingPercent: clampPercent(n) }),
      applyPercentToSelected: (n) => {
        const pct = clampPercent(n);
        const selected = new Set(get().selectedIds);
        set((state) => ({
          listingPercent: pct,
          items: state.items.map((item) =>
            selected.has(item.id)
              ? { ...item, listingPercent: pct, listingPriceOverride: undefined }
              : item,
          ),
        }));
      },
      setFeeRate: (n) => set({ feeRate: Math.max(0, Math.min(0.3, n)) }),
      addBin: (name, zone) => {
        const id = uid("bin");
        set((state) => ({ bins: [...state.bins, { id, name, zone }] }));
        return id;
      },
      applyListings: (drafts, prices) => {
        const now = Date.now();
        set((state) => {
          const byId = new Map(drafts.map((d) => [d.id, d]));
          const nextListings: Listing[] = [...state.listings];
          const nextItems = state.items.map((item) => {
            const draft = byId.get(item.id);
            if (!draft) return item;
            const listPrice = prices[item.id] ?? lineListPrice(item.marketMid, item.listingPercent, item.listingPriceOverride);
            nextListings.unshift({
              id: uid("lst"),
              itemId: item.id,
              title: draft.title,
              body: draft.body,
              listPrice,
              marketMid: item.marketMid,
              percent: item.listingPercent,
              createdAt: now,
              status: "active",
            });
            return {
              ...item,
              listingTitle: draft.title,
              listingBody: draft.body,
              status: "listed" as const,
              listedAt: now,
            };
          });
          return { items: nextItems, listings: nextListings };
        });
      },
      markSold: (itemId, soldPrice) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, status: "sold" as const, soldAt: Date.now(), soldPrice }
              : item,
          ),
          listings: state.listings.map((listing) =>
            listing.itemId === itemId ? { ...listing, status: "sold" as const } : listing,
          ),
          selectedIds: state.selectedIds.filter((id) => id !== itemId),
        })),
    }),
    {
      name: "crate-inventory-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        items: state.items.map((item) => {
          const thumb = item.thumbnail;
          if (thumb && thumb.length > 180_000) {
            const { thumbnail: _t, ...rest } = item;
            return rest;
          }
          return item;
        }),
        bins: state.bins,
        listings: state.listings,
        listingPercent: state.listingPercent,
        feeRate: state.feeRate,
        selectedIds: state.selectedIds,
      }),
    },
  ),
);

export function itemListPrice(item: InventoryItem) {
  return lineListPrice(item.marketMid, item.listingPercent, item.listingPriceOverride);
}

export function itemLineTotal(item: InventoryItem) {
  return itemListPrice(item) * item.quantity;
}

export function itemMarketTotal(item: InventoryItem) {
  return item.marketMid * item.quantity;
}
