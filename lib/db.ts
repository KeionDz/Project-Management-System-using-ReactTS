import { PrismaClient } from '@/lib/generated/prisma'

declare global {
  // Prevent TypeScript error about `globalThis` type
  var prismaGlobal: PrismaClient | undefined
}

const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

export default prisma
