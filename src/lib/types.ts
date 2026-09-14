export const CONDITIONS = ["new", "like-new", "good", "fair", "poor"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const ITEM_STATUSES = ["stored", "listed", "sold"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const CATEGORIES = [
  "Furniture",
  "Electronics",
  "Tools",
  "Kitchen",
  "Apparel",
  "Sporting",
  "Decor",
  "Collectibles",
  "Media",
  "Appliances",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type StorageBin = {
  id: string;
  name: string;
  zone: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  condition: Condition;
  description: string;
  quantity: number;
  marketLow: number;
  marketMid: number;
  marketHigh: number;
  priceBasis: string;
  listingPercent: number;
  listingPriceOverride?: number;
  storageId: string;
  status: ItemStatus;
  thumbnail?: string;
  source: "scan" | "manual" | "sample";
  notes: string;
  listingTitle?: string;
  listingBody?: string;
  listedAt?: number;
  soldAt?: number;
  soldPrice?: number;
  createdAt: number;
};

export type Listing = {
  id: string;
  itemId: string;
  title: string;
  body: string;
  listPrice: number;
  marketMid: number;
  percent: number;
  createdAt: number;
  status: "draft" | "active" | "sold";
};

export type DetectedItem = {
  key: string;
  name: string;
  category: string;
  brand: string;
  condition: Condition;
  description: string;
  quantity: number;
  marketLow: number;
  marketMid: number;
  marketHigh: number;
  priceBasis: string;
  suggestedBin: string;
  frameIndex: number;
  confidence: number;
  keep: boolean;
};

export type PendingScan = {
  id: string;
  createdAt: number;
  frames: string[];
  scene: string;
  items: DetectedItem[];
};

export const FEE_PRESETS = [
  { id: "none", label: "No fees", rate: 0 },
  { id: "ebay", label: "eBay ~13%", rate: 0.1325 },
  { id: "mercari", label: "Mercari ~10%", rate: 0.1 },
  { id: "paypal", label: "PayPal 3.5%", rate: 0.035 },
] as const;
