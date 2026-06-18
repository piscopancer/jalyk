// Система типов полей Jalyk. Поля описываются фабриками (defineString и т.д.) —
// это даёт максимально точный вывод типов значения документа, что и есть смысл
// проекта. Каждая фабрика возвращает свой объект-описание как есть (с сохранением
// литералов через `const`-дженерик) плюс служебные поля: `kind` для рантайма и
// фантомное `__value`, несущее тип значения поля для последующего вывода.

/** Утилита: «расплющивает» пересечения типов в один читаемый объект. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

/**
 * Клиентская функция-проверка значения. Возвращает строку с текстом ошибки,
 * если значение невалидно, либо ничего (undefined/null/false/void), если всё в
 * порядке. Внутрь можно положить что угодно, в том числе разбор схемой Effect:
 * `(v) => Either.isLeft(Schema.decodeUnknownEither(S)(v)) ? 'Неверно' : undefined`.
 */
export type Check<T> = (value: T) => string | undefined | null | false | void

/**
 * Иконка поля/документа. Схема не зависит от React, поэтому тип намеренно
 * широкий — студия принимает сюда компонент (например, иконку lucide) и рендерит
 * его, приведя к своему типу.
 */
export type FieldIcon = unknown

/** Общие свойства, которые есть у любого поля. */
export type FieldMeta = {
  title?: string
  description?: string
  icon?: FieldIcon
  /** Обязательность — клиентская проверка перед отправкой изменения на сервер. */
  required?: boolean
  /**
   * Имя члена разнотипного массива — пишется в служебное `_type` элемента, чтобы
   * студия знала, каким редактором его рисовать. Для однородных полей не нужно;
   * если не задано, в качестве `_type` берётся `kind` члена.
   */
  name?: string
}

export type FieldKind = 'string' | 'number' | 'boolean' | 'richText' | 'image' | 'reference' | 'object' | 'array'

// --- Значения сложных типов --------------------------------------------------

/** Значение rich-text — документ Tiptap в JSON. */
export type RichTextValue = { type?: string; content?: RichTextValue[]; [key: string]: unknown }

/** Значение поля-картинки — ссылка на загруженный ассет. */
export type ImageValue = { assetId: string }

/**
 * Значение поля-ссылки: id целевого документа и его тип (один из `to`). Тип лежит
 * в `_toType`, а не `_type`, чтобы `_type` остался свободен под дискриминатор члена
 * разнотипного массива — тогда ссылку можно класть и в такой массив.
 */
export type ReferenceValue<K extends string = string> = { _ref: string; _toType: K }

// --- Структурный супертип поля ----------------------------------------------
// Все фабрики возвращают объекты, присваиваемые AnyField. Используется как
// ограничение в дженериках (карты полей, элемент массива) и в рантайме.

export type AnyField = FieldMeta & {
  kind: FieldKind
  __value?: unknown
  /** Значение поля по умолчанию — то, к чему его сбрасывает студия. */
  default?: unknown
  // Возможные специфичные свойства разных видов полей — нужны для рантайм-обхода
  // (валидация, снапшот), при описании заполняются только релевантные.
  fields?: FieldMap
  // Тип элемента массива: одно описание (однородный массив) либо список описаний-
  // членов (разнотипный массив).
  of?: AnyField | readonly AnyField[]
  to?: readonly string[]
  min?: number
  max?: number
  input?: { type?: string; predefined?: readonly { value: string; title?: string; icon?: FieldIcon }[] }
  check?: Check<any> | Check<any>[]
}

export type FieldMap = Record<string, AnyField>

// --- Вывод типа значения поля -----------------------------------------------

/** Достаёт тип значения из фантомного `__value`. */
export type FieldValue<F> = F extends { __value?: infer V } ? V : never

/** Ключи обязательных полей карты. */
type RequiredFieldKeys<F extends FieldMap> = { [K in keyof F]: F[K] extends { required: true } ? K : never }[keyof F]
type OptionalFieldKeys<F extends FieldMap> = Exclude<keyof F, RequiredFieldKeys<F>>

/**
 * Тип значения по карте полей: обязательные поля присутствуют всегда,
 * необязательные становятся опциональными свойствами.
 */
export type InferFields<F extends FieldMap> = Prettify<
  { [K in RequiredFieldKeys<F>]: FieldValue<F[K]> } & { [K in OptionalFieldKeys<F>]?: FieldValue<F[K]> }
>

// --- Фабрики полей -----------------------------------------------------------

type Predefined = readonly { value: string; title?: string; icon?: FieldIcon }[]

type StringOptions = FieldMeta & {
  placeholder?: string
  default?: string
  input?:
    | { type?: 'normal' }
    | { type: 'multiline' }
    | { type: 'select'; predefined: Predefined }
  check?: Check<string> | Check<string>[]
}

/**
 * Строковое поле. Для `input: { type: 'select', predefined }` тип значения
 * сужается до объединения предопределённых значений, иначе это `string`.
 */
export function defineString<const O extends StringOptions>(options: O = {} as O) {
  return { kind: 'string', ...options } as { kind: 'string' } & O & {
    __value?: O extends { input: { type: 'select'; predefined: infer P } }
      ? P extends readonly { value: infer V }[]
        ? V & string
        : string
      : string
  }
}

type NumberOptions = FieldMeta & {
  min?: number
  max?: number
  default?: number
  check?: Check<number> | Check<number>[]
}

/** Числовое поле с границами `min`/`max` и пользовательскими проверками. */
export function defineNumber<const O extends NumberOptions>(options: O = {} as O) {
  return { kind: 'number', ...options } as { kind: 'number' } & O & { __value?: number }
}

/** Булево поле. */
export function defineBoolean<const O extends FieldMeta & { default?: boolean; check?: Check<boolean> | Check<boolean>[] }>(options: O = {} as O) {
  return { kind: 'boolean', ...options } as { kind: 'boolean' } & O & { __value?: boolean }
}

/** Rich-text поле (редактор Tiptap). */
export function defineRichText<const O extends FieldMeta & { default?: RichTextValue; check?: Check<RichTextValue> | Check<RichTextValue>[] }>(options: O = {} as O) {
  return { kind: 'richText', ...options } as { kind: 'richText' } & O & { __value?: RichTextValue }
}

/** Поле-картинка — выбор/загрузка ассета. */
export function defineImage<const O extends FieldMeta & { default?: ImageValue; check?: Check<ImageValue> | Check<ImageValue>[] }>(options: O = {} as O) {
  return { kind: 'image', ...options } as { kind: 'image' } & O & { __value?: ImageValue }
}

type ReferenceOptions = FieldMeta & {
  /** Ключи (типы) документов, на которые можно ссылаться. */
  to: readonly string[]
  size?: 'default' | 'compact'
  default?: ReferenceValue
}

/**
 * Поле-ссылка на другой документ. `to` — ключи документов из defineConfig;
 * проверка их существования и дереференс происходят на уровне конфигурации и
 * find-запроса, что и решает циклические зависимости между типами.
 */
export function defineReference<const O extends ReferenceOptions>(options: O) {
  return { kind: 'reference', ...options } as { kind: 'reference' } & O & { __value?: ReferenceValue<O['to'][number]> }
}

type ObjectOptions = FieldMeta & {
  fields: FieldMap
  default?: Record<string, unknown>
  check?: Check<any> | Check<any>[]
}

/** Вложенный объект со своей картой полей. */
export function defineObject<const O extends ObjectOptions>(options: O) {
  return { kind: 'object', ...options } as { kind: 'object' } & O & { __value?: InferFields<O['fields']> }
}

/**
 * Значение элемента разнотипного массива: значение члена плюс служебные `_key`
 * (стабильная идентичность элемента в массиве) и `_type` (имя члена — `name` или,
 * если не задано, его `kind`). По `_type` студия выбирает редактор элемента.
 */
export type ArrayItemValue<M extends AnyField> = Prettify<
  { _key: string; _type: M extends { name: infer N extends string } ? N : M['kind'] } & FieldValue<M>
>

type ArrayOptions = FieldMeta & {
  /**
   * Тип элемента: одно описание — однородный массив (элементы хранятся как есть),
   * либо список описаний-членов — разнотипный массив (элементы получают `_type` и
   * `_key`, см. ArrayItemValue).
   */
  of: AnyField | readonly AnyField[]
  default?: unknown[]
  check?: Check<any> | Check<any>[]
}

/** Массив элементов — однородный (of — одно поле) или разнотипный (of — список полей). */
export function defineArray<const O extends ArrayOptions>(options: O) {
  return { kind: 'array', ...options } as { kind: 'array' } & O & {
    __value?: O['of'] extends readonly AnyField[]
      ? ArrayItemValue<O['of'][number]>[]
      : O['of'] extends AnyField
        ? FieldValue<O['of']>[]
        : never
  }
}
