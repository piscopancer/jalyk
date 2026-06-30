-- Переименование таблицы member → invited с переносом данных. Ручная миграция
-- для локальной БД (где уже есть данные): на Supabase ничего нет, там просто
-- ddl:push. Владельца в новой модели в таблице нет — он живёт в project.ownerId,
-- поэтому строки с ролью owner удаляются (их данные уже продублированы ownerId).
--
-- Применение (локально): запустить scripts/apply-migration.mjs с этим файлом.
-- Идемпотентно: при отсутствии таблицы member ничего не делает.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member'
  ) THEN
    -- Переносим структуру: таблица, её первичный ключ, индексы и внешние ключи
    -- получают имена, которых ждёт текущая схема (см. prisma/schema.sql).
    ALTER TABLE "member" RENAME TO "invited";
    ALTER TABLE "invited" RENAME CONSTRAINT "member_pkey" TO "invited_pkey";
    ALTER TABLE "invited" RENAME CONSTRAINT "member_projectId_fkey" TO "invited_projectId_fkey";
    ALTER TABLE "invited" RENAME CONSTRAINT "member_userId_fkey" TO "invited_userId_fkey";
    ALTER INDEX "member_userId_idx" RENAME TO "invited_userId_idx";
    ALTER INDEX "member_projectId_userId_key" RENAME TO "invited_projectId_userId_key";

    -- Владелец больше не участник-строка: его роль теперь читается из ownerId.
    DELETE FROM "invited" WHERE "role" = 'owner';
  END IF;
END $$;
