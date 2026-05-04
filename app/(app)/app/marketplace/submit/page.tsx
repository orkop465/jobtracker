import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SubmitClient } from "./submit-client";

export const dynamic = "force-dynamic";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app/marketplace");

  const sp = await searchParams;
  const source = typeof sp.source === "string" ? sp.source : "";
  if (!source) redirect("/app/marketplace");

  return <SubmitClient stagingKey={source} />;
}
