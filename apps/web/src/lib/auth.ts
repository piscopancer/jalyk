import { baseOptions } from '@jalyk/auth'
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins/bearer'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

// Платформенная авторизация сайта: базовый конфиг из @jalyk/auth (GitHub/Google,
// общая БД сессий) плюс куки TanStack Start — web работает через cookie-сессию.
// Плагин bearer добавлен, чтобы тот же обработчик выдавал токен сессии в заголовке
// set-auth-token: встроенная студия логинится через этот же /api/auth (проксируется
// под её origin) и забирает bearer-токен для кросс-доменных запросов в api.
export const auth = betterAuth({
  ...baseOptions,
  plugins: [tanstackStartCookies(), bearer()],
})
