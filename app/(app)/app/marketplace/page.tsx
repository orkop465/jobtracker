import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketplaceClient } from "./marketplace-client";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app/marketplace");
  return <MarketplaceClient />;
}
