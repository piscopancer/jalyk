import { prisma } from '@jalyk/db'
import type { BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

// Дополнительные доверенные origin'ы (через BETTER_AUTH_TRUSTED_ORIGINS, адреса
// через запятую). Сам BETTER_AUTH_URL better-auth доверяет всегда; этот список
// нужен лишь когда вход инициируется с другого origin. ВАЖНО: ключ trustedOrigins
// добавляется в конфиг только когда список непустой — пустой массив перезатирает
// дефолтное доверие к baseURL и ломает вход с ошибкой INVALID_ORIGIN.
const extraTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Базовый конфиг авторизации, общий для всех приложений. Социальные провайдеры —
// только GitHub и Google (без пароля). Секрет (BETTER_AUTH_SECRET) better-auth
// читает из окружения сам, поэтому web и api используют один и тот же набор сессий.
// Каждое приложение поверх этой базы добавляет свои плагины: web — куки
// (tanstackStartCookies) и bearer (выдача токена студии), api — bearer-валидацию.
export const baseOptions = {
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  ...(extraTrustedOrigins.length > 0
    ? { trustedOrigins: extraTrustedOrigins }
    : {}),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
} satisfies BetterAuthOptions
