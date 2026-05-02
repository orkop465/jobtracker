import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth/admin";
import { AdminQueueClient } from "./admin-queue-client";

export const dynamic = "force-dynamic";

export default async function AdminMarketplacePage() {
  const session = await auth();
  if (!isAdmin(session)) notFound();
  return <AdminQueueClient />;
}
