-- Добавление значения 'reader' в enum Role. Ручная миграция для существующих БД
-- (локальная и Supabase, где enum уже создан): на чистой базе значение появляется
-- сразу из prisma/schema.sql. Идемпотентно: при наличии значения ничего не делает.
--
-- Применение: запустить scripts/apply-migration.mjs с этим файлом.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'reader';
