import type { DetectedItem } from "./types";
import { uid } from "./utils";

export function draftDetectedFromFrames(frameCount: number): DetectedItem[] {
  const count = Math.max(1, frameCount);
  return Array.from({ length: count }, (_, index) => blankDetected(index));
}

export function blankDetected(frameIndex = 0): DetectedItem {
  return {
    key: uid("det"),
    name: `Item from still ${frameIndex + 1}`,
    category: "Other",
    brand: "",
    condition: "good",
    description: "",
    quantity: 1,
    marketLow: 0,
    marketMid: 0,
    marketHigh: 0,
    priceBasis: "Set the mid-market price from recent sold listings.",
    suggestedBin: "Receiving",
    frameIndex,
    confidence: 0,
    keep: true,
  };
}

export function soldCompsUrl(name: string) {
  const q = encodeURIComponent(name.trim() || "used item");
  return `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
}

export function templateListings(
  items: Array<{
    id: string;
    name: string;
    category: string;
    brand?: string;
    condition: string;
    description: string;
    listPrice: number;
    marketMid: number;
    percent: number;
  }>,
) {
  return items.map((item) => {
    const title = [item.brand, item.name].filter((part) => part && part.trim()).join(" ").slice(0, 80);
    const body = [
      item.description.trim() || `${item.name} in ${item.condition} condition.`,
      item.category ? `Category: ${item.category}.` : "",
      `Asking $${Math.round(item.listPrice)} (${item.percent}% of typical used-market around $${Math.round(item.marketMid)}).`,
      "Local pickup preferred. Message to confirm it is still available.",
    ]
      .filter(Boolean)
      .join(" ");
    return { id: item.id, title: title || item.name, body };
  });
}
