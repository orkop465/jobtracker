import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { MarketplaceRoleCategory, MarketplaceSeniority, Prisma } from "@prisma/client";
import { LIMITS } from "@/lib/app/marketplace/constants";
import { toPublicDto } from "@/lib/app/marketplace/serialize";

const ROLE_VALUES: MarketplaceRoleCategory[] = [
  "SWE",
  "PM",
  "DESIGN",
  "DATA",
  "ML",
  "DEVOPS",
  "SECURITY",
  "OTHER",
];
const SENIORITY_VALUES: MarketplaceSeniority[] = [
  "STUDENT",
  "INTERN",
  "ENTRY",
  "MID",
  "SENIOR",
  "STAFF_PLUS",
];

function parseRoleList(s: string | null): MarketplaceRoleCategory[] {
  if (!s) return [];
  return s
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is MarketplaceRoleCategory => ROLE_VALUES.includes(v as MarketplaceRoleCategory));
}
function parseSeniorityList(s: string | null): MarketplaceSeniority[] {
  if (!s) return [];
  return s
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is MarketplaceSeniority =>
      SENIORITY_VALUES.includes(v as MarketplaceSeniority),
    );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const roles = parseRoleList(url.searchParams.get("role"));
  const seniorities = parseSeniorityList(url.searchParams.get("seniority"));
  const sort = url.searchParams.get("sort") ?? "new";
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? LIMITS.pageSize), 60);

  const where: Prisma.PublicResumeWhereInput = { status: "PUBLISHED" };
  if (roles.length) where.roleCategory = { in: roles };
  if (seniorities.length) where.seniority = { in: seniorities };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.PublicResumeOrderByWithRelationInput[] = (() => {
    if (sort === "top") return [{ ratingSum: "desc" }, { ratingCount: "desc" }, { id: "desc" }];
    if (sort === "placed") return [{ ratingCount: "desc" }, { publishedAt: "desc" }, { id: "desc" }];
    return [{ featured: "desc" }, { publishedAt: "desc" }, { id: "desc" }];
  })();

  const items = await prisma.publicResume.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = items.length > limit ? items[items.length - 2].id : null;
  const trimmed = items.slice(0, limit);
  return NextResponse.json({
    items: trimmed.map(toPublicDto),
    nextCursor,
  });
}
