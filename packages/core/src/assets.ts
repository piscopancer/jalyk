import { Effect } from 'effect'
import { query } from './db.ts'
import { NotFoundError } from './errors.ts'

// Доменные операции над ассетами. Метаданные (имя, тип, размер, ключ хранилища)
// лежат в БД, сами байты — в AssetStorage. Запись изолирована по projectId;
// чтение по id оставлено без фильтра проекта, т.к. ассеты раздаются публично по
// неугадываемому cuid (как CDN-ссылки Sanity) — <img> не умеет слать X-Api-Key.

/** Создать запись ассета. key — внутренний путь объекта в хранилище. */
export const createAsset = (
  projectId: string,
  data: { key: string; filename: string; contentType: string; size: number },
) => query((db) => db.asset.create({ data: { projectId, ...data } }))

/** Ассет по id без фильтра проекта — для публичной раздачи байтов. */
export const getAssetById = (id: string) =>
  query((db) => db.asset.findUnique({ where: { id } }))

/** Все ассеты проекта, новые сверху (изоляция по projectId). */
export const listAssets = (projectId: string) =>
  query((db) =>
    db.asset.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } }),
  )

/** Лимит хранилища проекта в байтах. Пока единая константа (1 ГиБ); когда у
 * проектов появятся тарифы, значение переедет в запись проекта и будет читаться
 * из неё в getAssetUsage. */
export const ASSET_QUOTA_BYTES = 1024 ** 3

/** Использование хранилища проектом: суммарный вес ассетов (агрегат по БД,
 * изоляция по projectId) и текущий лимит. */
export const getAssetUsage = (projectId: string) =>
  query((db) =>
    db.asset.aggregate({ where: { projectId }, _sum: { size: true } }),
  ).pipe(
    Effect.map((result) => ({
      used: result._sum.size ?? 0,
      quota: ASSET_QUOTA_BYTES,
    })),
  )

/** Удалить ассет проекта. Возвращает удалённую запись (нужен key, чтобы стереть
 * байты из хранилища). NotFoundError, если чужой/нет — сперва читаем с фильтром
 * по projectId (изоляция), затем удаляем по id. */
export const deleteAsset = (projectId: string, id: string) =>
  Effect.gen(function* () {
    const asset = yield* query((db) =>
      db.asset.findFirst({ where: { id, projectId } }),
    )
    if (!asset) {
      return yield* Effect.fail(new NotFoundError({ what: 'asset' }))
    }
    yield* query((db) => db.asset.delete({ where: { id } }))
    return asset
  })
