import { Either, Schema } from 'effect'
import type { AnyField, Check } from './field.ts'

// Клиентская валидация значения поля. Её результат определяет, отправлять ли на
// сервер запрос на изменение: невалидное значение на сервер не уходит. Это
// единственная сторона проверки на данном этапе — серверную валидацию пока не
// делаем.

/** Проверяет одно значение против описания поля. Возвращает список ошибок. */
export function validateField(field: AnyField, value: unknown): string[] {
  const errors: string[] = []

  const empty = value === undefined || value === null || value === ''
  if (field.required && empty) {
    errors.push('Обязательное поле')
    // Дальше проверять пустое обязательное поле смысла нет.
    return errors
  }
  // Пустое необязательное поле валидно — границы и проверки не применяем.
  if (empty) return errors

  if (field.kind === 'number' && typeof value === 'number') {
    if (field.min !== undefined && value < field.min) errors.push(`Минимум ${field.min}`)
    if (field.max !== undefined && value > field.max) errors.push(`Максимум ${field.max}`)
  }

  const checks = field.check ? (Array.isArray(field.check) ? field.check : [field.check]) : []
  for (const check of checks) {
    const result = (check as Check<unknown>)(value)
    if (typeof result === 'string') errors.push(result)
  }

  return errors
}

/** Удобный предикат: валидно ли значение поля. */
export function isFieldValid(field: AnyField, value: unknown): boolean {
  return validateField(field, value).length === 0
}

/**
 * Превращает схему Effect в функцию-проверку. Позволяет переиспользовать всю
 * экосистему Effect Schema в декларации поля:
 * `defineString({ check: fromSchema(Schema.NonEmptyString, 'Не пусто') })`.
 */
export function fromSchema<A>(schema: Schema.Schema<A, any, never>, message?: string): Check<unknown> {
  const decode = Schema.decodeUnknownEither(schema)
  return (value) => {
    const result = decode(value)
    return Either.isLeft(result) ? (message ?? 'Неверное значение') : undefined
  }
}
