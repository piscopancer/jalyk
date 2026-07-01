import { readFileSync } from 'node:fs'
import pg from 'pg'

// Применение ручной SQL-миграции к продовой базе Supabase. Аналог
// apply-migration.mjs, но URL берётся из SUPABASE_DATABASE_URL (как в
// apply-ddl.mjs) и подключение идёт через transaction pooler (:6543), потому что
// прямой хост доступен только по IPv6. Правим уже существующую базу с данными —
// миграции должны быть идемпотентными.
//
// Использование:
//   node --env-file=../../.env.production scripts/apply-migration-supabase.mjs <файл.sql>

const file = process.argv[2]
if (!file) {
  console.error('Укажите путь к .sql-файлу миграции')
  process.exit(1)
}

const url = process.env.SUPABASE_DATABASE_URL
if (!url) {
  console.error('SUPABASE_DATABASE_URL не задан (ожидается в .env.production)')
  process.exit(1)
}

const sql = readFileSync(new URL(file, `file://${process.cwd()}/`), 'utf8')

const client = new pg.Client({ connectionString: url })
await client.connect()
console.log(`Подключились к Supabase, применяем миграцию ${file}…`)
try {
  await client.query(sql)
  console.log('Миграция применена успешно.')
} catch (e) {
  console.error('Ошибка при миграции:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
