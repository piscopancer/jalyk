import { Data } from 'effect'

// Единый слой ошибок студии. Всё, что всплывает из клиента (через run) и из react-query, приводится к одному tagged-типу: доменные ошибки контракта (Unauthorized/NotFound/Forbidden), транспортные ошибки HttpApiClient (RequestError/ResponseError/ParseError) и обёртка QueryError для всего остального — чтобы любая ошибка имела _tag, описание и доп. данные.

/** Обёртка для не-Effect ошибок (обычный Error вне канала клиента, отказ react-query и т.п.). Делает ошибку студии единым tagged-типом Effect. */
export class QueryError extends Data.TaggedError('QueryError')<{
  message: string
  cause: unknown
}> {}

/** Нормализованное представление любой ошибки для тоста и диалога. */
export type StudioError = {
  /** Тег ошибки (_tag) — ключ описания и идентификатор типа. */
  tag: string
  /** Человеческое название типа ошибки. */
  title: string
  /** Объяснение, что произошло. */
  description: string
  /** Что с этим делать (необязательно). */
  hint?: string
  /** HTTP-статус ответа, если ошибка транспортная. */
  status?: number
  /** Метод запроса, если известен. */
  method?: string
  /** URL запроса, если известен. */
  url?: string
  /** Техническое сообщение. */
  message: string
  /** Исходный объект ошибки — для сырого JSON в диалоге. */
  raw: unknown
}

/** Описание по тегу: заголовок, объяснение и подсказка. Для нового типа ошибки достаточно добавить сюда строку — текст подхватится тостом и диалогом. */
const registry: Record<
  string,
  { title: string; description: string; hint?: string }
> = {
  Unauthorized: {
    title: 'Нет доступа',
    description:
      'Сессия или API-ключ недействительны — сервер отклонил запрос как неавторизованный.',
    hint: 'Проверьте API-ключ в настройках студии или создайте новый в личном кабинете.',
  },
  NotFound: {
    title: 'Не найдено',
    description:
      'Запрошенная сущность не существует или недоступна по текущему ключу (изоляция проекта).',
    hint: 'Убедитесь, что идентификатор верен, а ключ выдан для нужного проекта.',
  },
  Forbidden: {
    title: 'Недостаточно прав',
    description:
      'Ключ или сессия аутентифицированы, но не имеют прав на это действие.',
    hint: 'Нужен ключ со scope write. Проверьте права в личном кабинете.',
  },
  RequestError: {
    title: 'Запрос не отправлен',
    description:
      'Не удалось отправить запрос к API — обрыв сети, недоступный сервер или ошибка кодирования.',
    hint: 'Проверьте, что api-сервер запущен и адрес apiUrl указан верно.',
  },
  ResponseError: {
    title: 'Ошибка ответа сервера',
    description:
      'Сервер вернул ответ с ошибочным статусом или телом, которое не удалось обработать.',
  },
  ParseError: {
    title: 'Неверный формат ответа',
    description: 'Ответ сервера не соответствует ожидаемой схеме контракта.',
  },
  QueryError: {
    title: 'Непредвиденная ошибка',
    description: 'В студии возникла ошибка вне канала API-клиента.',
  },
}

const fallback = {
  title: 'Ошибка',
  description: 'Произошла неизвестная ошибка.',
}

/** Достаёт HTTP-контекст (статус/метод/url) из транспортных ошибок HttpApiClient, не падая, если полей нет. */
function httpContext(
  input: unknown,
): Pick<StudioError, 'status' | 'method' | 'url'> {
  const e = input as {
    request?: { method?: string; url?: string }
    response?: { status?: number }
  }
  return {
    status:
      typeof e?.response?.status === 'number' ? e.response.status : undefined,
    method: e?.request?.method,
    url: e?.request?.url,
  }
}

/** Техническое сообщение из ошибки: message у Error/Data-ошибок, иначе строка. */
function messageOf(input: unknown): string {
  if (input instanceof Error) return input.message
  const m = (input as { message?: unknown })?.message
  return typeof m === 'string' ? m : String(input)
}

/** Приводит произвольную пойманную ошибку к StudioError. Если у значения есть известный _tag — берём его описание; обычный Error без тега оборачиваем в QueryError, чтобы единообразно показать и сохранить причину. */
export function normalizeError(input: unknown): StudioError {
  const tag = (input as { _tag?: unknown })?._tag
  if (typeof tag === 'string' && tag in registry) {
    const info = registry[tag]!
    return {
      tag,
      ...info,
      ...httpContext(input),
      message: messageOf(input),
      raw: input,
    }
  }
  // Нет известного тега → оборачиваем в QueryError (сохраняя исходную причину).
  const wrapped = new QueryError({ message: messageOf(input), cause: input })
  const info = registry.QueryError ?? fallback
  return { tag: 'QueryError', ...info, message: wrapped.message, raw: wrapped }
}

/** Безопасная сериализация ошибки в JSON для диалога: режет циклы и функции, ограничивает глубину объектов запроса/ответа. */
export function errorToJson(value: unknown): string {
  const seen = new WeakSet<object>()
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === 'bigint') return val.toString()
      if (typeof val === 'function') return undefined
      if (val instanceof Error)
        return { name: val.name, message: val.message, stack: val.stack }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]'
        seen.add(val)
      }
      return val
    },
    2,
  )
}
