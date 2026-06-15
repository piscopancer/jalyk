import { prisma } from '@jalyk/db'
import type { BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

// Базовый конфиг авторизации, общий для всех приложений. Социальные провайдеры —
// только GitHub и Google (без пароля). Секрет (BETTER_AUTH_SECRET) better-auth
// читает из окружения сам, поэтому web и api используют один и тот же набор сессий.
// Каждое приложение поверх этой базы добавляет свои плагины: web — куки
// (tanstackStartCookies), api — bearer-токены.
export const baseOptions = {
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
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
