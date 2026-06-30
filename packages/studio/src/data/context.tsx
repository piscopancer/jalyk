import type { ProjectEvent } from '@jalyk/contract'
import type { AnyConfig } from '@jalyk/schema'
import { Cause, Effect, Either, Exit } from 'effect'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import {
  makeClient,
  makeRuntime,
  type StudioApiClient,
  type StudioRuntime,
} from './runtime.ts'

/** Слушатель событий проекта (см. SSE-поток ниже). Возвращаемая subscribe функция снимает подписку. */
export type EventListener = (event: ProjectEvent) => void

/** Размер в байтах → человекочитаемое «N МБ» (для сообщений о лимитах). */
const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} МБ`

/** Сообщение об ошибке загрузки ассета. Тело ответа HttpApi — tagged-ошибка
 * (_tag + поля); для лимитов (FileTooLarge / QuotaExceeded) собираем понятный
 * текст с мегабайтами, иначе — общий текст со статусом. */
const uploadErrorMessage = async (res: Response): Promise<string> => {
  const body = (await res.json().catch(() => null)) as
    | { _tag?: string; limit?: number; quota?: number; used?: number; size?: number }
    | null
  switch (body?._tag) {
    case 'FileTooLarge':
      return `Файл слишком большой: ${formatMb(body.size ?? 0)}, лимит — ${formatMb(body.limit ?? 0)}.`
    case 'QuotaExceeded':
      return `Не хватает места в проекте: занято ${formatMb(body.used ?? 0)} из ${formatMb(body.quota ?? 0)}, файл — ${formatMb(body.size ?? 0)}.`
    default:
      return `Загрузка ассета не удалась: ${res.status}`
  }
}

/** Метаданные загруженного ассета (ответ POST /projects/:id/assets). */
export type UploadedAsset = {
  id: string
  projectId: string
  filename: string
  contentType: string
  size: number
  createdAt: string
}

/** Контекст студии: построенный клиент, рантайм и projectId, два моста к react-query (run — с throw'ом ошибки, runEither — с явным Either) и подписка на SSE-поток событий проекта. */
export type StudioContextValue = {
  projectId: string
  apiUrl: string
  apiKey: string
  /** Bearer-токен сессии Jalyk-редактора (если хост его передал). Нужен для
   * персональной идентичности: presence и редактирование своего профиля. */
  token?: string
  /** Конфигурация схемы проекта (defineConfig) — реестр типов и полей. */
  config: AnyConfig
  client: StudioApiClient
  runtime: StudioRuntime
  run: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>
  runEither: <A, E>(effect: Effect.Effect<A, E>) => Promise<Either.Either<A, E>>
  /** Подписаться на события проекта. Возвращает функцию отписки. */
  subscribeEvents: (listener: EventListener) => () => void
  /** Загрузить файл-ассет (картинку) и получить его метаданные. */
  uploadAsset: (file: File) => Promise<UploadedAsset>
  /** Публичный URL байтов ассета по его id (для <img src>). */
  assetUrl: (assetId: string) => string
  /** Загрузить новую аватарку текущего пользователя (требует token). Возвращает
   * обновлённый профиль (с новым image). */
  uploadAvatar: (file: File) => Promise<CurrentUserProfile>
}

/** Профиль текущего пользователя (ответ /me и /me-апдейтов). */
export type CurrentUserProfile = {
  id: string
  email: string
  name: string
  image: string | null
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext)
  if (!ctx) {
    throw new Error(
      'useStudio должен вызываться внутри <StudioProvider> (или <Studio>)',
    )
  }
  return ctx
}

export type StudioProviderProps = {
  projectId: string
  apiKey: string
  /** Адрес apps/api, например http://localhost:3001. */
  apiUrl: string
  /** Bearer-токен сессии Jalyk-редактора. Когда передан — студия ходит ещё и от
   * имени пользователя (presence, профиль). Без него presence не показывает «меня». */
  token?: string
  /** Конфигурация схемы проекта (defineConfig). */
  config: AnyConfig
  children: ReactNode
}

/** Разбирает один SSE-кадр: строки data: склеиваются, остальное (event:, комментарии `:` — open/keepalive) игнорируется, т.к. вид события дублируется в JSON (kind). */
function parseFrame(frame: string): ProjectEvent | null {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
  if (!data) return null
  try {
    return JSON.parse(data) as ProjectEvent
  } catch {
    return null
  }
}

/** Поднимает рантайм, клиент, собственный QueryClient студии (не делим с хостом) и единственное SSE-соединение на проект. Клиент строится синхронно: его сборка не делает запросов, нужен лишь готовый слой HttpClient. */
export function StudioProvider({
  projectId,
  apiKey,
  apiUrl,
  token,
  config,
  children,
}: StudioProviderProps) {
  const runtime = useMemo(() => makeRuntime(), [])
  const client = useMemo(
    () => runtime.runSync(makeClient({ apiUrl, apiKey, token })),
    [runtime, apiUrl, apiKey, token],
  )

  // Реестр слушателей. Одно соединение раздаёт события всем подписчикам (field- редакторам, спискам) — фильтрацию по docId/type/path делает каждый сам.
  const listeners = useRef(new Set<EventListener>())

  // SSE через fetch, а не EventSource: EventSource не умеет слать заголовки, а авторизация идёт через X-Api-Key. Читаем тело потока ридером, режем на кадры по пустой строке, при обрыве переподключаемся с паузой.
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false

    async function connect() {
      while (!stopped) {
        try {
          const res = await fetch(`${apiUrl}/projects/${projectId}/events`, {
            headers: {
              'x-api-key': apiKey,
              accept: 'text/event-stream',
              ...(token ? { authorization: `Bearer ${token}` } : null),
            },
            signal: controller.signal,
          })
          if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`)
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          while (!stopped) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let idx: number
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const frame = buffer.slice(0, idx)
              buffer = buffer.slice(idx + 2)
              const event = parseFrame(frame)
              if (event) {
                for (const listener of listeners.current) listener(event)
              }
            }
          }
        } catch {
          if (stopped || controller.signal.aborted) return
        }
        // Пауза перед переподключением, если соединение оборвалось не по отписке.
        if (!stopped) await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    void connect()
    return () => {
      stopped = true
      controller.abort()
    }
  }, [apiUrl, apiKey, token, projectId])

  const value = useMemo<StudioContextValue>(
    () => ({
      projectId,
      apiUrl,
      apiKey,
      token,
      config,
      client,
      runtime,
      // Бросаем не FiberFailure, а исходное значение ошибки (squash причины) — чтобы react-query и слой ошибок студии получали чистую tagged-ошибку.
      run: async (effect) => {
        const exit = await runtime.runPromiseExit(effect)
        if (Exit.isSuccess(exit)) return exit.value
        throw Cause.squash(exit.cause)
      },
      runEither: (effect) => runtime.runPromise(Effect.either(effect)),
      subscribeEvents: (listener) => {
        listeners.current.add(listener)
        return () => listeners.current.delete(listener)
      },
      // Загрузка через fetch (а не типизированный клиент): тело — сырые байты файла, авторизация через X-Api-Key, имя и тип в query.
      uploadAsset: async (file) => {
        const params = new URLSearchParams({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        })
        const res = await fetch(
          `${apiUrl}/projects/${projectId}/assets?${params}`,
          {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'content-type': file.type || 'application/octet-stream',
              ...(token ? { authorization: `Bearer ${token}` } : null),
            },
            body: file,
          },
        )
        if (!res.ok) throw new Error(await uploadErrorMessage(res))
        return (await res.json()) as UploadedAsset
      },
      assetUrl: (assetId) => `${apiUrl}/assets/${assetId}`,
      // Загрузка аватарки: сырые байты, тип в query, авторизация bearer-токеном
      // (эндпоинт /me/avatar требует принципала-пользователя). Ответ — профиль.
      uploadAvatar: async (file) => {
        const params = new URLSearchParams({
          contentType: file.type || 'application/octet-stream',
        })
        const res = await fetch(`${apiUrl}/me/avatar?${params}`, {
          method: 'POST',
          headers: {
            'content-type': file.type || 'application/octet-stream',
            ...(token ? { authorization: `Bearer ${token}` } : null),
          },
          body: file,
        })
        if (!res.ok) throw new Error(await uploadErrorMessage(res))
        return (await res.json()) as CurrentUserProfile
      },
    }),
    [projectId, apiUrl, apiKey, token, config, client, runtime],
  )

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  )
}
