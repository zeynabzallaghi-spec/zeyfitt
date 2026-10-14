import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // حریم خصوصی: کوئری‌ها مقادیر پارامترها (اطلاعات سلامت و پروفایل) را در
    // برمی‌دارند؛ فقط خطاها لاگ می‌شوند.
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db