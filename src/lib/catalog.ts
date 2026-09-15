import type { DetectedItem } from "./types";
import { uid } from "./utils";

export type ClassBookEntry = {
  name: string;
  category: string;
  mid: number;
  bin: string;
  skip?: boolean;
};

/** Conservative used-market mid in USD for COCO classes we treat as sellable. */
export const CLASS_BOOK: Record<string, ClassBookEntry> = {
  bicycle: { name: "Bicycle", category: "Sporting", mid: 90, bin: "Sporting" },
  motorcycle: { name: "Motorcycle", category: "Sporting", mid: 1200, bin: "Sporting" },
  bench: { name: "Bench", category: "Furniture", mid: 45, bin: "Furniture / Seating" },
  backpack: { name: "Backpack", category: "Apparel", mid: 25, bin: "Apparel" },
  umbrella: { name: "Umbrella", category: "Apparel", mid: 12, bin: "Apparel" },
  handbag: { name: "Handbag", category: "Apparel", mid: 35, bin: "Apparel" },
  tie: { name: "Necktie", category: "Apparel", mid: 10, bin: "Apparel" },
  suitcase: { name: "Suitcase", category: "Apparel", mid: 40, bin: "Apparel" },
  frisbee: { name: "Frisbee", category: "Sporting", mid: 8, bin: "Sporting" },
  skis: { name: "Skis", category: "Sporting", mid: 55, bin: "Sporting" },
  snowboard: { name: "Snowboard", category: "Sporting", mid: 70, bin: "Sporting" },
  "sports ball": { name: "Sports ball", category: "Sporting", mid: 15, bin: "Sporting" },
  kite: { name: "Kite", category: "Sporting", mid: 12, bin: "Sporting" },
  "baseball bat": { name: "Baseball bat", category: "Sporting", mid: 22, bin: "Sporting" },
  "baseball glove": { name: "Baseball glove", category: "Sporting", mid: 18, bin: "Sporting" },
  skateboard: { name: "Skateboard", category: "Sporting", mid: 40, bin: "Sporting" },
  surfboard: { name: "Surfboard", category: "Sporting", mid: 90, bin: "Sporting" },
  "tennis racket": { name: "Tennis racket", category: "Sporting", mid: 25, bin: "Sporting" },
  bottle: { name: "Bottle", category: "Kitchen", mid: 8, bin: "Kitchen" },
  "wine glass": { name: "Wine glass", category: "Kitchen", mid: 10, bin: "Kitchen / Serving" },
  cup: { name: "Mug / cup", category: "Kitchen", mid: 8, bin: "Kitchen" },
  fork: { name: "Fork", category: "Kitchen", mid: 4, bin: "Kitchen" },
  knife: { name: "Knife", category: "Kitchen", mid: 15, bin: "Kitchen" },
  spoon: { name: "Spoon", category: "Kitchen", mid: 4, bin: "Kitchen" },
  bowl: { name: "Bowl", category: "Kitchen", mid: 10, bin: "Kitchen / Serving" },
  chair: { name: "Chair", category: "Furniture", mid: 35, bin: "Furniture / Seating" },
  couch: { name: "Sofa / couch", category: "Furniture", mid: 150, bin: "Furniture / Seating" },
  "potted plant": { name: "Potted plant", category: "Decor", mid: 18, bin: "Decor" },
  bed: { name: "Bed", category: "Furniture", mid: 120, bin: "Furniture" },
  "dining table": { name: "Dining table", category: "Furniture", mid: 90, bin: "Furniture" },
  tv: { name: "Television", category: "Electronics", mid: 75, bin: "Electronics" },
  laptop: { name: "Laptop", category: "Electronics", mid: 180, bin: "Electronics" },
  mouse: { name: "Computer mouse", category: "Electronics", mid: 12, bin: "Electronics" },
  remote: { name: "Remote control", category: "Electronics", mid: 8, bin: "Electronics" },
  keyboard: { name: "Keyboard", category: "Electronics", mid: 18, bin: "Electronics" },
  "cell phone": { name: "Cell phone", category: "Electronics", mid: 80, bin: "Electronics" },
  microwave: { name: "Microwave", category: "Appliances", mid: 40, bin: "Appliances" },
  oven: { name: "Oven", category: "Appliances", mid: 80, bin: "Appliances" },
  toaster: { name: "Toaster", category: "Appliances", mid: 15, bin: "Appliances" },
  refrigerator: { name: "Refrigerator", category: "Appliances", mid: 180, bin: "Appliances" },
  book: { name: "Book", category: "Media", mid: 8, bin: "Media" },
  clock: { name: "Clock", category: "Decor", mid: 18, bin: "Decor" },
  vase: { name: "Vase", category: "Decor", mid: 20, bin: "Decor" },
  scissors: { name: "Scissors", category: "Tools", mid: 8, bin: "Tools" },
  "teddy bear": { name: "Teddy bear", category: "Collectibles", mid: 15, bin: "Collectibles" },
  "hair drier": { name: "Hair dryer", category: "Appliances", mid: 18, bin: "Appliances" },
};

const SKIP = new Set([
  "person",
  "car",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "toilet",
  "sink",
  "toothbrush",
]);

export type RawDetection = {
  className: string;
  score: number;
  frameIndex: number;
};

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

export function draftDetectedFromFrames(frameCount: number): DetectedItem[] {
  const count = Math.max(1, frameCount);
  return Array.from({ length: count }, (_, index) => blankDetected(index));
}

export function itemsFromDetections(hits: RawDetection[]): DetectedItem[] {
  const grouped = new Map<
    string,
    { scores: number[]; frames: number[]; counts: Map<number, number> }
  >();

  for (const hit of hits) {
    const key = hit.className.toLowerCase();
    if (SKIP.has(key)) continue;
    const book = CLASS_BOOK[key];
    if (!book || book.skip) continue;
    if (hit.score < 0.45) continue;
    let group = grouped.get(key);
    if (!group) {
      group = { scores: [], frames: [], counts: new Map() };
      grouped.set(key, group);
    }
    group.scores.push(hit.score);
    group.frames.push(hit.frameIndex);
    group.counts.set(hit.frameIndex, (group.counts.get(hit.frameIndex) ?? 0) + 1);
  }

  const items: DetectedItem[] = [];
  for (const [key, group] of grouped) {
    const book = CLASS_BOOK[key];
    if (!book) continue;
    const confidence = Math.max(...group.scores);
    const frameIndex = group.frames[group.scores.indexOf(confidence)] ?? 0;
    const quantity = Math.max(1, ...group.counts.values());
    const mid = book.mid;
    items.push({
      key: uid("det"),
      name: book.name,
      category: book.category,
      brand: "",
      condition: "good",
      description: `Used ${book.name.toLowerCase()} spotted in the walkthrough. Confirm brand, condition, and completeness before listing.`,
      quantity,
      marketLow: Math.round(mid * 0.7),
      marketMid: mid,
      marketHigh: Math.round(mid * 1.35),
      priceBasis: `Typical used online listings for a ${book.name.toLowerCase()} run about $${Math.round(mid * 0.7)}–$${Math.round(mid * 1.35)}. Confirm with sold comps.`,
      suggestedBin: book.bin,
      frameIndex,
      confidence,
      keep: true,
    });
  }

  return items
    .sort((a, b) => b.marketMid * b.quantity - a.marketMid * a.quantity)
    .slice(0, 20);
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
