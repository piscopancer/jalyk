import { query } from './db.ts'

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
export const getAssetById = (id: string) => query((db) => db.asset.findUnique({ where: { id } }))
