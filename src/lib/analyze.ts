import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES, CONDITIONS, type Condition, type DetectedItem } from "./types";
import { uid } from "./utils";

const MAX_FRAMES = 6;
const MAX_FRAME_CHARS = 900_000;

const frameSchema = z
  .string()
  .min(32)
  .max(MAX_FRAME_CHARS)
  .refine((s) => s.startsWith("data:image/"), "Expected an image data URL");

const analyzeInput = z.object({
  frames: z.array(frameSchema).min(1).max(MAX_FRAMES),
  notes: z.string().max(500).optional(),
});

const listingInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        brand: z.string().optional(),
        condition: z.string(),
        description: z.string(),
        listPrice: z.number(),
        marketMid: z.number(),
        percent: z.number(),
      }),
    )
    .min(1)
    .max(12),
});

type AnalyzeOk = {
  ok: true;
  scene: string;
  items: DetectedItem[];
};
type AnalyzeErr = { ok: false; error: string };

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asCondition(value: unknown): Condition {
  const s = String(value ?? "good").toLowerCase().replace(/\s+/g, "-");
  return (CONDITIONS as readonly string[]).includes(s) ? (s as Condition) : "good";
}

function asCategory(value: unknown): string {
  const s = String(value ?? "Other");
  const hit = CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return hit ?? (s.trim() || "Other");
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItems(raw: unknown): DetectedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index): DetectedItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const name = String(item.name ?? "").trim();
      if (!name) return null;
      const mid = Math.max(1, asNumber(item.marketMid ?? item.market_mid, 0));
      const low = Math.max(1, asNumber(item.marketLow ?? item.market_low, Math.round(mid * 0.7)));
      const high = Math.max(mid, asNumber(item.marketHigh ?? item.market_high, Math.round(mid * 1.3)));
      return {
        key: uid("det"),
        name,
        category: asCategory(item.category),
        brand: String(item.brand ?? "").trim(),
        condition: asCondition(item.condition),
        description: String(item.description ?? "").trim(),
        quantity: Math.max(1, Math.min(99, Math.round(asNumber(item.quantity, 1)))),
        marketLow: Math.round(Math.min(low, mid)),
        marketMid: Math.round(mid),
        marketHigh: Math.round(Math.max(high, mid)),
        priceBasis: String(item.priceBasis ?? item.price_basis ?? "").trim(),
        suggestedBin: String(item.suggestedBin ?? item.suggested_bin ?? "Receiving").trim(),
        frameIndex: Math.max(0, Math.round(asNumber(item.frameIndex ?? item.frame_index, index))),
        confidence: Math.max(0, Math.min(1, asNumber(item.confidence, 0.7))),
        keep: true,
      };
    })
    .filter((item): item is DetectedItem => item !== null)
    .slice(0, 24);
}

async function grokChat(body: Record<string, unknown>): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI is not available in this environment." };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: "grok-4.5", ...body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) return { ok: false, error: "The cataloger is busy. Try again in a moment." };
    return { ok: false, error: `Cataloger error (${res.status})${detail ? `: ${detail.slice(0, 180)}` : ""}` };
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) return { ok: false, error: "The cataloger returned an empty response." };
  return { ok: true, text };
}

export const getAiStatus = createServerFn({ method: "POST" }).handler(async () => {
  return { available: Boolean(process.env.XAI_API_KEY) };
});

export const analyzeScan = createServerFn({ method: "POST" })
  .validator((input: unknown) => analyzeInput.parse(input))
  .handler(async ({ data }): Promise<AnalyzeOk | AnalyzeErr> => {
    const prompt = `You are a resale cataloger. Study these walkthrough frames from a room, garage, storage unit, or tabletop.

Identify DISTINCT, SELLABLE physical objects (furniture, electronics, tools, kitchenware, apparel, sporting goods, decor, collectibles, appliances, media). Skip people, pets, architecture, trash, and generic clutter unless it is a clearly listable piece.

For each item estimate conservative USED resale value in USD based on typical US online listings (eBay sold comps, Facebook Marketplace, Craigslist, Mercari) — not original retail.

Return ONLY JSON:
{
  "scene": "short scene description",
  "items": [
    {
      "name": "specific listing-ready name",
      "category": "one of Furniture, Electronics, Tools, Kitchen, Apparel, Sporting, Decor, Collectibles, Media, Appliances, Other",
      "brand": "brand if visible else empty string",
      "condition": "new | like-new | good | fair | poor",
      "description": "2-3 sentences a seller could use",
      "quantity": 1,
      "marketLow": 0,
      "marketMid": 0,
      "marketHigh": 0,
      "priceBasis": "one sentence citing typical listing range",
      "suggestedBin": "short storage label such as Tools / Power or Kitchen / Serving",
      "frameIndex": 0,
      "confidence": 0.0
    }
  ]
}

frameIndex is 0-based into the frames you were given. Cap at 20 items. Prefer fewer accurate items over guessing. ${data.notes ? `User notes: ${data.notes}` : ""}`;

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "low" } }
    > = [];

    data.frames.forEach((url, i) => {
      content.push({ type: "text", text: `Frame ${i + 1}:` });
      content.push({ type: "image_url", image_url: { url, detail: "low" } });
    });
    content.push({ type: "text", text: prompt });

    const result = await grokChat({
      max_tokens: 3500,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You catalog physical goods for resale. Reply with a single JSON object. No markdown.",
        },
        { role: "user", content },
      ],
    });

    if (!result.ok) return result;

    const parsed = parseJsonObject(result.text);
    if (!parsed) return { ok: false, error: "Could not parse the catalog from the scan." };

    const items = normalizeItems(parsed.items);
    if (items.length === 0) {
      return {
        ok: false,
        error: "No sellable items were visible. Try a closer walkthrough or still photos of each piece.",
      };
    }

    return {
      ok: true,
      scene: String(parsed.scene ?? "Walkthrough").trim() || "Walkthrough",
      items,
    };
  });

export const writeListings = createServerFn({ method: "POST" })
  .validator((input: unknown) => listingInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; listings: { id: string; title: string; body: string }[] }
      | { ok: false; error: string }
    > => {
      const prompt = `Write marketplace listings (Facebook Marketplace / Craigslist / eBay style) for these items. Honest, specific, no hype, no emoji.

Return ONLY JSON: { "listings": [ { "id": "same id", "title": "≤80 chars, searchable", "body": "120-180 words. Lead with what it is, condition, what is included, dimensions if obvious, pickup/shipping-neutral close." } ] }

Items:
${JSON.stringify(data.items, null, 2)}`;

      const result = await grokChat({
        max_tokens: 2800,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: "You write clean resale listings. Reply with a single JSON object. No markdown.",
          },
          { role: "user", content: prompt },
        ],
      });

      if (!result.ok) return result;
      const parsed = parseJsonObject(result.text);
      const rows = Array.isArray(parsed?.listings) ? parsed.listings : [];
      const listings = rows
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const rec = row as Record<string, unknown>;
          const id = String(rec.id ?? "");
          const title = String(rec.title ?? "").trim();
          const body = String(rec.body ?? "").trim();
          if (!id || !title || !body) return null;
          return { id, title, body };
        })
        .filter((row): row is { id: string; title: string; body: string } => row !== null);

      if (listings.length === 0) {
        return { ok: false, error: "Could not draft listings. Try again with fewer items." };
      }
      return { ok: true, listings };
    },
  );
