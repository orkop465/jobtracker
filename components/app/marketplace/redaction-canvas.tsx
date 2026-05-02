"use client";

import { useEffect, useRef, useState } from "react";

export interface Rectangle {
  pageIndex: number;
  xNorm: number;
  yNorm: number;
  wNorm: number;
  hNorm: number;
}

interface PageView {
  pageIndex: number;
  width: number;
  height: number;
}

interface Props {
  sourceUrl: string;
  rectangles: Rectangle[];
  onChange: (rects: Rectangle[]) => void;
  onPageCount?: (n: number) => void;
}

const RENDER_WIDTH = 720;

export function RedactionCanvas({ sourceUrl, rectangles, onChange, onPageCount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<
    | { pageIndex: number; startX: number; startY: number; curX: number; curY: number }
    | null
  >(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const pdfjs: typeof import("pdfjs-dist") = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`Could not fetch source (${res.status})`);
        const buf = new Uint8Array(await res.arrayBuffer());

        const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false }).promise;
        if (cancelled) return;

        if (onPageCount) onPageCount(doc.numPages);

        const newPages: PageView[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = RENDER_WIDTH / viewport.width;
          const scaled = page.getViewport({ scale });

          // Render to canvas
          await new Promise<void>((resolve) => {
            requestAnimationFrame(async () => {
              const canvas = canvasRefs.current.get(i - 1);
              if (!canvas) return resolve();
              canvas.width = Math.floor(scaled.width);
              canvas.height = Math.floor(scaled.height);
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve();
              await page.render({
                canvas,
                canvasContext: ctx,
                viewport: scaled,
              } as Parameters<typeof page.render>[0]).promise;
              resolve();
            });
          });

          newPages.push({
            pageIndex: i - 1,
            width: Math.floor(scaled.width),
            height: Math.floor(scaled.height),
          });
          if (cancelled) return;
          setPages([...newPages]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, onPageCount]);

  // Keyboard: Delete selected
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (selectedIdx === null) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const next = rectangles.filter((_, i) => i !== selectedIdx);
        setSelectedIdx(null);
        onChange(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx, rectangles, onChange]);

  function pointerXY(
    e: React.PointerEvent<HTMLDivElement>,
  ): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrag(pageIndex: number, e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pointerXY(e);
    setDrag({ pageIndex, startX: x, startY: y, curX: x, curY: y });
    setSelectedIdx(null);
  }

  function moveDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const { x, y } = pointerXY(e);
    setDrag({ ...drag, curX: x, curY: y });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const page = pages.find((p) => p.pageIndex === drag.pageIndex);
    if (!page) {
      setDrag(null);
      return;
    }
    const minX = Math.max(0, Math.min(drag.startX, drag.curX));
    const minY = Math.max(0, Math.min(drag.startY, drag.curY));
    const maxX = Math.max(drag.startX, drag.curX);
    const maxY = Math.max(drag.startY, drag.curY);
    const w = maxX - minX;
    const h = maxY - minY;
    setDrag(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (w < 6 || h < 6) return;

    const newRect: Rectangle = {
      pageIndex: drag.pageIndex,
      xNorm: minX / page.width,
      yNorm: minY / page.height,
      wNorm: w / page.width,
      hNorm: h / page.height,
    };
    onChange([...rectangles, newRect]);
  }

  if (error) {
    return (
      <div
        style={{
          padding: 32,
          border: "1px solid var(--line)",
          borderRadius: 6,
          fontFamily: "var(--sans)",
          color: "oklch(0.45 0.15 30)",
          background: "oklch(0.96 0.04 30 / 0.5)",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {loading && pages.length === 0 && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ink-3)",
          }}
        >
          Rendering pages…
        </div>
      )}
      {/* Render up to 4 page slots — canvases mount immediately so render() can target them. */}
      {[0, 1, 2, 3].map((i) => {
        const page = pages.find((p) => p.pageIndex === i);
        const visible = !!page;
        const pageRects = rectangles
          .map((r, idx) => ({ ...r, idx }))
          .filter((r) => r.pageIndex === i);
        return (
          <div
            key={i}
            style={{
              position: "relative",
              alignSelf: "center",
              boxShadow: visible ? "var(--shadow-md)" : "none",
              border: visible ? "1px solid var(--line)" : "none",
              background: "white",
              cursor: visible ? "crosshair" : "default",
              touchAction: "none",
              display: visible ? "block" : "none",
              width: page?.width,
              height: page?.height,
            }}
            onPointerDown={(e) => visible && startDrag(i, e)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => setDrag(null)}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(i, el);
                else canvasRefs.current.delete(i);
              }}
              style={{ display: "block" }}
            />
            {/* Existing rectangles */}
            {page &&
              pageRects.map((r) => {
                const x = r.xNorm * page.width;
                const y = r.yNorm * page.height;
                const w = r.wNorm * page.width;
                const h = r.hNorm * page.height;
                const sel = selectedIdx === r.idx;
                return (
                  <div
                    key={r.idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIdx(r.idx);
                    }}
                    style={{
                      position: "absolute",
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      background: "#000",
                      outline: sel ? "1.5px solid var(--accent)" : "none",
                      cursor: "pointer",
                    }}
                    title="Click to select; Delete to remove"
                  />
                );
              })}
            {/* In-progress drag preview */}
            {drag && drag.pageIndex === i && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(drag.startX, drag.curX),
                  top: Math.min(drag.startY, drag.curY),
                  width: Math.abs(drag.curX - drag.startX),
                  height: Math.abs(drag.curY - drag.startY),
                  background: "#000",
                  opacity: 0.7,
                  pointerEvents: "none",
                }}
              />
            )}
            {visible && (
              <div
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 8,
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  background: "var(--bg)",
                  padding: "2px 6px",
                  borderRadius: 2,
                  border: "1px solid var(--line)",
                }}
              >
                Page {i + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
