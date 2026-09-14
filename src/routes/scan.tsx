import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyzeScan } from "@/lib/analyze";
import { extractVideoFrames, fileToJpegDataUrl, shrinkDataUrl } from "@/lib/frames";
import { money } from "@/lib/money";
import { useInventory } from "@/lib/store";
import { uid } from "@/lib/utils";
import type { Condition } from "@/lib/types";
import { CATEGORIES, CONDITIONS } from "@/lib/types";

export const Route = createFileRoute("/scan")({ component: ScanPage });

function ScanPage() {
  const navigate = useNavigate();
  const pendingScan = useInventory((s) => s.pendingScan);
  const setPendingScan = useInventory((s) => s.setPendingScan);
  const updateDetected = useInventory((s) => s.updateDetected);
  const commitScan = useInventory((s) => s.commitScan);
  const bins = useInventory((s) => s.bins);
  const addBin = useInventory((s) => s.addBin);

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"frames" | "analyze" | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [binMap, setBinMap] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const kept = pendingScan?.items.filter((i) => i.keep) ?? [];
  const keptValue = kept.reduce((s, i) => s + i.marketMid * i.quantity, 0);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = [...list];
    const videos = files.filter((f) => f.type.startsWith("video/"));
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (videos.length === 0 && images.length === 0) {
      toast.error("Add a video or photos.");
      return;
    }

    setBusy("frames");
    setProgress(0);
    try {
      let frames: string[] = [];
      if (videos[0]) {
        setStatus("Pulling stills from the walkthrough…");
        frames = await extractVideoFrames(videos[0], 6, (done, total) => {
          setProgress(Math.round((done / total) * 100));
        });
      } else {
        setStatus("Preparing photos…");
        const limited = images.slice(0, 6);
        for (let i = 0; i < limited.length; i++) {
          frames.push(await fileToJpegDataUrl(limited[i]));
          setProgress(Math.round(((i + 1) / limited.length) * 100));
        }
      }

      setBusy("analyze");
      setStatus("Identifying pieces and pricing them…");
      setProgress(70);
      const result = await analyzeScan({ data: { frames, notes: notes.trim() || undefined } });
      if (!result.ok) {
        toast.error(result.error);
        setBusy(null);
        setStatus("");
        return;
      }

      const thumbs = await Promise.all(frames.map((f) => shrinkDataUrl(f, 480, 0.55)));
      const nextBins = { ...binMap };
      for (const item of result.items) {
        const suggested = item.suggestedBin.toLowerCase();
        const match = bins.find(
          (b) =>
            suggested.includes(b.name.toLowerCase()) || suggested.includes(b.zone.toLowerCase()),
        );
        nextBins[item.key] = match?.id ?? bins[0]?.id ?? "bin_receiving";
      }
      setBinMap(nextBins);
      setPendingScan({
        id: uid("scan"),
        createdAt: Date.now(),
        frames: thumbs,
        scene: result.scene,
        items: result.items,
      });
      toast.success(`${result.items.length} items cataloged`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setBusy(null);
      setStatus("");
      setProgress(0);
    }
  }

  function commit() {
    if (!pendingScan) return;
    const created = commitScan(binMap);
    toast.success(`${created.length} items moved into storage`);
    void navigate({ to: "/inventory" });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Scan desk</p>
        <h1 className="font-display text-4xl tracking-tight">Walk the camera through it</h1>
        <p className="max-w-xl text-muted">
          A short video of a shelf, garage, or table — or up to six stills. Crate extracts frames,
          names each piece, and prices it from typical online listings.
        </p>
      </header>

      <section
        className="rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-elevated">
              <Camera className="size-5 text-accent" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-medium">Drop a video or stills</p>
              <p className="text-sm text-muted">MP4, MOV, or JPEG/PNG. A slow pan works better than a blur.</p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
          >
            <ImagePlus className="size-4" />
            Choose files
          </Button>
        </div>
        <div className="mt-5">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium tracking-wide text-muted">Notes for the cataloger</span>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Everything on the left wall is going. Ignore the treadmill."
            />
          </label>
        </div>
        {busy ? (
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" />
              {status}
            </div>
            <Progress value={busy === "analyze" ? 80 : progress} />
          </div>
        ) : null}
      </section>

      {pendingScan ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">{pendingScan.scene}</h2>
              <p className="text-sm text-muted">
                {kept.length} selected · {money(keptValue)} mid-market
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPendingScan(null)}>
                Discard
              </Button>
              <Button onClick={commit} disabled={kept.length === 0}>
                Put in storage
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingScan.frames.map((frame, i) => (
              <img
                key={i}
                src={frame}
                alt={`Frame ${i + 1}`}
                className="h-16 w-24 shrink-0 rounded-md object-cover"
              />
            ))}
          </div>

          <ul className="space-y-3">
            {pendingScan.items.map((item) => (
              <li
                key={item.key}
                className="grid gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] md:grid-cols-[96px_1fr_160px]"
              >
                <img
                  src={pendingScan.frames[item.frameIndex] ?? pendingScan.frames[0]}
                  alt=""
                  className="h-24 w-full rounded-md object-cover md:h-full"
                />
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.keep}
                      onCheckedChange={(v) => updateDetected(item.key, { keep: Boolean(v) })}
                      aria-label={`Keep ${item.name}`}
                    />
                    <div className="grid min-w-0 flex-1 gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateDetected(item.key, { name: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Select
                          value={item.category}
                          onValueChange={(category) => updateDetected(item.key, { category })}
                        >
                          <SelectTrigger className="h-9">
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
                        <Select
                          value={item.condition}
                          onValueChange={(condition) =>
                            updateDetected(item.key, { condition: condition as Condition })
                          }
                        >
                          <SelectTrigger className="h-9">
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
                        <Input
                          type="number"
                          min={1}
                          className="h-9"
                          value={item.quantity}
                          onChange={(e) =>
                            updateDetected(item.key, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                        <Input
                          type="number"
                          className="h-9"
                          value={item.marketMid}
                          onChange={(e) =>
                            updateDetected(item.key, { marketMid: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <p className="text-xs text-muted">{item.priceBasis}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-2">
                  <p className="font-display text-2xl tabular-nums">{money(item.marketMid)}</p>
                  <Select
                    value={binMap[item.key] ?? bins[0]?.id}
                    onValueChange={(id) => setBinMap((m) => ({ ...m, [item.key]: id }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bin" />
                    </SelectTrigger>
                    <SelectContent>
                      {bins.map((bin) => (
                        <SelectItem key={bin.id} value={bin.id}>
                          {bin.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.suggestedBin ? (
                    <button
                      type="button"
                      className="text-left text-xs text-muted hover:text-fg"
                      onClick={() => {
                        const existing = bins.find(
                          (b) => b.name.toLowerCase() === item.suggestedBin.toLowerCase(),
                        );
                        const id = existing?.id ?? addBin(item.suggestedBin, "Suggested");
                        setBinMap((m) => ({ ...m, [item.key]: id }));
                      }}
                    >
                      Suggests {item.suggestedBin}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <Tips />
      )}
    </div>
  );
}

function Tips() {
  const items = useMemo(
    () => [
      "Move slowly. Pause two seconds on each piece.",
      "Open drawers and cabinets if they hold goods.",
      "Stills of labels and serial plates help pricing.",
      "You can uncheck anything that should stay put.",
    ],
    [],
  );
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((tip) => (
        <li key={tip} className="rounded-lg bg-surface px-4 py-3 text-sm text-muted shadow-[var(--shadow-border)]">
          {tip}
        </li>
      ))}
    </ul>
  );
}
