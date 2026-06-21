import { Data } from 'effect'

// Доменные ошибки Jalyk, общие для всех приложений (web и api). Тегированные —
// чтобы их можно было различать в Effect.catchTag и мапить в HTTP-ответы.

/** Сбой обращения к БД. */
export class DbError extends Data.TaggedError('DbError')<{ cause: unknown }> {}

/** Сбой хранилища ассетов (запись/чтение файла или объекта). */
export class StorageError extends Data.TaggedError('StorageError')<{
  cause: unknown
}> {}

/** Запрошенной сущности нет (или нет доступа — не раскрываем какой именно). */
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  what: string
}> {}

/** Нет прав на действие в проекте. */
export class ForbiddenError extends Data.TaggedError('ForbiddenError')<{
  reason?: string
}> {}

/** Пользователь не авторизован. */
export class UnauthorizedError extends Data.TaggedError(
  'UnauthorizedError',
)<{}> {}

/** Превышен лимит текущего плана. */
export class PlanLimitError extends Data.TaggedError('PlanLimitError')<{
  limit: 'projects' | 'documents'
  max: number
}> {}

/** Приглашение недействительно или просрочено. */
export class InvitationError extends Data.TaggedError('InvitationError')<{
  reason: 'not-found' | 'expired' | 'already-accepted' | 'already-member'
}> {}
