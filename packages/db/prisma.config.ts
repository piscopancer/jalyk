import { defineConfig } from 'prisma/config'

// Prisma 7: URL подключения для CLI (migrate / db push) живёт здесь, а не в
// schema.prisma. Сам PrismaClient использует driver adapter (см. src/client.ts).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
})
