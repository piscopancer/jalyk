import { defineConfig } from 'prisma/config'

// URL подключения нужен лишь командам Prisma CLI, реально ходящим в БД (migrate /
// db push): их запускают с --env-file, задающим строку окружения (SUPABASE_DIRECT_URL
// для прода, DATABASE_URL для локали). Для `prisma generate` (postinstall) соединение
// не открывается, поэтому при отсутствии переменных подставляем заглушку — в codegen
// она не используется. Намеренно НЕ импортируем src/config.ts: тот синхронно резолвит
// состояние (JALYK_DB_STATE и др.), которых при install ещё нет, и уронил бы generate.
const url =
  process.env.SUPABASE_DIRECT_URL ??
  process.env.DATABASE_URL ??
  'postgresql://placeholder'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url },
})
