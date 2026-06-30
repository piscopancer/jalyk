import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { query } from '@/server/db'
import { runtime } from '@/server/runtime'

// Центральный вход встроенной студии (модель Sanity). Студия с любого домена
// клиента уводит редактора сюда, передавая projectId, провайдера и адрес возврата
// (return). Здесь идёт OAuth на домене Jalyk (его OAuth-приложения, его callback —
// домены клиентов нигде не регистрируются), а обратно на студию возвращается
// короткоживущий bearer-токен во фрагменте URL. Возврат разрешён только на
// origin'ы из списка доверенных у самого проекта — иначе чужой сайт мог бы увести
// сессию редактора. Вся логика серверная (handlers.GET): редиректами гоняем
// браузер провайдер → сюда же → студия.

const PROVIDERS = new Set(['github', 'google'])

/** Достаёт значение cookie по имени из заголовка Cookie запроса. */
function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim())
    }
  }
  return undefined
}

/** Простой текстовый ответ об ошибке входа (без утечки деталей наружу). */
function fail(message: string, status = 400) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')
  const ret = url.searchParams.get('return')
  const providerParam = url.searchParams.get('provider') ?? 'github'

  if (!projectId || !ret) return fail('Не заданы projectId или return')
  if (!PROVIDERS.has(providerParam)) return fail('Неизвестный провайдер')
  const provider = providerParam as 'github' | 'google'

  let returnUrl: URL
  try {
    returnUrl = new URL(ret)
  } catch {
    return fail('Некорректный return')
  }

  // Проверка доверенного origin проекта: вход возвращает токен только на сайты,
  // которые владелец проекта явно разрешил (project.allowedOrigins).
  const project = await runtime.runPromise(
    query((db) =>
      db.project.findUnique({
        where: { id: projectId },
        select: { allowedOrigins: true },
      }),
    ),
  )
  if (!project) return fail('Проект не найден', 404)
  if (!project.allowedOrigins.includes(returnUrl.origin)) {
    return fail(`Origin не разрешён для проекта: ${returnUrl.origin}`, 403)
  }

  const headers = new Headers(request.headers)
  const session = await auth.api.getSession({ headers })

  if (session) {
    // Сессия есть — отдаём студии bearer-токен. Плагин bearer принимает в роли
    // токена подписанное значение cookie сессии (token.signature) и выставляет его
    // в set-auth-token только когда ответ ставит cookie (логин/обновление), а не на
    // простом getSession. Поэтому берём это же значение напрямую из cookie запроса.
    // Имя cookie — из контекста better-auth (учитывает префикс __Secure- на https).
    const ctx = await auth.$context
    const cookieName = ctx.authCookies.sessionToken.name
    const token = parseCookie(request.headers.get('cookie'), cookieName)
    if (!token) return fail('Не удалось выпустить токен', 500)
    const target = `${returnUrl.href}#jalyk_token=${encodeURIComponent(token)}`
    return new Response(null, { status: 302, headers: { location: target } })
  }

  // Сессии нет — начинаем OAuth, возвращаясь после провайдера на этот же адрес
  // (callbackURL = текущий url): тогда уже с сессией сработает ветка выше.
  const result = await auth.api.signInSocial({
    body: { provider, callbackURL: url.href },
  })
  if (!result || !('url' in result) || !result.url) {
    return fail('Не удалось начать вход', 500)
  }
  return new Response(null, { status: 302, headers: { location: result.url } })
}

export const Route = createFileRoute('/studio-auth')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
    },
  },
})
