import { createCanvas, type Canvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";
import { LIMITS } from "./constants";

export interface Rectangle {
  pageIndex: number;
  xNorm: number;
  yNorm: number;
  wNorm: number;
  hNorm: number;
}

export interface RasterizeResult {
  pdfBytes: Uint8Array;
  thumbBytes: Uint8Array;
  pageCount: number;
}

const DPI = LIMITS.rasterizeDpi;
const SCALE = DPI / 72;

function isFiniteUnit(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

export function validateRectangles(rects: unknown): Rectangle[] {
  if (!Array.isArray(rects) || rects.length === 0) {
    throw new Error("At least one redaction required");
  }
  const out: Rectangle[] = [];
  for (const r of rects) {
    if (typeof r !== "object" || r === null) throw new Error("Invalid rectangle");
    const o = r as Record<string, unknown>;
    if (typeof o.pageIndex !== "number" || !Number.isInteger(o.pageIndex) || o.pageIndex < 0)
      throw new Error("Invalid rectangle pageIndex");
    if (!isFiniteUnit(o.xNorm) || !isFiniteUnit(o.yNorm) || !isFiniteUnit(o.wNorm) || !isFiniteUnit(o.hNorm))
      throw new Error("Rectangle coordinates out of page bounds");
    if (o.xNorm + o.wNorm > 1.0001 || o.yNorm + o.hNorm > 1.0001)
      throw new Error("Rectangle coordinates out of page bounds");
    if (o.wNorm <= 0 || o.hNorm <= 0) throw new Error("Rectangle has zero size");
    out.push({
      pageIndex: o.pageIndex,
      xNorm: o.xNorm,
      yNorm: o.yNorm,
      wNorm: o.wNorm,
      hNorm: o.hNorm,
    });
  }
  return out;
}

async function loadPdfjs() {
  // pdfjs-dist v5 ESM entry; legacy build avoids worker requirement on server.
  const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return mod;
}

async function renderPageToCanvas(page: unknown): Promise<Canvas> {
  // Loose typing: pdfjs-dist's PDFPageProxy uses DOM-coupled types that
  // don't line up with @napi-rs/canvas. The render contract at runtime
  // accepts a node canvas context just fine.
  const p = page as {
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: Record<string, unknown>) => { promise: Promise<void> };
  };
  const viewport = p.getViewport({ scale: SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await p.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas;
}

function burnRectangles(canvas: Canvas, rects: Rectangle[]) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  for (const r of rects) {
    ctx.fillRect(
      Math.floor(r.xNorm * canvas.width),
      Math.floor(r.yNorm * canvas.height),
      Math.ceil(r.wNorm * canvas.width),
      Math.ceil(r.hNorm * canvas.height),
    );
  }
}

export async function rasterize(args: {
  sourcePdf: Buffer;
  rectangles: Rectangle[];
  title: string;
}): Promise<RasterizeResult> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(args.sourcePdf),
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  if (pageCount > LIMITS.maxPages) {
    throw new Error(`Source has ${pageCount} pages; max ${LIMITS.maxPages}`);
  }

  const out = await PDFDocument.create();
  let firstPagePngBytes: Uint8Array | null = null;

  for (let i = 0; i < pageCount; i++) {
    const page = await doc.getPage(i + 1);
    const canvas = await renderPageToCanvas(page);
    const pageRects = args.rectangles.filter((r) => r.pageIndex === i);
    burnRectangles(canvas, pageRects);

    const pngBytes = await canvas.encode("png");
    if (i === 0) firstPagePngBytes = pngBytes;

    const png = await out.embedPng(pngBytes);
    const pdfPage = out.addPage([canvas.width / SCALE, canvas.height / SCALE]);
    pdfPage.drawImage(png, {
      x: 0,
      y: 0,
      width: pdfPage.getWidth(),
      height: pdfPage.getHeight(),
    });
  }

  const safeTitle = args.title.slice(0, 100);
  out.setTitle(safeTitle);
  out.setAuthor("");
  out.setSubject("");
  out.setKeywords([]);
  out.setProducer("jobtracker-marketplace");
  out.setCreator("jobtracker-marketplace");
  out.setCreationDate(new Date());
  out.setModificationDate(new Date());

  const pdfBytes = await out.save({ useObjectStreams: true });

  // Thumbnail: ~360px wide JPEG of page 1.
  const thumbBytes = await makeThumb(firstPagePngBytes!);

  return { pdfBytes, thumbBytes, pageCount };
}

async function makeThumb(pngBytes: Uint8Array): Promise<Uint8Array> {
  const { loadImage, createCanvas: cc } = await import("@napi-rs/canvas");
  const img = await loadImage(Buffer.from(pngBytes));
  const targetWidth = 360;
  const scale = targetWidth / img.width;
  const targetHeight = Math.round(img.height * scale);
  const c = cc(targetWidth, targetHeight);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return c.encode("jpeg", 78);
}

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");
export function looksLikePdf(buf: Buffer): boolean {
  return buf.length >= PDF_MAGIC.length && buf.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
}
