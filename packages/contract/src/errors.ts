import { HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

// HTTP-обёртки доменных ошибок. Schema-варианты (а не Data-ошибки из @jalyk/core),
// потому что HttpApi сериализует ошибки на провод по их схеме и выставляет статус.
// Общие для сервера (apps/api мапит сюда доменные ошибки core) и клиента (студия
// получает их типизированными в канале ошибок HttpApiClient).

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

/** Файл превышает лимит размера на один ассет. limit и size — в байтах. */
export class FileTooLarge extends Schema.TaggedError<FileTooLarge>()(
  'FileTooLarge',
  { limit: Schema.Number, size: Schema.Number },
  HttpApiSchema.annotations({ status: 413 }),
) {}

/** Загрузка не влезает в квоту хранилища проекта. Все поля — в байтах:
 * quota — лимит проекта, used — уже занято, size — размер отклонённого файла. */
export class QuotaExceeded extends Schema.TaggedError<QuotaExceeded>()(
  'QuotaExceeded',
  { quota: Schema.Number, used: Schema.Number, size: Schema.Number },
  HttpApiSchema.annotations({ status: 409 }),
) {}
