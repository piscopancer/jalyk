import { baseOptions } from '@jalyk/auth'
import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins/bearer'

// Авторизация API: базовый конфиг из @jalyk/auth плюс плагин bearer — студия
// встроена в чужое приложение на другом домене, cookie ей недоступны, поэтому
// редактор шлёт токен сессии в заголовке `Authorization: Bearer <token>`.
// Сессии лежат в той же БД, что у web, и валидируются через auth.api.getSession.
export const auth = betterAuth({
  ...baseOptions,
  plugins: [bearer()],
})
