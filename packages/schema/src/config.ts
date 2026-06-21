import type { DocumentOptions } from './document.ts'
import type { DocumentRegistry, InferFields, Prettify } from './field.ts'
import type { ProjectConfig, ToolbarItems } from './project.ts'

export type AnyConfig = {
  documents: Record<string, DocumentOptions>
  /** Мета проекта для бейджа тулбара (имя, иконка, переопределение рендера). */
  project?: ProjectConfig
  /** Кастомные элементы слота тулбара. */
  toolbar?: ToolbarItems
}

type RegisteredType = keyof DocumentRegistry & string

/** Типы, по которым реестр DocumentRegistry разошёлся с documents; пусто = синхронны. */
type RegistryDrift<D> = [RegisteredType] extends [never]
  ? never
  :
      | Exclude<RegisteredType, keyof D & string>
      | Exclude<keyof D & string, RegisteredType>

/** Собирает конфиг, сохраняя литералы; второй параметр требуется лишь при рассинхроне DocumentRegistry с documents. */
export function defineConfig<const D extends Record<string, DocumentOptions>>(
  config: { documents: D; project?: ProjectConfig; toolbar?: ToolbarItems },
  ..._drift: [RegistryDrift<D>] extends [never]
    ? []
    : [
        error: `DocumentRegistry рассинхронизирован с documents: ${RegistryDrift<D>}`,
      ]
): { documents: D; project?: ProjectConfig; toolbar?: ToolbarItems } {
  return config
}

/** Объединение типов документов конфигурации. */
export type DocumentType<C extends AnyConfig> = keyof C['documents'] & string

/**
 * Тип значения документа: служебные поля (`_id`, `_type`) плюс значения полей,
 * выведенные из его карты.
 */
export type InferDocument<
  C extends AnyConfig,
  T extends DocumentType<C>,
> = Prettify<
  { _id: string; _type: T } & InferFields<C['documents'][T]['fields']>
>
