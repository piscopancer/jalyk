import { readFileSync } from 'node:fs'
import pg from 'pg'

// Применение ручной SQL-миграции к локальной БД. В отличие от apply-ddl.mjs
// (полный from-empty DDL на Supabase) здесь правим уже существующую базу с
// данными, поэтому миграции пишутся идемпотентно и переносят данные.
//
// Использование: node --env-file-if-exists=../../.env scripts/apply-migration.mjs <файл.sql>
// URL берётся из DATABASE_URL (по умолчанию локальный Docker-Postgres).

const file = process.argv[2]
if (!file) {
  console.error('Укажите путь к .sql-файлу миграции')
  process.exit(1)
}

const url =
  process.env.DATABASE_URL ?? 'postgresql://jalyk:jalyk@localhost:5432/jalyk'
const sql = readFileSync(new URL(file, `file://${process.cwd()}/`), 'utf8')

const client = new pg.Client({ connectionString: url })
await client.connect()
console.log(`Применяем миграцию ${file}…`)
try {
  await client.query(sql)
  console.log('Миграция применена успешно.')
} catch (e) {
  console.error('Ошибка при миграции:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
