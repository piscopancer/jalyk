import { readFileSync } from 'node:fs'
import pg from 'pg'

// Накат схемы на Supabase в обход Prisma CLI. Prisma-движок миграций рвёт
// соединение через Supavisor (P1017), а прямой хост db.<ref>.supabase.co
// доступен только по IPv6, которого нет. Поэтому DDL применяем тем же путём,
// что и рантайм приложения, — драйвером pg через transaction pooler (:6543).
// Источник DDL — prisma/schema.sql (генерируется командой `ddl`).
//
// SUPABASE_DATABASE_URL подхватывается из корневого .env через `node --env-file`.

const url = process.env.SUPABASE_DATABASE_URL
if (!url) {
  console.error('SUPABASE_DATABASE_URL не задан (ожидается в корневом .env)')
  process.exit(1)
}

const ddl = readFileSync(new URL('../prisma/schema.sql', import.meta.url), 'utf8')

const client = new pg.Client({ connectionString: url })
await client.connect()
console.log('Подключились к Supabase, применяем schema.sql…')
try {
  await client.query(ddl)
  console.log('Схема накатана успешно.')
} catch (e) {
  console.error('Ошибка при накате схемы:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
