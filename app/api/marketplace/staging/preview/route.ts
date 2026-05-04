import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { stagingPrefix } from "@/lib/app/marketplace/constants";
import { readBuffer } from "@/lib/app/marketplace/storage";

// Streams the user's own staged PDF back to the browser for the redaction
// canvas. Path-prefix ownership check; never serves another user's bytes.
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  if (!key.startsWith(stagingPrefix(userId))) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buf = await readBuffer(key);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
