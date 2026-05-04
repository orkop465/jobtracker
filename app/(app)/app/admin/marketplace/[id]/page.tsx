import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth/admin";
import { AdminDetailClient } from "./admin-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminMarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!isAdmin(session)) notFound();
  const { id } = await params;
  return <AdminDetailClient id={id} />;
}
