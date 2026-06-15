import { defineConfig } from 'prisma/config'
import { databaseUrl } from './src/config.ts'

// Prisma 7: URL подключения для CLI (migrate / db push) живёт здесь, а не в
// schema.prisma. Источник URL — единый модуль src/config.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})
