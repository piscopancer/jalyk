import type {
  AnyConfig,
  DocumentType,
  FindManyArgs,
  FindUniqueArgs,
  QueryResult,
} from '@jalyk/schema'

// Типизированный клиент чтения опубликованного контента для сайтов-потребителей.
// Тонкий: не фильтрует и не джоинит сам, а шлёт POST .../published/:type/query на
// /api и возвращает уже спроецированный результат. Тип-слой (where/select/result)
// целиком берётся из @jalyk/schema, поэтому форма вызова совпадает со студийным
// createStudio, а вся «мясная» логика живёт на сервере (queryPublished).

/** Параметры подключения: адрес /api, проект и api-ключ со scope read (или read+write). */
export type ClientOptions = {
  baseUrl: string
  projectId: string
  apiKey: string
}

/** Методы чтения одного типа документа: результат выводится из аргументов (select → проекция, иначе полный документ). */
type DocumentApi<C extends AnyConfig, T extends DocumentType<C>> = {
  findMany: <const A extends FindManyArgs<C, T>>(
    args?: A,
  ) => Promise<QueryResult<C, T, A>[]>
  findUnique: <const A extends FindUniqueArgs<C, T>>(
    args: A,
  ) => Promise<QueryResult<C, T, A> | null>
}

/** Клиент: по каждому типу документа конфига — объект с findMany/findUnique. */
export type ContentClient<C extends AnyConfig> = {
  [T in DocumentType<C>]: DocumentApi<C, T>
}

export const createClient = <const C extends AnyConfig>(
  config: C,
  options: ClientOptions,
): ContentClient<C> => {
  const post = async (type: string, body: unknown) => {
    const res = await fetch(
      `${options.baseUrl}/projects/${options.projectId}/published/${type}/query`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': options.apiKey },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok)
      throw new Error(
        `@jalyk/client: запрос ${type} вернул ${res.status} ${res.statusText}`,
      )
    return (await res.json()) as unknown[]
  }
  const entries = Object.keys(config.documents).map((type) => {
    const api = {
      findMany: (args: Record<string, unknown> = {}) => post(type, args),
      findUnique: async (args: { id: string; select?: unknown }) => {
        const rows = await post(type, {
          where: { id: args.id },
          select: args.select,
          take: 1,
        })
        return rows[0] ?? null
      },
    }
    return [type, api] as const
  })
  // Объект собран динамически по ключам config.documents — структурный тип фасада не выводится из Object.fromEntries, поэтому фиксируем контракт здесь.
  return Object.fromEntries(entries) as ContentClient<C>
}
