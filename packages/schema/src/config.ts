import type { DocumentOptions } from './document.ts'
import type { InferFields, Prettify } from './field.ts'

// Реестр документов проекта. Ключи объекта `documents` — это типы документов;
// из них выводятся все значения и по ним резолвятся ссылки.

export type AnyConfig = { documents: Record<string, DocumentOptions> }

/**
 * Собирает конфигурацию проекта. Возвращает объект как есть с сохранением
 * литеральных типов — на нём строятся вывод значений (InferDocument) и снапшот.
 */
export function defineConfig<const D extends Record<string, DocumentOptions>>(config: { documents: D }): { documents: D } {
  return config
}

/** Объединение типов документов конфигурации. */
export type DocumentType<C extends AnyConfig> = keyof C['documents'] & string

/**
 * Тип значения документа: служебные поля (`_id`, `_type`) плюс значения полей,
 * выведенные из его карты.
 */
export type InferDocument<C extends AnyConfig, T extends DocumentType<C>> = Prettify<
  { _id: string; _type: T } & InferFields<C['documents'][T]['fields']>
>
