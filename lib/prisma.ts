import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
