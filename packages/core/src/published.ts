import { Prisma } from '@jalyk/db'
import { Effect } from 'effect'
import { type Database, query } from './db.ts'
import type { DbError } from './errors.ts'

// Чтение ОПУБЛИКОВАННОГО контента для сайтов-потребителей. В отличие от студии
// (та грузит все документы типа и фильтрует where/select в JS), здесь корневой
// отбор where/orderBy/skip/take исполняется реальным SQL поверх колонки published
// JSONB, а джоины ссылок резолвятся батчами по уровню: на каждый уровень select —
// один запрос `id IN (...)`, без N+1. Глубину задаёт само дерево select (конечно),
// поэтому искусственного потолка нет. Схему контента сервер по-прежнему не знает:
// тип поля (скаляр или ссылка) распознаётся по форме JSONB-значения во время SQL.

type Loaded = { id: string; type: string; published: unknown }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const isRef = (value: unknown): value is { _ref: string; _toType: string } =>
  isRecord(value) &&
  typeof value._ref === 'string' &&
  typeof value._toType === 'string'

const pubOf = (row: Loaded) => (isRecord(row.published) ? row.published : {})

/** Текст для сравнения в where: для ссылки берём её id (#>>'{key,_ref}'), для скаляра — само значение (->>key). Тип значения распознаём по jsonb_typeof, без знания схемы. */
const textAt = (key: string) =>
  Prisma.sql`(CASE WHEN jsonb_typeof("published" -> ${key}) = 'object' THEN "published" #>> ARRAY[${key}, '_ref'] ELSE "published" ->> ${key} END)`

/** Предикат одного скалярного фильтра (строка/число/булево либо объект-операторы) поверх текстового аксессора acc. */
const scalarClause = (acc: Prisma.Sql, filter: unknown): Prisma.Sql => {
  if (!isRecord(filter)) return Prisma.sql`${acc} = ${String(filter)}`
  const num = Prisma.sql`(${acc})::numeric`
  const parts: Prisma.Sql[] = []
  if (filter.equals !== undefined)
    parts.push(Prisma.sql`${acc} = ${String(filter.equals)}`)
  if (filter.not !== undefined)
    parts.push(Prisma.sql`${acc} IS DISTINCT FROM ${String(filter.not)}`)
  if (Array.isArray(filter.in))
    parts.push(
      filter.in.length
        ? Prisma.sql`${acc} IN (${Prisma.join(filter.in.map(String))})`
        : Prisma.sql`FALSE`,
    )
  if (typeof filter.contains === 'string')
    parts.push(Prisma.sql`${acc} ILIKE ${`%${filter.contains}%`}`)
  if (typeof filter.startsWith === 'string')
    parts.push(Prisma.sql`${acc} ILIKE ${`${filter.startsWith}%`}`)
  if (typeof filter.lt === 'number') parts.push(Prisma.sql`${num} < ${filter.lt}`)
  if (typeof filter.lte === 'number')
    parts.push(Prisma.sql`${num} <= ${filter.lte}`)
  if (typeof filter.gt === 'number') parts.push(Prisma.sql`${num} > ${filter.gt}`)
  if (typeof filter.gte === 'number')
    parts.push(Prisma.sql`${num} >= ${filter.gte}`)
  return parts.length ? Prisma.join(parts, ' AND ') : Prisma.sql`TRUE`
}

/** Где-древо → SQL-предикат: поля по значению/ссылке, id по колонке, узлы AND/OR/NOT рекурсивно. */
const buildWhere = (where: Record<string, unknown>): Prisma.Sql => {
  const clauses: Prisma.Sql[] = []
  for (const [key, filter] of Object.entries(where)) {
    if (filter === undefined) continue
    if (key === 'AND') {
      if (Array.isArray(filter) && filter.length)
        clauses.push(
          Prisma.sql`(${Prisma.join(
            filter.map((sub) => buildWhere(sub as Record<string, unknown>)),
            ' AND ',
          )})`,
        )
      continue
    }
    if (key === 'OR') {
      if (Array.isArray(filter) && filter.length)
        clauses.push(
          Prisma.sql`(${Prisma.join(
            filter.map((sub) => buildWhere(sub as Record<string, unknown>)),
            ' OR ',
          )})`,
        )
      continue
    }
    if (key === 'NOT') {
      if (isRecord(filter))
        clauses.push(Prisma.sql`NOT (${buildWhere(filter)})`)
      continue
    }
    const acc = key === 'id' ? Prisma.sql`"id"` : textAt(key)
    clauses.push(scalarClause(acc, filter))
  }
  return clauses.length ? Prisma.join(clauses, ' AND ') : Prisma.sql`TRUE`
}

/** ORDER BY по jsonb-значению поля: jsonb сравнивает числа численно, строки лексикографически — тип знать не нужно. */
const buildOrderBy = (orderBy: Record<string, unknown>) => {
  const parts = Object.entries(orderBy).flatMap(([key, dir]) =>
    dir === 'asc' || dir === 'desc'
      ? [
          Prisma.sql`"published" -> ${key} ${Prisma.raw(dir === 'desc' ? 'DESC' : 'ASC')}`,
        ]
      : [],
  )
  return parts.length
    ? Prisma.sql`ORDER BY ${Prisma.join(parts, ', ')}`
    : Prisma.empty
}

/** Загрузить опубликованные документы проекта по набору id одним запросом (батч уровня джоина). */
const loadByIds = (projectId: string, ids: readonly string[]) =>
  ids.length === 0
    ? Effect.succeed<Loaded[]>([])
    : query((db) =>
        db.$queryRaw<Loaded[]>(Prisma.sql`
          SELECT "id", "type", "published"
          FROM "document"
          WHERE "projectId" = ${projectId}
            AND "published" IS NOT NULL
            AND "id" IN (${Prisma.join([...ids])})`),
      )

/** id-ы всех ссылок поля key во всех строках — для одного батч-запроса уровня. */
const refIdsOf = (rows: readonly Loaded[], key: string) => {
  const ids = new Set<string>()
  for (const row of rows) {
    const value = pubOf(row)[key]
    if (isRef(value)) ids.add(value._ref)
    else if (Array.isArray(value))
      for (const el of value) if (isRef(el)) ids.add(el._ref)
  }
  return ids
}

/**
 * Проецирует строки по дереву select. Скаляр с `true` копируется как есть; поле со
 * вложенным select — ссылка (или массив ссылок), которая дереференсится. Все ссылки
 * текущего уровня грузятся одним запросом, затем каждый ключ-джоин проецируется
 * рекурсивно — глубже уходим только туда, куда велит select.
 */
const projectRows = (
  projectId: string,
  rows: readonly Loaded[],
  select: Record<string, unknown>,
): Effect.Effect<Record<string, unknown>[], DbError, Database> =>
  Effect.gen(function* () {
    const joinKeys = Object.entries(select).filter(
      ([key, sel]) => sel !== true && key !== 'id' && key !== '_type',
    )
    const union = new Set<string>()
    const keyTargets = new Map<string, Set<string>>()
    for (const [key] of joinKeys) {
      const ids = refIdsOf(rows, key)
      keyTargets.set(key, ids)
      for (const id of ids) union.add(id)
    }
    const loaded = yield* loadByIds(projectId, [...union])
    const byId = new Map(loaded.map((row) => [row.id, row]))
    const nested = new Map<string, Map<string, Record<string, unknown>>>()
    for (const [key, sel] of joinKeys) {
      const targets = [...keyTargets.get(key)!].flatMap((id) => {
        const row = byId.get(id)
        return row ? [row] : []
      })
      const projected = yield* projectRows(
        projectId,
        targets,
        sel as Record<string, unknown>,
      )
      nested.set(key, new Map(targets.map((row, i) => [row.id, projected[i]!])))
    }
    return rows.map((row) => {
      const pub = pubOf(row)
      const out: Record<string, unknown> = {}
      if (select.id === true) out.id = row.id
      if (select._type === true) out._type = row.type
      for (const [key, sel] of Object.entries(select)) {
        if (key === 'id' || key === '_type') continue
        const value = pub[key]
        if (sel === true) {
          out[key] = value ?? null
          continue
        }
        const map = nested.get(key)!
        if (isRef(value)) out[key] = map.get(value._ref) ?? null
        else if (Array.isArray(value))
          out[key] = value.flatMap((el) =>
            isRef(el) ? [map.get(el._ref) ?? null] : [],
          )
        else out[key] = null
      }
      return out
    })
  })

/** Полный опубликованный документ без select: id плюс поля published (ссылки остаются ReferenceValue). */
const toFull = (row: Loaded) => ({ id: row.id, ...pubOf(row) })

/** Аргументы запроса на проводе — нетипизированный JSON; статическая форма живёт в @jalyk/schema (FindManyArgs) на клиенте. */
export type PublishedQueryArgs = {
  where?: Record<string, unknown>
  select?: Record<string, unknown>
  orderBy?: Record<string, unknown>
  take?: number
  skip?: number
}

/** findMany по опубликованному контенту типа: SQL-отбор + проекция select с батч-джоинами. */
export const queryPublished = (
  projectId: string,
  type: string,
  args: PublishedQueryArgs,
) =>
  Effect.gen(function* () {
    const where = args.where ? buildWhere(args.where) : Prisma.sql`TRUE`
    const orderBy = args.orderBy ? buildOrderBy(args.orderBy) : Prisma.empty
    const limit =
      typeof args.take === 'number'
        ? Prisma.sql`LIMIT ${args.take}`
        : Prisma.empty
    const offset =
      typeof args.skip === 'number'
        ? Prisma.sql`OFFSET ${args.skip}`
        : Prisma.empty
    const rows = yield* query((db) =>
      db.$queryRaw<Loaded[]>(Prisma.sql`
        SELECT "id", "type", "published"
        FROM "document"
        WHERE "projectId" = ${projectId}
          AND "type" = ${type}
          AND "published" IS NOT NULL
          AND (${where})
        ${orderBy} ${limit} ${offset}`),
    )
    if (!args.select) return rows.map(toFull)
    return yield* projectRows(projectId, rows, args.select)
  })
