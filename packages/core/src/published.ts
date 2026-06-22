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

// Операторы скалярного фильтра — отличают фильтр-объект скаляра/ссылки от
// вложенного where по подполям объекта.
const SCALAR_OPS = new Set([
  'equals',
  'not',
  'in',
  'contains',
  'startsWith',
  'lt',
  'lte',
  'gt',
  'gte',
])

/** jsonb-значение подполя key относительно базового аксессора base. */
const jsonbAt = (base: Prisma.Sql, key: string) => Prisma.sql`${base} -> ${key}`

/** Текст для сравнения в where относительно base: для ссылки берём её id (_ref), для скаляра — само значение. Тип распознаём по jsonb_typeof, без знания схемы. */
const textAt = (base: Prisma.Sql, key: string) =>
  Prisma.sql`(CASE WHEN jsonb_typeof(${base} -> ${key}) = 'object' THEN (${base} -> ${key}) ->> '_ref' ELSE ${base} ->> ${key} END)`

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

/** Предикат массива объектов (some/every/none) поверх массива по ключу key относительно base; depth разводит алиасы вложенных массивов. */
const arrayClause = (
  base: Prisma.Sql,
  key: string,
  filter: Record<string, unknown>,
  depth: number,
): Prisma.Sql => {
  const arr = jsonbAt(base, key)
  // Защита от не-массива: jsonb_array_elements падает на не-array.
  const safeArr = Prisma.sql`(CASE WHEN jsonb_typeof(${arr}) = 'array' THEN ${arr} ELSE '[]'::jsonb END)`
  const elem = Prisma.raw(`el${depth}`)
  const elemBase = Prisma.sql`${elem}."value"`
  const from = Prisma.sql`jsonb_array_elements(${safeArr}) AS ${elem}("value")`
  const parts: Prisma.Sql[] = []
  if (isRecord(filter.some))
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM ${from} WHERE ${buildWhere(filter.some, elemBase, depth + 1)})`,
    )
  if (isRecord(filter.none))
    parts.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM ${from} WHERE ${buildWhere(filter.none, elemBase, depth + 1)})`,
    )
  if (isRecord(filter.every))
    parts.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM ${from} WHERE NOT (${buildWhere(filter.every, elemBase, depth + 1)}))`,
    )
  return parts.length ? Prisma.join(parts, ' AND ') : Prisma.sql`TRUE`
}

/** Где-древо → SQL-предикат относительно base (по умолчанию колонка published): скаляры/ссылки по значению, вложенные объекты рекурсивно, массивы объектов через some/every/none, id по колонке (только верхний уровень), узлы AND/OR/NOT рекурсивно. */
const buildWhere = (
  where: Record<string, unknown>,
  base: Prisma.Sql = Prisma.sql`"published"`,
  depth = 0,
): Prisma.Sql => {
  const clauses: Prisma.Sql[] = []
  for (const [key, filter] of Object.entries(where)) {
    if (filter === undefined) continue
    if (key === 'AND') {
      if (Array.isArray(filter) && filter.length)
        clauses.push(
          Prisma.sql`(${Prisma.join(
            filter.map((sub) =>
              buildWhere(sub as Record<string, unknown>, base, depth),
            ),
            ' AND ',
          )})`,
        )
      continue
    }
    if (key === 'OR') {
      if (Array.isArray(filter) && filter.length)
        clauses.push(
          Prisma.sql`(${Prisma.join(
            filter.map((sub) =>
              buildWhere(sub as Record<string, unknown>, base, depth),
            ),
            ' OR ',
          )})`,
        )
      continue
    }
    if (key === 'NOT') {
      if (isRecord(filter))
        clauses.push(Prisma.sql`NOT (${buildWhere(filter, base, depth)})`)
      continue
    }
    if (key === 'id' && depth === 0) {
      clauses.push(scalarClause(Prisma.sql`"id"`, filter))
      continue
    }
    if (isRecord(filter)) {
      const keys = Object.keys(filter)
      // Массив объектов: some/every/none.
      if (keys.some((k) => k === 'some' || k === 'every' || k === 'none')) {
        clauses.push(arrayClause(base, key, filter, depth))
        continue
      }
      // Вложенный объект: ни операторов скаляра, ни пустой — рекурсия по подполям.
      if (keys.length > 0 && !keys.some((k) => SCALAR_OPS.has(k))) {
        clauses.push(buildWhere(filter, jsonbAt(base, key), depth + 1))
        continue
      }
    }
    clauses.push(scalarClause(textAt(base, key), filter))
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

/**
 * Проецирует документы (строки) по дереву select: проекция полей плюс служебные
 * id/_type из самой строки (для дереференса ссылок, чья цель — документ).
 */
const projectDocs = (
  projectId: string,
  rows: readonly Loaded[],
  select: Record<string, unknown>,
): Effect.Effect<Record<string, unknown>[], DbError, Database> =>
  Effect.gen(function* () {
    const fields = yield* projectRecords(
      projectId,
      rows.map(pubOf),
      select,
    )
    return rows.map((row, i) => {
      const out = fields[i] ?? {}
      if (select.id === true) out.id = row.id
      if (select._type === true) out._type = row.type
      return out
    })
  })

/**
 * Проецирует массив JSONB-источников по дереву select, батча ссылки по каждому
 * ключу. Скаляр с `true` копируется как есть. Поле с вложенным select по форме
 * значения трактуется как ссылка (или массив ссылок) — дереференсится; вложенный
 * объект — рекурсивно; массив объектов — элементы рекурсивно. Все ссылки одного
 * ключа по всем источникам грузятся одним запросом — без N+1.
 */
const projectRecords = (
  projectId: string,
  sources: readonly (Record<string, unknown> | null | undefined)[],
  select: Record<string, unknown>,
): Effect.Effect<Record<string, unknown>[], DbError, Database> =>
  Effect.gen(function* () {
    const out: Record<string, unknown>[] = sources.map(() => ({}))
    for (const [key, sel] of Object.entries(select)) {
      if (key === 'id' || key === '_type') continue
      const values = sources.map((s) => (s ? s[key] : undefined))
      if (sel === true) {
        values.forEach((v, i) => {
          out[i]![key] = v ?? null
        })
        continue
      }
      const subSel = sel as Record<string, unknown>
      // Форму ключа определяем по всем значениям: ссылки/объекты, массив или нет.
      const flat = values.flatMap((v) => (Array.isArray(v) ? v : [v]))
      const hasRef = flat.some(isRef)
      const isArrayKey = values.some(Array.isArray)
      if (hasRef) {
        // Ссылка или массив ссылок: батч-загрузка целей и их проекция.
        const ids = new Set<string>()
        for (const v of flat) if (isRef(v)) ids.add(v._ref)
        const loaded = yield* loadByIds(projectId, [...ids])
        const projected = yield* projectDocs(projectId, loaded, subSel)
        const byId = new Map(loaded.map((row, i) => [row.id, projected[i]!]))
        values.forEach((v, i) => {
          if (Array.isArray(v))
            out[i]![key] = v.flatMap((el) =>
              isRef(el) ? [byId.get(el._ref) ?? null] : [],
            )
          else out[i]![key] = isRef(v) ? (byId.get(v._ref) ?? null) : null
        })
      } else if (isArrayKey) {
        // Массив объектов: разворачиваем в плоский список, проецируем, собираем назад.
        const spans: Record<string, unknown>[][] = []
        const items: Record<string, unknown>[] = []
        values.forEach((v) => {
          const span: Record<string, unknown>[] = []
          if (Array.isArray(v))
            for (const el of v)
              if (isRecord(el)) {
                items.push(el)
                span.push(el)
              }
          spans.push(span)
        })
        const projected = yield* projectRecords(projectId, items, subSel)
        const byEl = new Map(items.map((el, i) => [el, projected[i]!]))
        values.forEach((_v, i) => {
          out[i]![key] = spans[i]!.map((el) => byEl.get(el)!)
        })
      } else {
        // Вложенный объект: рекурсивная проекция его подполей.
        const objs = values.map((v) =>
          isRecord(v) && !isRef(v) ? v : null,
        )
        const projected = yield* projectRecords(projectId, objs, subSel)
        values.forEach((v, i) => {
          out[i]![key] = isRecord(v) && !isRef(v) ? projected[i]! : null
        })
      }
    }
    return out
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
    return yield* projectDocs(projectId, rows, args.select)
  })
