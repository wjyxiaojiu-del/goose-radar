import { PrismaClient } from '@prisma/client';

// 启动时校验关键环境变量（fail-fast）
// 不依赖 @t3-oss/env-nextjs（在 jsdom 测试环境下有 OOM 问题）
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  if (!process.env.API_SECRET) {
    throw new Error('Missing required environment variable: API_SECRET');
  }
}
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '').split('?')[0] || './dev.db';
  const db = new Database(dbPath);
  const adapter = new PrismaBetterSqlite3(db);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
