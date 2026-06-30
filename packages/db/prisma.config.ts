import { defineConfig } from 'prisma/config'
import { migrationUrl } from './src/config.ts'

// Prisma 7: URL подключения для CLI (migrate / db push) живёт здесь, а не в
// schema.prisma. Источник URL — единый модуль src/config.ts; для миграций берём
// migrationUrl выбранного окружения (у Supabase это session pooler :5432).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: migrationUrl,
  },
})
