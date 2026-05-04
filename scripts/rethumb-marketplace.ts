// One-shot maintenance: regenerate JPEG thumbnails for existing
// PublicResume rows at the new higher resolution. Safe to re-run.
//
// Usage: npx tsx scripts/rethumb-marketplace.ts

import { Storage } from "@google-cloud/storage";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prisma } from "../lib/prisma";

const storage = new Storage();

function parseGsPath(path: string) {
  if (!path.startsWith("gs://")) throw new Error("Invalid gcsPath");
  const without = path.slice(5);
  const i = without.indexOf("/");
  return { bucket: without.slice(0, i), object: without.slice(i + 1) };
}

const TARGET_WIDTH = 1000;
const RENDER_DPI = 150;

async function renderPage1ToPng(pdfBytes: Buffer): Promise<Uint8Array> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: RENDER_DPI / 72 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // pdfjs DOM types don't line up with @napi-rs/canvas; runtime accepts it.
  await page
    .render({ canvas, canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0])
    .promise;
  return canvas.encode("png");
}

async function makeThumb(pngBytes: Uint8Array): Promise<Uint8Array> {
  const img = await loadImage(Buffer.from(pngBytes));
  const scale = TARGET_WIDTH / img.width;
  const targetHeight = Math.round(img.height * scale);
  const c = createCanvas(TARGET_WIDTH, targetHeight);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_WIDTH, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, TARGET_WIDTH, targetHeight);
  return c.encode("jpeg", 85);
}

async function main() {
  const rows = await prisma.publicResume.findMany({
    select: { id: true, gcsPath: true, thumbGcsPath: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${rows.length} marketplace resume(s).`);

  for (const r of rows) {
    try {
      const { bucket, object } = parseGsPath(r.gcsPath);
      const [pdfBuf] = await storage.bucket(bucket).file(object).download();
      const pngBytes = await renderPage1ToPng(pdfBuf);
      const jpegBytes = await makeThumb(pngBytes);

      const thumbObject = r.thumbGcsPath
        ? parseGsPath(r.thumbGcsPath).object
        : `marketplace/${r.id}-thumb.jpg`;
      await storage.bucket(bucket).file(thumbObject).save(Buffer.from(jpegBytes), {
        contentType: "image/jpeg",
        resumable: false,
      });

      if (!r.thumbGcsPath) {
        await prisma.publicResume.update({
          where: { id: r.id },
          data: { thumbGcsPath: `gs://${bucket}/${thumbObject}` },
        });
      }
      console.log(`  rethumb ${r.id} -> ${jpegBytes.length} bytes`);
    } catch (e) {
      console.error(`  FAILED ${r.id}:`, e instanceof Error ? e.message : e);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
