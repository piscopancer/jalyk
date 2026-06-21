import { Effect } from 'effect'
import { Prisma } from '@jalyk/db'
import { query } from './db.ts'
import { NotFoundError } from './errors.ts'

// Доменные операции над документами. Все они фильтруют по projectId — это
// продолжение изоляции: даже зная чужой id, через эти функции до данных не
// добраться (фильтр по projectId возвращает 0 строк → NotFoundError). Форму
// data сервер не валидирует, её диктует клиентская схема студии.

/** Создать документ-черновик. published пуст до первой публикации. */
export const createDocument = (
  projectId: string,
  type: string,
  draft: unknown,
) =>
  query((db) =>
    db.document.create({
      data: { projectId, type, draft: draft as Prisma.InputJsonValue },
    }),
  )

/** Одна сущность с фильтром по projectId (изоляция). null, если чужая/нет. */
export const getDocument = (projectId: string, id: string) =>
  query((db) => db.document.findFirst({ where: { id, projectId } }))

/** Список документов проекта по типу, новые сверху. */
export const listDocuments = (projectId: string, type: string) =>
  query((db) =>
    db.document.findMany({
      where: { projectId, type },
      orderBy: { updatedAt: 'desc' },
    }),
  )

/** Количество документов по каждому типу проекта (для <AllDocumentTypes/>). */
export const countDocumentsByType = (projectId: string) =>
  query((db) =>
    db.document.groupBy({
      by: ['type'],
      where: { projectId },
      _count: { _all: true },
    }),
  ).pipe(
    Effect.map((rows) =>
      rows.map((r) => ({ type: r.type, count: r._count._all })),
    ),
  )

/**
 * Точечная запись поля-по-пути в draft через jsonb_set, без перезаписи всего
 * документа. path — массив ключей (для массивов — строковый индекс). Пустой путь
 * заменяет весь draft. Возвращает применённую path-дельту и тип документа (через
 * RETURNING — для SSE-событий, чтобы не делать лишний запрос). NotFoundError,
 * если документ не принадлежит проекту.
 *
 * jsonb_set с create_missing=true создаёт только последний недостающий ключ и
 * лишь когда весь путь до него уже существует; при отсутствующем промежуточном
 * родителе он молча возвращает исходный JSON (no-op). Поэтому для вложенных полей
 * (например originalLyrics.language) каждого недостающего родителя достраиваем
 * заранее: оборачиваем выражение во вложенные jsonb_set по префиксам пути,
 * подставляя пустой контейнер — '[]' если следующий ключ числовой (индекс
 * массива), иначе '{}'. coalesce оставляет уже существующего родителя нетронутым.
 */
export const setDocumentField = (
  projectId: string,
  id: string,
  path: readonly string[],
  value: unknown,
) =>
  Effect.gen(function* () {
    const valueJson = JSON.stringify(value ?? null)
    const rows = yield* query((db) => {
      if (path.length === 0) {
        return db.$queryRaw<{ type: string }[]>`
            UPDATE "document"
            SET "draft" = ${valueJson}::jsonb, "updatedAt" = now()
            WHERE "id" = ${id} AND "projectId" = ${projectId}
            RETURNING "type"`
      }
      // Достраиваем недостающих родителей по каждому префиксу пути.
      let target = Prisma.sql`"draft"`
      for (let i = 1; i < path.length; i++) {
        const prefix = path.slice(0, i)
        const container = /^\d+$/.test(path[i]!) ? '[]' : '{}'
        target = Prisma.sql`jsonb_set(${target}, ${prefix}::text[], coalesce("draft" #> ${prefix}::text[], ${container}::jsonb), true)`
      }
      return db.$queryRaw<{ type: string }[]>(Prisma.sql`
            UPDATE "document"
            SET "draft" = jsonb_set(${target}, ${path}::text[], ${valueJson}::jsonb, true),
                "updatedAt" = now()
            WHERE "id" = ${id} AND "projectId" = ${projectId}
            RETURNING "type"`)
    })
    if (rows.length === 0) {
      return yield* Effect.fail(new NotFoundError({ what: 'document' }))
    }
    return { path, value, type: rows[0]!.type }
  })

/** Опубликовать: скопировать draft → published, проставить publishedAt. */
export const publishDocument = (projectId: string, id: string) =>
  Effect.gen(function* () {
    const doc = yield* getDocument(projectId, id)
    if (!doc) {
      return yield* Effect.fail(new NotFoundError({ what: 'document' }))
    }
    return yield* query((db) =>
      db.document.update({
        where: { id },
        data: {
          published: doc.draft as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      }),
    )
  })

/** Сбросить черновик до опубликованной версии: published → draft. Если документ
 * ещё не публиковали (published пуст), черновик становится пустым объектом.
 * NotFoundError, если документ не принадлежит проекту. */
export const resetDraftDocument = (projectId: string, id: string) =>
  Effect.gen(function* () {
    const doc = yield* getDocument(projectId, id)
    if (!doc) {
      return yield* Effect.fail(new NotFoundError({ what: 'document' }))
    }
    return yield* query((db) =>
      db.document.update({
        where: { id },
        data: { draft: (doc.published ?? {}) as Prisma.InputJsonValue },
      }),
    )
  })

/** Удалить документ с проверкой принадлежности проекту. Возвращает тип удалённого
 * документа (для SSE-события). NotFoundError, если чужой/нет. Сперва читаем с
 * фильтром по projectId (изоляция + нужен тип), затем удаляем по id. */
export const deleteDocument = (projectId: string, id: string) =>
  Effect.gen(function* () {
    const doc = yield* getDocument(projectId, id)
    if (!doc) {
      return yield* Effect.fail(new NotFoundError({ what: 'document' }))
    }
    yield* query((db) => db.document.delete({ where: { id } }))
    return { type: doc.type }
  })
