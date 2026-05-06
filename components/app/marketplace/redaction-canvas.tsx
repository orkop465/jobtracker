"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Rectangle {
  pageIndex: number;
  xNorm: number;
  yNorm: number;
  wNorm: number;
  hNorm: number;
  source?: "rect" | "highlight";
}

interface PageView {
  pageIndex: number;
  width: number;
  height: number;
}

export type RedactionMode = "highlight" | "rect";

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
  const [mode, setMode] = useState<RedactionMode>("highlight");
  const [hasText, setHasText] = useState<boolean | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageWrapRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const rectanglesRef = useRef(rectangles);
  rectanglesRef.current = rectangles;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const suppressNextMouseupRef = useRef(false);

  // Undo/redo history. Tracks every committed rectangle-list snapshot so the
  // user can reverse a redaction without re-uploading. Initialized with the
  // current rectangles so the first commit becomes index 1.
  const [history, setHistory] = useState<{ stack: Rectangle[][]; index: number }>(
    () => ({ stack: [rectangles], index: 0 }),
  );
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  const commit = useCallback((next: Rectangle[]) => {
    setHistory((prev) => ({
      stack: [...prev.stack.slice(0, prev.index + 1), next],
      index: prev.index + 1,
    }));
    onChangeRef.current(next);
  }, []);

  const undo = useCallback(() => {
    if (history.index <= 0) return;
    const newIdx = history.index - 1;
    onChangeRef.current(history.stack[newIdx]);
    setHistory({ ...history, index: newIdx });
  }, [history]);

  const redo = useCallback(() => {
    if (history.index >= history.stack.length - 1) return;
    const newIdx = history.index + 1;
    onChangeRef.current(history.stack[newIdx]);
    setHistory({ ...history, index: newIdx });
  }, [history]);

  function dedupeRects(rects: Rectangle[]): Rectangle[] {
    // Round to ~1px on a typical render to merge near-duplicate rects from
    // overlapping pdfjs spans (e.g. a bullet glyph + its label, or a styled
    // run with separate underline span).
    const seen = new Set<string>();
    const out: Rectangle[] = [];
    for (const r of rects) {
      const key = [
        r.pageIndex,
        r.xNorm.toFixed(4),
        r.yNorm.toFixed(4),
        r.wNorm.toFixed(4),
        r.hNorm.toFixed(4),
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }

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
        let textFound = false;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const scale = RENDER_WIDTH / viewport.width;
          const scaled = page.getViewport({ scale });

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

          const textLayerEl = textLayerRefs.current.get(i - 1);
          if (textLayerEl) {
            textLayerEl.replaceChildren();
            textLayerEl.style.setProperty("--scale-factor", String(scaled.scale));
            textLayerEl.style.setProperty("--total-scale-factor", String(scaled.scale));
            try {
              const textContent = await page.getTextContent();
              if (textContent.items.length > 0) textFound = true;
              const TextLayerCtor = (pdfjs as unknown as { TextLayer?: new (opts: {
                textContentSource: unknown;
                container: HTMLElement;
                viewport: unknown;
              }) => { render: () => Promise<unknown> } }).TextLayer;
              if (TextLayerCtor) {
                const tl = new TextLayerCtor({
                  textContentSource: textContent,
                  container: textLayerEl,
                  viewport: scaled,
                });
                await tl.render();
              }
            } catch {
              // text layer unavailable for this page; ignore
            }
          }

          newPages.push({
            pageIndex: i - 1,
            width: Math.floor(scaled.width),
            height: Math.floor(scaled.height),
          });
          if (cancelled) return;
          setPages([...newPages]);
        }
        if (!cancelled) setHasText(textFound);
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

  // Force rect mode if no text detected anywhere
  useEffect(() => {
    if (hasText === false && mode !== "rect") setMode("rect");
  }, [hasText, mode]);

  // Keyboard: Delete selected, plus Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Y)
  // for undo/redo. Skip when the user is typing in a form field so we don't
  // steal native input undo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (tgt?.isContentEditable) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }

      if (selectedIdx === null) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const next = rectanglesRef.current.filter((_, i) => i !== selectedIdx);
        setSelectedIdx(null);
        commit(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx, commit, undo, redo]);

  // Highlight mode: capture text selection on mouseup, convert to redactions.
  // Range.getClientRects() reflects the CSS transform pdfjs applies to text
  // spans, so it gives correct visual bounds AND supports partial-span
  // selection (e.g. selecting one word inside a longer run). Match each
  // rect to its owning page wrapper by midpoint.
  const commitSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return;

    const pageBoxes = new Map<number, { box: DOMRect; page: PageView }>();
    pageWrapRefs.current.forEach((wrap, pageIndex) => {
      const page = pages.find((p) => p.pageIndex === pageIndex);
      if (!page) return;
      pageBoxes.set(pageIndex, { box: wrap.getBoundingClientRect(), page });
    });

    const newRects: Rectangle[] = [];
    for (const r of clientRects) {
      if (r.width < 2 || r.height < 2) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let owningPageIndex = -1;
      let owningPage: PageView | null = null;
      let owningBox: DOMRect | null = null;
      pageBoxes.forEach(({ box, page }, idx) => {
        if (cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom) {
          owningPageIndex = idx;
          owningPage = page;
          owningBox = box;
        }
      });
      if (owningPageIndex < 0 || !owningPage || !owningBox) continue;
      const ownPage: PageView = owningPage;
      const ownBox: DOMRect = owningBox;

      const localX = r.left - ownBox.left;
      const localY = r.top - ownBox.top;
      // Small padding so glyph extents (descenders, anti-aliasing) are fully covered.
      const pad = 1;
      const x = Math.max(0, localX - pad);
      const y = Math.max(0, localY - pad);
      const w = Math.min(ownPage.width - x, r.width + pad * 2);
      const h = Math.min(ownPage.height - y, r.height + pad * 2);
      if (w <= 0 || h <= 0) continue;
      newRects.push({
        pageIndex: owningPageIndex,
        xNorm: x / ownPage.width,
        yNorm: y / ownPage.height,
        wNorm: w / ownPage.width,
        hNorm: h / ownPage.height,
        source: "highlight",
      });
    }

    selection.removeAllRanges();
    if (newRects.length > 0) {
      const merged = dedupeRects([...rectanglesRef.current, ...newRects]);
      if (merged.length !== rectanglesRef.current.length) commit(merged);
    }
  }, [pages, commit]);

  useEffect(() => {
    if (mode !== "highlight") return;
    function onUp() {
      // Skip the commit if a redaction-removal click just fired — otherwise
      // the same gesture can both delete and re-create the rect.
      if (suppressNextMouseupRef.current) {
        suppressNextMouseupRef.current = false;
        return;
      }
      // Defer so the browser finishes building the selection before we read it.
      setTimeout(commitSelection, 0);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [mode, commitSelection]);

  function pointerXY(
    e: React.PointerEvent<HTMLDivElement>,
  ): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrag(pageIndex: number, e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || mode !== "rect") return;
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
      source: "rect",
    };
    commit([...rectangles, newRect]);
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

  const noTextDetected = hasText === false;

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        .rdx-textlayer {
          position: absolute;
          inset: 0;
          overflow: clip;
          opacity: 1;
          line-height: 1;
          text-align: initial;
          forced-color-adjust: none;
          transform-origin: 0 0;
          z-index: 0;
          --min-font-size: 1;
          --total-scale-factor: 1;
          --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
          --min-font-size-inv: calc(1 / var(--min-font-size));
        }
        .rdx-textlayer :is(span, br) {
          color: transparent;
          position: absolute;
          white-space: pre;
          transform-origin: 0% 0%;
          pointer-events: inherit;
        }
        /* pdfjs sets these per-span CSS variables inline. Without these
           rules the spans don't take their visual size, so selection client
           rects (and our span bounding rects) under-cover large text. */
        .rdx-textlayer > :not(.markedContent),
        .rdx-textlayer .markedContent span:not(.markedContent) {
          z-index: 1;
          --font-height: 0;
          font-size: calc(var(--text-scale-factor) * var(--font-height));
          --scale-x: 1;
          --rotate: 0deg;
          transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
        }
        .rdx-textlayer .markedContent { display: contents; }
        .rdx-textlayer span[role="img"] { user-select: none; cursor: default; }
        .rdx-textlayer.rdx-rect-mode {
          pointer-events: none;
          user-select: none;
        }
        .rdx-textlayer.rdx-highlight-mode {
          user-select: text;
          cursor: text;
        }
        .rdx-textlayer.rdx-highlight-mode ::selection { background: rgba(0,0,0,0.35); }
        .rdx-textlayer.rdx-highlight-mode ::-moz-selection { background: rgba(0,0,0,0.35); }
      `}</style>

      <ModeToolbar
        mode={mode}
        onChange={setMode}
        highlightDisabled={noTextDetected}
        rectangleCount={rectangles.length}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {noTextDetected && (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: 4,
            background: "var(--bg-2)",
            fontFamily: "var(--sans)",
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--accent-ink)",
              marginRight: 8,
            }}
          >
            Notice
          </span>
          No selectable text detected in this PDF (looks like a scanned image). Highlight mode is
          unavailable — use rectangle mode to draw black boxes over PII.
        </div>
      )}

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

      {[0, 1, 2, 3].map((i) => {
        const page = pages.find((p) => p.pageIndex === i);
        const visible = !!page;
        const pageRects = rectangles
          .map((r, idx) => ({ ...r, idx }))
          .filter((r) => r.pageIndex === i);
        return (
          <div
            key={i}
            ref={(el) => {
              if (el) pageWrapRefs.current.set(i, el);
              else pageWrapRefs.current.delete(i);
            }}
            style={{
              position: "relative",
              alignSelf: "center",
              boxShadow: visible ? "var(--shadow-md)" : "none",
              border: visible ? "1px solid var(--line)" : "none",
              background: "white",
              cursor: visible && mode === "rect" ? "crosshair" : "default",
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
            <div
              ref={(el) => {
                if (el) textLayerRefs.current.set(i, el);
                else textLayerRefs.current.delete(i);
              }}
              className={`rdx-textlayer ${
                mode === "highlight" ? "rdx-highlight-mode" : "rdx-rect-mode"
              }`}
            />
            {/* Existing rectangles */}
            {page &&
              pageRects.map((r) => {
                const x = r.xNorm * page.width;
                const y = r.yNorm * page.height;
                const w = r.wNorm * page.width;
                const h = r.hNorm * page.height;
                const sel = selectedIdx === r.idx;
                const isHighlight = r.source === "highlight";
                const clickToUnredact = isHighlight && mode === "highlight";
                return (
                  <div
                    key={r.idx}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (clickToUnredact) {
                        // Suppress the upcoming window-level mouseup so it
                        // doesn't run commitSelection on the same gesture
                        // (and possibly re-create this rect from a transient
                        // selection). Auto-clear after a short delay so the
                        // flag never gets stuck if the mouseup never reaches
                        // the window listener (e.g. preventDefault or target
                        // removal during the gesture).
                        suppressNextMouseupRef.current = true;
                        window.setTimeout(() => {
                          suppressNextMouseupRef.current = false;
                        }, 150);
                        // Bullet glyphs and styled runs (underlined,
                        // bold-italic) often produce multiple stacked highlight
                        // rects covering the same area. Delete the clicked
                        // rect AND any other highlight rect on the same page
                        // whose bbox contains the clicked rect's center.
                        const cx = r.xNorm + r.wNorm / 2;
                        const cy = r.yNorm + r.hNorm / 2;
                        const next = rectanglesRef.current.filter((other, i) => {
                          if (i === r.idx) return false;
                          if (other.source !== "highlight") return true;
                          if (other.pageIndex !== r.pageIndex) return true;
                          const inside =
                            cx >= other.xNorm &&
                            cx <= other.xNorm + other.wNorm &&
                            cy >= other.yNorm &&
                            cy <= other.yNorm + other.hNorm;
                          return !inside;
                        });
                        setSelectedIdx(null);
                        commit(next);
                        return;
                      }
                      setSelectedIdx(r.idx);
                    }}
                    style={{
                      position: "absolute",
                      left: x,
                      top: y,
                      width: w,
                      height: h,
                      background: "#000",
                      outline: sel ? "2px solid var(--accent)" : "none",
                      outlineOffset: 1,
                      cursor: clickToUnredact ? "pointer" : "pointer",
                      // Highlight rects must intercept clicks even though the text
                      // layer above is interactive in highlight mode.
                      zIndex: 2,
                    }}
                    title={
                      clickToUnredact
                        ? "Click to unredact"
                        : "Click to select; Delete to remove"
                    }
                  >
                    {sel && !clickToUnredact && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = rectangles.filter((_, i) => i !== r.idx);
                          setSelectedIdx(null);
                          commit(next);
                        }}
                        title="Delete this redaction"
                        aria-label="Delete redaction"
                        style={{
                          position: "absolute",
                          top: -10,
                          right: -10,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "var(--bg)",
                          color: "var(--ink)",
                          border: "1.5px solid var(--accent)",
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: "18px",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
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
                  zIndex: 3,
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

function ModeToolbar({
  mode,
  onChange,
  highlightDisabled,
  rectangleCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  mode: RedactionMode;
  onChange: (m: RedactionMode) => void;
  highlightDisabled: boolean;
  rectangleCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 5,
        background: "var(--bg-2)",
        padding: "8px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          role="group"
          aria-label="Redaction mode"
          style={{
            display: "inline-flex",
            border: "1px solid var(--line)",
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--bg)",
          }}
        >
          <ModeButton
            label="Highlight"
            hint="Drag across text"
            active={mode === "highlight"}
            disabled={highlightDisabled}
            onClick={() => onChange("highlight")}
          />
          <ModeButton
            label="Rectangle"
            hint="Drag a box"
            active={mode === "rect"}
            onClick={() => onChange("rect")}
          />
        </div>
        <div
          role="group"
          aria-label="History"
          style={{
            display: "inline-flex",
            border: "1px solid var(--line)",
            borderRadius: 4,
            overflow: "hidden",
            background: "var(--bg)",
          }}
        >
          <HistoryButton
            label="Undo"
            hint="Ctrl/⌘+Z"
            disabled={!canUndo}
            onClick={onUndo}
          />
          <HistoryButton
            label="Redo"
            hint="Ctrl/⌘+Shift+Z"
            disabled={!canRedo}
            onClick={onRedo}
          />
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--ink-3)",
        }}
      >
        {mode === "highlight"
          ? "Click a highlight to unredact"
          : "Click box, press Delete to remove"}
        {" · "}
        {rectangleCount} active
      </div>
    </div>
  );
}

function HistoryButton({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} (nothing to ${label.toLowerCase()})` : `${label} · ${hint}`}
      style={{
        padding: "6px 12px",
        background: "transparent",
        color: disabled ? "var(--ink-3)" : "var(--ink-2)",
        border: "none",
        borderRight: "1px solid var(--line)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );
}

function ModeButton({
  label,
  hint,
  active,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Unavailable for this PDF" : hint}
      style={{
        padding: "6px 14px",
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--bg)" : disabled ? "var(--ink-3)" : "var(--ink-2)",
        border: "none",
        borderRight: "1px solid var(--line)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        cursor: disabled ? "not-allowed" : active ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
