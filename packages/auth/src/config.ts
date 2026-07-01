import { prisma } from '@jalyk/db'
import type { BetterAuthOptions } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { Config, Effect } from 'effect'

// Окружение авторизации выбирается переменной AUTH_TARGET (по умолчанию `local`),
// по аналогии с DB_TARGET. От него зависит весь набор, завязанный на конкретный
// домен и OAuth-приложения:
//   - local — тестовая реализация на jalyk.local.dev:3000 (свои приложения GitHub/Google);
//   - prod  — боевой домен платформы (свои, отдельные приложения GitHub/Google).
// Это критично для OAuth: GitHub сверяет redirect_uri (= BETTER_AUTH_URL + путь
// callback) со списком callback'ов ИМЕННО того приложения, чей client_id пришёл в
// запросе. Поэтому client_id и BETTER_AUTH_URL всегда должны меняться вместе, иначе
// GitHub отвечает «redirect_uri is not associated with this application».
//
// Всё окружение читается через Effect Config и разрешается синхронно при загрузке
// модуля: если обязательная переменная не задана (или BETTER_AUTH_URL не является
// валидным URL), Config падает с ConfigError и процесс (pnpm dev / прод) не
// стартует — ошибка видна сразу, а не превращается в невнятный сбой OAuth в рантайме.
const authTarget = Effect.runSync(
  Config.literal('local', 'prod')('AUTH_TARGET').pipe(
    Config.withDefault('local' as const),
  ),
)

const suffix = authTarget === 'prod' ? '_PROD' : '_LOCAL'

// Переменная активного окружения: сначала суффиксный вариант (NAME_LOCAL/NAME_PROD),
// затем безсуффиксный (обратная совместимость и общие значения — например, когда на
// Railway креды заданы плоскими именами в дашборде).
const forTarget = <A>(make: (name: string) => Config.Config<A>, name: string) =>
  make(`${name}${suffix}`).pipe(Config.orElse(() => make(name)))

// Обязательная непустая строка. Пустое значение ("" в .env) считается незаданным и
// роняет загрузку — так пропущенный секрет OAuth-приложения виден сразу.
const requiredSecret = (name: string) =>
  forTarget(Config.string, name).pipe(
    Config.validate({
      message: `Переменная ${name}${suffix} (или ${name}) обязательна и не должна быть пустой`,
      validation: (value): value is string => value.trim().length > 0,
    }),
  )

// Разрешаем весь набор окружения одним проходом. runSync бросит ConfigError, если
// чего-то не хватает или BETTER_AUTH_URL невалиден как URL.
const env = Effect.runSync(
  Effect.gen(function* () {
    // Канонический адрес приложения. Валидируется как URL; baseURL задаём better-auth
    // явно (без хвостового слэша), чтобы redirect_uri всегда следовал за AUTH_TARGET.
    const baseURL = yield* forTarget(Config.url, 'BETTER_AUTH_URL').pipe(
      Config.map((url) => url.href.replace(/\/+$/, '')),
    )

    // Дополнительные доверенные origin'ы (адреса через запятую). Нужны лишь когда
    // вход инициируется с другого origin; сам baseURL better-auth доверяет всегда.
    const trustedOrigins = yield* Config.string(
      'BETTER_AUTH_TRUSTED_ORIGINS',
    ).pipe(
      Config.map((raw) =>
        raw
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
      Config.withDefault([] as string[]),
    )

    return {
      baseURL,
      trustedOrigins,
      githubClientId: yield* requiredSecret('GITHUB_CLIENT_ID'),
      githubClientSecret: yield* requiredSecret('GITHUB_CLIENT_SECRET'),
      googleClientId: yield* requiredSecret('GOOGLE_CLIENT_ID'),
      googleClientSecret: yield* requiredSecret('GOOGLE_CLIENT_SECRET'),
    }
  }),
)

// Базовый конфиг авторизации, общий для всех приложений. Социальные провайдеры —
// только GitHub и Google (без пароля). Секрет (BETTER_AUTH_SECRET) better-auth
// читает из окружения сам, поэтому web и api используют один и тот же набор сессий.
// Каждое приложение поверх этой базы добавляет свои плагины: web — куки
// (tanstackStartCookies) и bearer (выдача токена студии), api — bearer-валидацию.
//
// ВАЖНО про trustedOrigins: ключ добавляется только когда список непустой — пустой
// массив перезатирает дефолтное доверие к baseURL и ломает вход с INVALID_ORIGIN.
export const baseOptions = {
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: env.baseURL,
  ...(env.trustedOrigins.length > 0
    ? { trustedOrigins: env.trustedOrigins }
    : {}),
  socialProviders: {
    github: {
      clientId: env.githubClientId,
      clientSecret: env.githubClientSecret,
    },
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    },
  },
} satisfies BetterAuthOptions
