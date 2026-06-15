import { baseOptions } from '@jalyk/auth'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

// Платформенная авторизация сайта: базовый конфиг из @jalyk/auth (GitHub/Google,
// общая БД сессий) плюс куки TanStack Start — web работает через cookie-сессию.
export const auth = betterAuth({
  ...baseOptions,
  plugins: [tanstackStartCookies()],
})
