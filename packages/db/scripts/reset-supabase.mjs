import { readFileSync } from 'node:fs'
import pg from 'pg'

// Полный сброс схемы Supabase и накат актуального DDL начисто. Нужен, когда на
// базе уже лежит прежняя схема: apply-ddl.mjs генерирует from-empty DDL (набор
// CREATE) и спотыкается о существующие объекты. Здесь сперва сносим схему public
// со всем содержимым, пересоздаём её, возвращаем расширения (как в docker/initdb)
// и применяем prisma/schema.sql. ВНИМАНИЕ: стирает все данные в public.
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
try {
  console.log('Сносим схему public и пересоздаём её…')
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  await client.query(
    'CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;',
  )
  console.log('Применяем schema.sql…')
  await client.query(ddl)
  console.log('Схема накатана начисто успешно.')
} catch (e) {
  console.error('Ошибка при сбросе схемы:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
