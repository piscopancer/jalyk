import { HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

// HTTP-обёртки доменных ошибок. Schema-варианты (а не Data-ошибки из @jalyk/core),
// потому что HttpApi сериализует ошибки на провод по их схеме и выставляет статус.
// Обработчики мапят доменные ошибки core в эти через Effect.catchTag.

/** Нет действительной сессии или api-ключа. */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  'Unauthorized',
  {},
  HttpApiSchema.annotations({ status: 401 }),
) {}

/** Сущность не найдена либо недоступна принципалу (не раскрываем какой случай). */
export class NotFound extends Schema.TaggedError<NotFound>()(
  'NotFound',
  {},
  HttpApiSchema.annotations({ status: 404 }),
) {}

/** Принципал аутентифицирован, но не имеет прав на действие. */
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  'Forbidden',
  {},
  HttpApiSchema.annotations({ status: 403 }),
) {}
