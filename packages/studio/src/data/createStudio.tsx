import type {
  AnyConfig,
  AnyField,
  DocumentType,
  FieldMap,
  FieldsOf,
  FindManyArgs,
  FindUniqueArgs,
  InferFields,
  QueryResult,
  Where,
} from '@jalyk/schema'
import { matchesWhere } from '@jalyk/schema'
import { DocumentInfo } from '@jalyk/contract'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { Schema } from 'effect'
import { useStudio } from './context.tsx'
import { studioKeys } from './keys.ts'

// Типизированный клиент запросов в духе Prisma: createStudio(config) собирает по конфигу объект studio.<type>.{findMany,findUnique,count,create,update,delete, publish}. Методы — хуки (внутри useQuery/useMutation), их зовут на верхнем уровне компонента. Сейчас where/select/join исполняются на клиенте поверх загруженных по type документов; типы и сигнатуры от этого не зависят, поэтому переезд на серверный SQL потом не затронет места вызова.

/** Документ на проводе — выводим из схемы контракта (не дублируем форму). */
type DocItem = Schema.Schema.Type<typeof DocumentInfo>

/** Зависимости запроса из контекста студии. */
type Deps = Pick<ReturnType<typeof useStudio>, 'projectId' | 'client' | 'run'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

/** Загружает список документов типа один раз за исполнение запроса (кэш джоинов). */
async function loadType(
  deps: Deps,
  cache: Map<string, readonly DocItem[]>,
  type: string,
) {
  const hit = cache.get(type)
  if (hit) return hit
  const list = await deps.run(
    deps.client.documents.list({
      path: { projectId: deps.projectId },
      urlParams: { type },
    }),
  )
  cache.set(type, list)
  return list
}

/** Дереференсит одну ссылку { _ref, _toType } и проецирует целевой документ по sel. */
async function resolveRef(
  deps: Deps,
  cache: Map<string, readonly DocItem[]>,
  config: AnyConfig,
  ref: unknown,
  sel: unknown,
) {
  if (
    !isRecord(ref) ||
    typeof ref._ref !== 'string' ||
    typeof ref._toType !== 'string'
  )
    return null
  const list = await loadType(deps, cache, ref._toType)
  const target = list.find((d) => d.id === ref._ref)
  return target ? project(deps, cache, config, ref._toType, target, sel) : null
}

/** Проецирует карту полей fields по select поверх источника source (черновик документа или вложенный объект). Скаляр с true — копируется; ссылка — джоин; объект/массив объектов — рекурсивно. */
async function projectFields(
  deps: Deps,
  cache: Map<string, readonly DocItem[]>,
  config: AnyConfig,
  fields: FieldMap,
  source: unknown,
  select: unknown,
) {
  const src = isRecord(source) ? source : {}
  const out: Record<string, unknown> = {}
  if (!isRecord(select)) return out
  for (const [key, sel] of Object.entries(select)) {
    if (!sel || key === 'id' || key === '_type') continue
    const value = src[key]
    if (sel === true) {
      out[key] = value
      continue
    }
    const field = fields[key]
    if (field?.kind === 'object') {
      out[key] = isRecord(value)
        ? await projectFields(
            deps,
            cache,
            config,
            field.fields ?? {},
            value,
            sel,
          )
        : null
    } else if (field?.kind === 'array') {
      const of = field.of
      // Однородный массив: of — одно описание поля (не список членов).
      const single = of && !Array.isArray(of) ? (of as AnyField) : undefined
      const items = Array.isArray(value) ? value : []
      if (single?.kind === 'object') {
        // Массив объектов: проецируем подполя каждого элемента.
        out[key] = await Promise.all(
          items.map((el) =>
            projectFields(deps, cache, config, single.fields ?? {}, el, sel),
          ),
        )
      } else {
        // Массив ссылок: дереференс поэлементно.
        out[key] = (
          await Promise.all(
            items.map((item) => resolveRef(deps, cache, config, item, sel)),
          )
        ).filter((x) => x !== null)
      }
    } else {
      // Одиночная ссылка.
      out[key] = await resolveRef(deps, cache, config, value, sel)
    }
  }
  return out
}

/** Строит проекцию документа по select: поля через projectFields плюс служебные id/_type. */
async function project(
  deps: Deps,
  cache: Map<string, readonly DocItem[]>,
  config: AnyConfig,
  type: string,
  record: DocItem,
  select: unknown,
) {
  const fields = config.documents[type]?.fields ?? {}
  const out = await projectFields(
    deps,
    cache,
    config,
    fields,
    record.draft,
    select,
  )
  if (isRecord(select)) {
    if (select.id) out.id = record.id
    if (select._type) out._type = record.type
  }
  return out
}

/** Полный документ без select: id плюс поля черновика. */
function fullRecord(record: DocItem) {
  const draft = isRecord(record.draft) ? record.draft : {}
  return { id: record.id, ...draft }
}

function sortRecords(records: DocItem[], orderBy: unknown) {
  if (!isRecord(orderBy)) return records
  const entries = Object.entries(orderBy)
  if (entries.length === 0) return records
  return [...records].sort((a, b) => {
    const draftA = isRecord(a.draft) ? a.draft : {}
    const draftB = isRecord(b.draft) ? b.draft : {}
    for (const [key, dir] of entries) {
      const av = draftA[key]
      const bv = draftB[key]
      if (av === bv) continue
      const less = (av ?? '') < (bv ?? '')
      return (less ? -1 : 1) * (dir === 'desc' ? -1 : 1)
    }
    return 0
  })
}

/** Движок findMany: грузит документы типа, фильтрует where, сортирует, режет skip/take и проецирует select (или отдаёт полный документ). */
async function runFindMany(
  deps: Deps,
  config: AnyConfig,
  type: string,
  args: FindManyArgs<AnyConfig, never>,
) {
  const cache = new Map<string, readonly DocItem[]>()
  const all = await loadType(deps, cache, type)
  const where = args.where
  let filtered = where
    ? all.filter((d) => matchesWhere({ id: d.id, draft: d.draft }, where))
    : [...all]
  filtered = sortRecords(filtered, args.orderBy)
  if (typeof args.skip === 'number') filtered = filtered.slice(args.skip)
  if (typeof args.take === 'number') filtered = filtered.slice(0, args.take)
  if (args.select)
    return Promise.all(
      filtered.map((d) => project(deps, cache, config, type, d, args.select)),
    )
  return filtered.map(fullRecord)
}

/** Контракт одного типа документа. Сигнатуры выводят результат из аргументов (select → проекция, иначе полный документ); данные create/update типизированы значениями полей этого типа. */
type CreateData<C extends AnyConfig, T extends DocumentType<C>> = InferFields<
  FieldsOf<C, T>
>
type UpdateData<C extends AnyConfig, T extends DocumentType<C>> = Partial<
  InferFields<FieldsOf<C, T>>
>

type DocumentApi<C extends AnyConfig, T extends DocumentType<C>> = {
  findMany: <const A extends FindManyArgs<C, T>>(
    args?: A,
  ) => UseQueryResult<QueryResult<C, T, A>[]>
  findUnique: <const A extends FindUniqueArgs<C, T>>(
    args: A,
  ) => UseQueryResult<QueryResult<C, T, A> | null>
  count: (args?: { where?: Where<C, T> }) => UseQueryResult<number>
  create: () => UseMutationResult<
    { id: string },
    unknown,
    { data: CreateData<C, T> }
  >
  update: () => UseMutationResult<
    void,
    unknown,
    { id: string; data: UpdateData<C, T> }
  >
  delete: () => UseMutationResult<void, unknown, { id: string }>
  publish: () => UseMutationResult<{ id: string }, unknown, { id: string }>
}

export type StudioClient<C extends AnyConfig> = {
  [T in DocumentType<C>]: DocumentApi<C, T>
}

/** Хуки одного типа. Замыкаются на type (строка) и config; типы наводятся при финальном приведении объекта к Studio<C>. */
function makeApi(config: AnyConfig, type: string) {
  return {
    findMany: (args: FindManyArgs<AnyConfig, never> = {}) => {
      const { projectId, client, run } = useStudio()
      return useQuery({
        queryKey: studioKeys.query(projectId, type, args),
        queryFn: () =>
          runFindMany({ projectId, client, run }, config, type, args),
      })
    },
    findUnique: (args: { id: string; select?: unknown }) => {
      const { projectId, client, run } = useStudio()
      return useQuery({
        queryKey: studioKeys.query(projectId, type, args),
        queryFn: async () => {
          const deps = { projectId, client, run }
          const record = await run(
            client.documents.get({ path: { projectId, id: args.id } }),
          )
          if (args.select)
            return project(deps, new Map(), config, type, record, args.select)
          return fullRecord(record)
        },
      })
    },
    count: (args: { where?: Record<string, unknown> } = {}) => {
      const { projectId, client, run } = useStudio()
      return useQuery({
        queryKey: [...studioKeys.query(projectId, type, args), 'count'],
        queryFn: async () => {
          const all = await loadType(
            { projectId, client, run },
            new Map(),
            type,
          )
          return args.where
            ? all.filter((d) =>
                matchesWhere({ id: d.id, draft: d.draft }, args.where ?? {}),
              ).length
            : all.length
        },
      })
    },
    create: () => {
      const { projectId, client, run } = useStudio()
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (input: { data: Record<string, unknown> }) =>
          run(
            client.documents.create({
              path: { projectId },
              payload: { type, draft: input.data },
            }),
          ),
        onSuccess: () => {
          qc.invalidateQueries({
            queryKey: studioKeys.documents(projectId, type),
          })
          qc.invalidateQueries({ queryKey: studioKeys.counts(projectId) })
        },
      })
    },
    update: () => {
      const { projectId, client, run } = useStudio()
      const qc = useQueryClient()
      return useMutation({
        // Обновление пишет каждое заданное поле точечно (setField), как редакторы.
        mutationFn: async (input: {
          id: string
          data: Record<string, unknown>
        }) => {
          for (const [key, value] of Object.entries(input.data)) {
            await run(
              client.documents.setField({
                path: { projectId, id: input.id },
                payload: { path: [key], value },
              }),
            )
          }
        },
        onSuccess: (_data, input) => {
          qc.invalidateQueries({
            queryKey: studioKeys.document(projectId, input.id),
          })
          qc.invalidateQueries({
            queryKey: studioKeys.documents(projectId, type),
          })
        },
      })
    },
    delete: () => {
      const { projectId, client, run } = useStudio()
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (input: { id: string }) =>
          run(client.documents.delete({ path: { projectId, id: input.id } })),
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: studioKeys.all(projectId) }),
      })
    },
    publish: () => {
      const { projectId, client, run } = useStudio()
      const qc = useQueryClient()
      return useMutation({
        mutationFn: (input: { id: string }) =>
          run(client.documents.publish({ path: { projectId, id: input.id } })),
        onSuccess: (_data, input) => {
          qc.invalidateQueries({
            queryKey: studioKeys.document(projectId, input.id),
          })
          qc.invalidateQueries({
            queryKey: studioKeys.documents(projectId, type),
          })
        },
      })
    },
  }
}

/** Собирает типизированный клиент запросов по конфигу. Ключи — типы документов из defineConfig; у каждого набор хуков чтения и записи (см. DocumentApi). Объект строится динамически по ключам конфига, поэтому финально приводится к Studio<C>: это граница (динамическая сборка типизированного клиента), сами хуки внутри уже считаются с реальной формой данных. */
export function createStudio<const C extends AnyConfig>(config: C) {
  const studio = Object.fromEntries(
    Object.keys(config.documents).map((type) => [type, makeApi(config, type)]),
  )
  return studio as unknown as StudioClient<C>
}
