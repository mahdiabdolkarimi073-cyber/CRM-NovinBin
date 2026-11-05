import { PrismaClient } from '@prisma/client';

const fallbackDatabaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:123456@localhost:5432/novinbin';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = fallbackDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || fallbackDatabaseUrl,
      },
    },
  });

globalForPrisma.prisma = prisma;

