const LOAD_MS = 10_000;
const SEEK_MS = 2_500;
const DECODE_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|m4v|mov|webm|avi|mkv)$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
}

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type.includes("heic") || type.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
}

function canvasToJpeg(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxEdge: number,
  quality: number,
): string {
  const width = Math.max(1, srcW);
  const height = Math.max(1, srcH);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function loadVideo(file: File): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.crossOrigin = "anonymous";

  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const ready = () => {
          video.removeEventListener("loadeddata", ready);
          video.removeEventListener("canplay", ready);
          video.removeEventListener("error", fail);
          resolve();
        };
        const fail = () => {
          video.removeEventListener("loadeddata", ready);
          video.removeEventListener("canplay", ready);
          video.removeEventListener("error", fail);
          reject(new Error("Could not decode that video. Try an MP4, or drop JPEG stills instead."));
        };
        video.addEventListener("loadeddata", ready);
        video.addEventListener("canplay", ready);
        video.addEventListener("error", fail);
        video.src = url;
        video.load();
      }),
      LOAD_MS,
      "That video is taking too long to open. Drop JPEG or PNG stills instead.",
    );

    try {
      await video.play();
      video.pause();
    } catch {
      // Autoplay can be blocked — seeking still works after a metadata load.
    }

    return video;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  const target = duration > 0 ? Math.min(Math.max(0, time), Math.max(0, duration - 0.08)) : Math.max(0, time);

  if (Math.abs(video.currentTime - target) < 0.05 && video.readyState >= 2) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener("seeked", finish);
      video.removeEventListener("loadeddata", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, SEEK_MS);
    video.addEventListener("seeked", finish);
    video.addEventListener("loadeddata", finish);
    try {
      video.currentTime = target;
    } catch {
      finish();
    }
  });
}

function drawFrame(video: HTMLVideoElement, maxEdge: number, quality: number): string {
  return canvasToJpeg(video, video.videoWidth || 1280, video.videoHeight || 720, maxEdge, quality);
}

export async function extractVideoFrames(
  file: File,
  maxFrames = 6,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const video = await loadVideo(file);
  const url = video.src;
  try {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const count =
      duration > 0 ? Math.min(maxFrames, Math.max(3, Math.min(6, Math.ceil(duration / 5)))) : Math.min(4, maxFrames);
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = duration > 0 ? (duration * (i + 0.4)) / count : i * 0.8;
      await seek(video, t);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const frame = drawFrame(video, 640, 0.58);
      if (frame.length > 80) frames.push(frame);
      onProgress?.(i + 1, count);
    }
    if (frames.length === 0) {
      throw new Error("Could not pull stills from that video. Drop JPEG or PNG photos instead.");
    }
    return frames;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function bitmapToJpeg(file: File, maxEdge: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return canvasToJpeg(bitmap, bitmap.width, bitmap.height, maxEdge, quality);
  } finally {
    bitmap.close();
  }
}

function elementToJpeg(file: File, maxEdge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(canvasToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge, quality));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that photo."));
    };
    img.src = url;
  });
}

export async function fileToJpegDataUrl(file: File, maxEdge = 640, quality = 0.58): Promise<string> {
  if (isHeic(file)) {
    throw new Error("HEIC photos aren’t supported here. Export as JPEG or PNG, or film a short MP4.");
  }
  const message = "That photo is taking too long to open. Try a smaller JPEG or PNG.";
  try {
    return await withTimeout(bitmapToJpeg(file, maxEdge, quality), DECODE_MS, message);
  } catch (first) {
    if (first instanceof Error && first.message.includes("HEIC")) throw first;
    try {
      return await withTimeout(elementToJpeg(file, maxEdge, quality), DECODE_MS, message);
    } catch {
      throw first instanceof Error ? first : new Error("Could not read that photo.");
    }
  }
}

export function shrinkDataUrl(dataUrl: string, maxEdge = 320, quality = 0.55): Promise<string> {
  return withTimeout(
    new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(
            canvasToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge, quality),
          );
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    }),
    DECODE_MS,
    "Could not shrink a still.",
  ).catch(() => dataUrl);
}
