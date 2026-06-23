// Система типов полей Jalyk. Поля описываются фабриками (defineString и т.д.) —
// это даёт максимально точный вывод типов значения документа, что и есть смысл
// проекта. Каждая фабрика возвращает свой объект-описание как есть (с сохранением
// литералов через `const`-дженерик) плюс служебные поля: `kind` для рантайма и
// фантомное `__value`, несущее тип значения поля для последующего вывода.

import type { Brand } from 'effect'
import type { DefaultPreviewData } from './document.ts'
// Тип шаблона живёт в query.ts (рядом с async-клиентом, который типизирует ctx);
// импорт только типовой, поэтому встречный цикл query.ts → field.ts безопасен.
import type { FieldTemplate } from './query.ts'

/** Утилита: «расплющивает» пересечения типов в один читаемый объект. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {}

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
  /**
   * Имя члена разнотипного массива — пишется в служебное `_type` элемента, чтобы
   * студия знала, каким редактором его рисовать. Для однородных полей не нужно;
   * если не задано, в качестве `_type` берётся `kind` члена.
   */
  name?: string
}

export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'richText'
  | 'image'
  | 'asset'
  | 'reference'
  | 'object'
  | 'array'

// --- Заголовок поля ----------------------------------------------------------
// Заголовок поля (подпись с иконкой и меню-троеточием) разведён на данные и
// компонент. Данные (`header`) — декларативны и сериализуемы, их описывают
// фабрики defaultHeader/defineHeader. Компонент (`headerComponent`) живёт в
// студии и принимает эти данные; если он не задан, студия рисует DefaultHeader,
// которому нужны предопределённые поля (DefaultHeaderData).

/** Предопределённые данные заголовка — то, что умеет рисовать DefaultHeader. */
export type DefaultHeaderData = {
  title: string
  description?: string
  icon?: FieldIcon
}

/** Данные заголовка по умолчанию: title обязателен, как требует DefaultHeader. */
export function defaultHeader<const D extends DefaultHeaderData>(data: D): D {
  return data
}

/** Произвольные данные заголовка под свой headerComponent. Сохраняет литералы. */
export function defineHeader<const D>(data: D): D {
  return data
}

/** Пропсы компонента заголовка: путь и описание поля плюс данные заголовка. */
export type HeaderComponentProps<D = unknown> = {
  path: readonly string[]
  field: AnyField
  header: D
}

/** Компонент заголовка поля. Схема не зависит от React — возврат намеренно широкий. */
export type HeaderComponent<D = unknown> = (
  props: HeaderComponentProps<D>,
) => unknown

/**
 * Рантайм-тип компонента, дорисовываемого студией (заголовок поля, превью
 * документа). `never` в контравариантной позиции пропсов делает подтипом любой
 * компонент с любыми пропсами, поэтому сюда присваивается React-компонент студии
 * без приведения; точные пропсы при описании задают HeaderOptions/PreviewOptions.
 */
export type ErasedComponent = (props: never) => unknown

/**
 * Опции заголовка, подмешиваемые в каждую фабрику поля. `headerComponent`
 * определяет форму `header`: со своим компонентом `header` обязан подойти его
 * пропсам, без компонента форма падает на DefaultHeaderData (нужен title).
 * `NoInfer` запрещает выводить H из самого `header`, иначе при отсутствии
 * компонента он подстроился бы под переданные данные и проверка title пропала.
 */
export type HeaderOptions<H> = {
  header?: NoInfer<H>
  headerComponent?: HeaderComponent<H>
}

// --- Значения сложных типов --------------------------------------------------

/** Значение rich-text — документ Tiptap в JSON. */
export type RichTextValue = {
  type?: string
  content?: RichTextValue[]
  [key: string]: unknown
}

/** Значение поля-картинки — ссылка на загруженный ассет. */
export type ImageValue = { assetId: string }

/** Значение поля-ассета — ссылка на загруженный ассет любого типа. Форма та же, что у картинки; различается только редактор и набор допустимых типов. */
export type AssetValue = { assetId: string }

/**
 * Фильтр допустимых типов ассета — массив глобов MIME-типа. Глоб либо ровно тип
 * (`video/mp4`), либо категория с подстановкой (`video/*`). Единственная ось
 * ограничения: студия и прячет по нему неподходящие ассеты, и выводит из него
 * колонку категорий. Готовые пресеты — `anyImage`/`anyVideo`/`anyAudio`/`anyText`.
 */
export type AssetFilter = readonly string[]

export const anyImage = ['image/*'] as const satisfies AssetFilter
export const anyVideo = ['video/*'] as const satisfies AssetFilter
export const anyAudio = ['audio/*'] as const satisfies AssetFilter
export const anyText = ['text/*'] as const satisfies AssetFilter

/**
 * Значение поля-ссылки: id целевого документа и его тип (один из `to`). Тип лежит
 * в `_toType`, а не `_type`, чтобы `_type` остался свободен под дискриминатор члена
 * разнотипного массива — тогда ссылку можно класть и в такой массив.
 */
export type ReferenceValue<K extends string = string> = {
  _ref: string
  _toType: K
}

// --- Структурный супертип поля ----------------------------------------------
// Все фабрики возвращают объекты, присваиваемые AnyField. Используется как
// ограничение в дженериках (карты полей, элемент массива) и в рантайме.

export type AnyField = FieldMeta & {
  kind: FieldKind
  __value?: unknown
  /** Значение поля по умолчанию — то, к чему его сбрасывает студия. */
  default?: unknown
  /** Шаблоны значения поля — заготовки для подстановки одним кликом, см. FieldTemplate. */
  templates?: readonly FieldTemplate<unknown>[]
  // Возможные специфичные свойства разных видов полей — нужны для рантайм-обхода
  // (валидация, снапшот), при описании заполняются только релевантные.
  fields?: FieldMap
  // Тип элемента массива: одно описание (однородный массив) либо список описаний-
  // членов (разнотипный массив).
  of?: AnyField | readonly AnyField[]
  to?: readonly ReferenceTarget[]
  /** Допустимые типы ассета (поле kind: 'asset') — массив глобов MIME, см. AssetFilter. */
  accept?: AssetFilter
  min?: number
  max?: number
  input?: {
    type?: string
    predefined?: readonly { value: string; title?: string; icon?: FieldIcon }[]
  }
  // Заголовок поля: данные и (опционально) свой компонент рендера, см. HeaderOptions.
  header?: unknown
  headerComponent?: ErasedComponent
}

export type FieldMap = Record<string, AnyField>

// --- Вывод типа значения поля -----------------------------------------------

/** Достаёт тип значения из фантомного `__value`. */
export type FieldValue<F> = F extends { __value?: infer V } ? V : never

/** Тип значения по карте полей: все поля опциональны (черновик частичный, обязательность — правило документа validate). */
export type InferFields<F extends FieldMap> = Prettify<{
  [K in keyof F]?: FieldValue<F[K]>
}>

// --- Строгий путь к полю (для validate) --------------------------------------
// Путь — кортеж сегментов: имена полей строгие (union ключей карты), позиция
// элемента массива — брендированный ArrayIndex (Effect Brand). Билдер path(...)
// возвращает брендированный FieldPath, поэтому сырой массив строк не пройдёт.

/** Индекс элемента массива в пути; обычный number, помеченный брендом для подсказки и защиты. */
export type ArrayIndex = number & Brand.Brand<'ArrayIndex'>

/** Путь к полю: кортеж сегментов; принимается только из билдера path(...) (бренд не подделать сырым массивом). */
export type FieldPath = readonly string[] & Brand.Brand<'FieldPath'>

// Спуск внутрь поля: закончить здесь ([]) либо глубже — объект в свои поля, массив через ArrayIndex в элемент.
type IntoField<Fld> =
  | []
  | (Fld extends { kind: 'object'; fields: infer Sub extends FieldMap }
      ? FieldPathTuples<Sub>
      : never)
  | (Fld extends { kind: 'array'; of: infer Of }
      ? Of extends readonly AnyField[]
        ? [ArrayIndex, ...IntoField<Of[number]>]
        : [ArrayIndex, ...IntoField<Of>]
      : never)

/** Все валидные кортежи путей по карте полей: имена полей строгие, элемент массива — ArrayIndex. */
export type FieldPathTuples<Fm extends FieldMap> = {
  [K in keyof Fm & string]: [K, ...IntoField<Fm[K]>]
}[keyof Fm & string]

/** Билдер строгого пути, привязанный к карте полей документа: проверяет кортеж и возвращает FieldPath. */
export type PathBuilder<F extends FieldMap> = <
  const P extends FieldPathTuples<F>,
>(
  segments: P,
) => FieldPath

// --- Фабрики полей -----------------------------------------------------------

type Predefined = readonly {
  value: string
  title?: string
  icon?: FieldIcon
}[]

type StringOptions = FieldMeta & {
  placeholder?: string
  default?: string
  input?:
    | { type?: 'normal' }
    | { type: 'multiline' }
    | { type: 'select'; predefined: Predefined }
}

/**
 * Тип значения строкового поля по его опциям: для `input: { type: 'select',
 * predefined }` — объединение предопределённых значений, иначе `string`. Вынесен
 * отдельно, чтобы переиспользоваться в `__value` и в ограничении шаблонов без
 * цикла (читает только `input`, не сам `templates`).
 */
type StringValue<O> = O extends {
  input: { type: 'select'; predefined: infer P }
}
  ? P extends readonly { value: infer V }[]
    ? V & string
    : string
  : string

/**
 * Строковое поле. Для `input: { type: 'select', predefined }` тип значения
 * сужается до объединения предопределённых значений, иначе это `string`.
 */
export function defineString<
  const O extends StringOptions,
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & {
      templates?: readonly FieldTemplate<StringValue<O>>[]
    } = {} as O & HeaderOptions<H>,
) {
  return { kind: 'string', ...options } as { kind: 'string' } & O &
    HeaderOptions<H> & { __value?: StringValue<O> }
}

type NumberOptions = FieldMeta & {
  min?: number
  max?: number
  default?: number
}

/** Числовое поле с границами `min`/`max` и пользовательскими проверками. */
export function defineNumber<
  const O extends NumberOptions,
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { templates?: readonly FieldTemplate<number>[] } = {} as O &
    HeaderOptions<H>,
) {
  return { kind: 'number', ...options } as { kind: 'number' } & O &
    HeaderOptions<H> & { __value?: number }
}

/** Булево поле. */
export function defineBoolean<
  const O extends FieldMeta & { default?: boolean },
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { templates?: readonly FieldTemplate<boolean>[] } = {} as O &
    HeaderOptions<H>,
) {
  return { kind: 'boolean', ...options } as { kind: 'boolean' } & O &
    HeaderOptions<H> & { __value?: boolean }
}

/** Rich-text поле (редактор Tiptap). */
export function defineRichText<
  const O extends FieldMeta & { default?: RichTextValue },
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & {
      templates?: readonly FieldTemplate<RichTextValue>[]
    } = {} as O & HeaderOptions<H>,
) {
  return { kind: 'richText', ...options } as { kind: 'richText' } & O &
    HeaderOptions<H> & { __value?: RichTextValue }
}

/** Поле-картинка — выбор/загрузка ассета. */
export function defineImage<
  const O extends FieldMeta & { default?: ImageValue },
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { templates?: readonly FieldTemplate<ImageValue>[] } = {} as O &
    HeaderOptions<H>,
) {
  return { kind: 'image', ...options } as { kind: 'image' } & O &
    HeaderOptions<H> & { __value?: ImageValue }
}

/** Поле-ассет — выбор/загрузка файла любого типа. `accept` ограничивает допустимые типы (массив глобов MIME, см. AssetFilter); без него принимаются любые. */
export function defineAsset<
  const O extends FieldMeta & { accept?: AssetFilter; default?: AssetValue },
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { templates?: readonly FieldTemplate<AssetValue>[] } = {} as O &
    HeaderOptions<H>,
) {
  return { kind: 'asset', ...options } as { kind: 'asset' } & O &
    HeaderOptions<H> & { __value?: AssetValue }
}

/**
 * Единая точка регистрации схемы приложением (приём Register из TanStack): один интерфейс
 * `interface SchemaRegistry { band: typeof bandDoc; ... }`, ключ → определение документа.
 * Из него выводятся и ключи типов для `to` (`keyof` берёт лишь имена членов, не вычисляя
 * их значения, поэтому ссылка `documents → defineReference → keyof` не образует цикла), и
 * карты полей для шаблонов (`[K]['fields']` резолвится лениво по одному ключу). Намеренно
 * интерфейс с отдельными членами, а не `typeof documents`: единый const вычисляется
 * целиком, что втянуло бы документ с шаблоном и замкнуло бы тип сам на себя.
 */
export interface SchemaRegistry {}

/** Ключи зарегистрированных типов документов; пустой реестр → любая строка. */
export type DocumentTypeKey = [keyof SchemaRegistry] extends [never]
  ? string
  : keyof SchemaRegistry & string

/**
 * Цель ссылки: тип документа `to` (ключ реестра) и переопределение его превью —
 * декларативные данные `preview` и свой `previewComponent`, как у документа.
 * Превью типизировано широко (previewComponent — ErasedComponent): реестр не
 * отдаёт тип черновика по ключу, поэтому точный draft здесь недоступен.
 */
export type ReferenceTarget = {
  to: DocumentTypeKey
  preview?: DefaultPreviewData
  previewComponent?: ErasedComponent
}

type ReferenceOptions = FieldMeta & {
  /** Типы документов, на которые можно ссылаться, с переопределением превью каждого. */
  to: readonly ReferenceTarget[]
  size?: 'default' | 'compact'
  default?: ReferenceValue
}

/** Поле-ссылка на документ; `to[].to` ограничено реестром SchemaRegistry (автодополнение и проверка в месте вызова), дереференс — на уровне find-запроса. Цели `to` выводятся в отдельный дженерик `To`, поэтому `templates` контекстно типизируется значением ссылки в момент набора (см. defineObject про замыкание на `O`). */
export function defineReference<
  const O extends Omit<ReferenceOptions, 'to'> & {
    to: readonly ReferenceTarget[]
  },
  const To extends readonly ReferenceTarget[],
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { to: To } & {
      templates?: readonly FieldTemplate<ReferenceValue<To[number]['to']>>[]
    },
) {
  return { kind: 'reference', ...options } as { kind: 'reference' } & O &
    HeaderOptions<H> & { __value?: ReferenceValue<To[number]['to']> }
}

type ObjectOptions = FieldMeta & {
  fields: FieldMap
  default?: Record<string, unknown>
}

/** Вложенный объект со своей картой полей. Карта полей выводится в отдельный дженерик `F` прямо из `fields`, поэтому `templates` контекстно типизируется значением объекта (`InferFields<F>`) уже в момент набора — редактор подсказывает форму. Будь тип значения завязан на общий `O` (выводимый из всего объекта опций, включая сам `templates`), вывод замкнулся бы и подсказок внутри `value` не было бы. */
export function defineObject<
  const O extends ObjectOptions,
  const F extends FieldMap,
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { fields: F } & {
      templates?: readonly FieldTemplate<InferFields<F>>[]
    },
) {
  return { kind: 'object', ...options } as { kind: 'object' } & O &
    HeaderOptions<H> & { __value?: InferFields<F> }
}

/**
 * Значение элемента разнотипного массива: значение члена плюс служебные `_key`
 * (стабильная идентичность элемента в массиве) и `_type` (имя члена — `name` или,
 * если не задано, его `kind`). По `_type` студия выбирает редактор элемента.
 */
export type ArrayItemValue<M extends AnyField> = Prettify<
  {
    _key: string
    _type: M extends { name: infer N extends string } ? N : M['kind']
  } & FieldValue<M>
>

type ArrayOptions = FieldMeta & {
  /**
   * Тип элемента: одно описание — однородный массив (элементы хранятся как есть),
   * либо список описаний-членов — разнотипный массив (элементы получают `_type` и
   * `_key`, см. ArrayItemValue).
   */
  of: AnyField | readonly AnyField[]
  default?: unknown[]
}

/**
 * Тип значения массива по типу его элемента `of`: разнотипный (of — список полей) даёт
 * элементы с `_type`/`_key` (ArrayItemValue), однородный (of — одно поле) — просто
 * массив значений элемента. Берёт тип элемента напрямую, чтобы фабрика выводила его в
 * отдельный дженерик и контекстно типизировала `templates` без замыкания на `O`.
 */
type ArrayFieldValueOf<Of> = Of extends readonly AnyField[]
  ? ArrayItemValue<Of[number]>[]
  : Of extends AnyField
    ? FieldValue<Of>[]
    : never

/** Массив элементов — однородный (of — одно поле) или разнотипный (of — список полей). Тип элемента выводится в отдельный дженерик `Of` прямо из `of`, поэтому `templates` подсказывает форму элемента в момент набора (см. defineObject про замыкание на `O`). */
export function defineArray<
  const O extends ArrayOptions,
  const Of extends ArrayOptions['of'],
  H = DefaultHeaderData,
>(
  options: O &
    HeaderOptions<H> & { of: Of } & {
      templates?: readonly FieldTemplate<ArrayFieldValueOf<Of>>[]
    },
) {
  return { kind: 'array', ...options } as { kind: 'array' } & O &
    HeaderOptions<H> & { __value?: ArrayFieldValueOf<Of> }
}
