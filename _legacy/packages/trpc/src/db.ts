import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './prisma'

export const db = new PrismaClient({
  adapter: new PrismaPg({}),
})
