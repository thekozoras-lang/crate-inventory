import { itemsFromDetections, type RawDetection } from "./catalog";
import type { DetectedItem } from "./types";

type CocoModel = {
  detect: (
    img: HTMLImageElement,
    maxNumBoxes?: number,
    minScore?: number,
  ) => Promise<Array<{ class: string; score: number; bbox: number[] }>>;
};

let modelPromise: Promise<CocoModel> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read a still for detection."));
    img.src = src;
  });
}

async function loadModel(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      return cocoSsd.load({ base: "lite_mobilenet_v2" });
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}

export function warmupDetector() {
  if (typeof window === "undefined") return;
  void loadModel().catch(() => {});
}

export async function catalogFrames(
  frames: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ scene: string; items: DetectedItem[] }> {
  if (typeof window === "undefined" || frames.length === 0) {
    return { scene: "Walkthrough", items: [] };
  }

  const model = await loadModel();
  const hits: RawDetection[] = [];

  for (let i = 0; i < frames.length; i++) {
    try {
      const img = await loadImage(frames[i]!);
      const found = await model.detect(img, 20, 0.45);
      for (const det of found) {
        hits.push({ className: det.class, score: det.score, frameIndex: i });
      }
    } catch {
      // Skip a still that will not decode; others may still catalog.
    }
    onProgress?.(i + 1, frames.length);
  }

  const items = itemsFromDetections(hits);
  return {
    scene: items.length ? `Walkthrough · ${items.length} pieces spotted` : "Walkthrough",
    items,
  };
}
