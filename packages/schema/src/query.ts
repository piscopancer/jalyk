import type { AnyConfig, DocumentType } from './config.ts'
import type {
  FieldMap,
  FieldValue,
  InferFields,
  Prettify,
  SchemaRegistry,
} from './field.ts'

// Типизированный язык запросов к документам в духе Prisma. Это чисто типовой слой
// (без React и без IO): из конфига выводятся фильтры where, проекции select и
// результаты запросов вместе с джоинами по ссылкам. Где запрос исполняется —
// на клиенте или на сервере — типам безразлично (см. createStudio в студии).

// Карта полей документа типа T. Берётся из конкретного конфига, поэтому типы
// полей точные (defineConfig сохраняет литералы), а не widened DocumentOptions.
export type FieldsOf<
  C extends AnyConfig,
  T extends DocumentType<C>,
> = C['documents'][T]['fields']

// Целевые типы ссылки поля F: для одиночной ссылки — её `to`, для массива ссылок —
// `to` элемента; иначе never (поле не ссылка).
type RefTargets<F> = F extends {
  kind: 'reference'
  to: infer To extends readonly { to: string }[]
}
  ? To[number]['to']
  : never
type ArrayRefTargets<F> = F extends {
  kind: 'array'
  of: infer Of extends { kind: 'reference'; to: readonly { to: string }[] }
}
  ? Of['to'][number]['to']
  : never

// Карта подполей поля-объекта F (defineObject); иначе never.
type ObjectFieldsOf<F> = F extends {
  kind: 'object'
  fields: infer Sub extends FieldMap
}
  ? Sub
  : never
// Карта подполей элемента массива объектов (defineArray of defineObject); иначе never.
type ArrayObjectFieldsOf<F> = F extends { kind: 'array'; of: infer Of }
  ? Of extends { kind: 'object'; fields: infer Sub extends FieldMap }
    ? Sub
    : never
  : never

// --- where -------------------------------------------------------------------

type StringFilter =
  | string
  | {
      equals?: string
      in?: readonly string[]
      contains?: string
      startsWith?: string
      not?: string
    }
type NumberFilter =
  | number
  | {
      equals?: number
      in?: readonly number[]
      lt?: number
      lte?: number
      gt?: number
      gte?: number
      not?: number
    }
type BooleanFilter = boolean | { equals?: boolean; not?: boolean }

// Фильтр по значению скаляра — оператор по типу значения поля.
type ScalarFilter<V> = [V] extends [string]
  ? StringFilter
  : [V] extends [number]
    ? NumberFilter
    : [V] extends [boolean]
      ? BooleanFilter
      : never

/** Фильтр ссылки (одиночной или массива ссылок) — по id целевого документа. */
type RefFilter = string | { equals?: string; in?: readonly string[] }

/** Фильтр массива объектов в духе Prisma: хотя бы один / все / ни одного элемента проходит вложенный where. */
type ArrayObjectFilter<C extends AnyConfig, Fm extends FieldMap> = {
  some?: WhereFields<C, Fm>
  every?: WhereFields<C, Fm>
  none?: WhereFields<C, Fm>
}

// Фильтр одного поля: ссылка — по id (_ref); объект — рекурсивный where по подполям;
// массив объектов — some/every/none; скаляр — по значению.
type FieldWhere<C extends AnyConfig, F> =
  ArrayRefTargets<F> extends never
    ? RefTargets<F> extends never
      ? ObjectFieldsOf<F> extends never
        ? ArrayObjectFieldsOf<F> extends never
          ? ScalarFilter<FieldValue<F>>
          : ArrayObjectFilter<C, ArrayObjectFieldsOf<F>>
        : WhereFields<C, ObjectFieldsOf<F>>
      : RefFilter
    : RefFilter

/** Условия по подполям карты Fm плюс логические узлы AND/OR/NOT (используется для документа и вложенного объекта). */
type WhereFieldsBody<C extends AnyConfig, Fm extends FieldMap> = {
  [K in keyof Fm as FieldWhere<C, Fm[K]> extends never ? never : K]?: FieldWhere<
    C,
    Fm[K]
  >
}

/** Where по карте полей Fm: условия подполей и древо AND/OR/NOT. */
type WhereFields<C extends AnyConfig, Fm extends FieldMap> = Prettify<
  WhereFieldsBody<C, Fm> & {
    AND?: readonly WhereFields<C, Fm>[]
    OR?: readonly WhereFields<C, Fm>[]
    NOT?: WhereFields<C, Fm>
  }
>

/** Фильтр документов типа T: по его полям, собственному id и логическим узлам AND/OR/NOT (древо). */
export type Where<C extends AnyConfig, T extends DocumentType<C>> = Prettify<
  WhereFieldsBody<C, FieldsOf<C, T>> & {
    id?: StringFilter
    AND?: readonly Where<C, T>[]
    OR?: readonly Where<C, T>[]
    NOT?: Where<C, T>
  }
>

// --- select + джоины ---------------------------------------------------------

// Выбор одного поля: скаляр — только `true`; ссылка (одиночная/массив) — `true`
// (оставить ReferenceValue) или вложенный select целевого типа (дереференс-джоин);
// объект/массив объектов — `true` (всё значение) или подвыбор их полей.
type FieldSelect<C extends AnyConfig, F> =
  ArrayRefTargets<F> extends never
    ? RefTargets<F> extends never
      ? ObjectFieldsOf<F> extends never
        ? ArrayObjectFieldsOf<F> extends never
          ? true
          : true | SelectFields<C, ArrayObjectFieldsOf<F>>
        : true | SelectFields<C, ObjectFieldsOf<F>>
      : true | Select<C, RefTargets<F>>
    : true | Select<C, ArrayRefTargets<F>>

/** Подвыбор полей карты Fm (для документа и вложенного объекта). */
type SelectFields<C extends AnyConfig, Fm extends FieldMap> = {
  [K in keyof Fm]?: FieldSelect<C, Fm[K]>
}

/** Проекция полей документа типа T. `id`/`_type` выбираются явно, как в Prisma. */
export type Select<C extends AnyConfig, T extends DocumentType<C>> =
  SelectFields<C, FieldsOf<C, T>> & { id?: true; _type?: true }

// Результат выбора одного поля по подвыбору Sel.
type FieldResult<C extends AnyConfig, F, Sel> = Sel extends true
  ? FieldValue<F>
  : ArrayRefTargets<F> extends never
    ? RefTargets<F> extends never
      ? ObjectFieldsOf<F> extends never
        ? ArrayObjectFieldsOf<F> extends never
          ? FieldValue<F>
          : Sel extends SelectFields<C, ArrayObjectFieldsOf<F>>
            ? ProjectFields<C, ArrayObjectFieldsOf<F>, Sel>[]
            : never
        : Sel extends SelectFields<C, ObjectFieldsOf<F>>
          ? ProjectFields<C, ObjectFieldsOf<F>, Sel> | null
          : never
      : Sel extends Select<C, RefTargets<F>>
        ? Project<C, RefTargets<F>, Sel> | null
        : never
    : Sel extends Select<C, ArrayRefTargets<F>>
      ? Project<C, ArrayRefTargets<F>, Sel>[]
      : never

/** Проекция карты полей Fm по выбору S (для документа и вложенного объекта). */
type ProjectFields<C extends AnyConfig, Fm extends FieldMap, S> = Prettify<{
  [K in keyof S & keyof Fm]: FieldResult<C, Fm[K], S[K]>
}>

/**
 * Документ типа T, спроецированный по выбору S. T может быть объединением
 * (полиморфная ссылка) — тогда проекция распределяется по членам. Джоины и
 * вложенные объекты дереференсятся через FieldResult рекурсивно на любую глубину.
 */
export type Project<C extends AnyConfig, T extends DocumentType<C>, S> =
  T extends DocumentType<C>
    ? Prettify<
        (S extends { id: true } ? { id: string } : unknown) &
          (S extends { _type: true } ? { _type: T } : unknown) &
          ProjectFields<C, FieldsOf<C, T>, S>
      >
    : never

// --- результат и аргументы запроса ------------------------------------------

/** Полный документ типа T: id плюс значения полей (ссылки остаются ReferenceValue). */
export type DocumentRecord<
  C extends AnyConfig,
  T extends DocumentType<C>,
> = Prettify<{ id: string } & InferFields<FieldsOf<C, T>>>

/** Порядок сортировки по полю-скаляру. */
export type OrderBy<C extends AnyConfig, T extends DocumentType<C>> = {
  [K in keyof FieldsOf<C, T> as FieldValue<FieldsOf<C, T>[K]> extends
    | string
    | number
    | boolean
    ? K
    : never]?: 'asc' | 'desc'
}

/** Аргументы findMany. Без select результат — полный документ, с select — проекция. */
export type FindManyArgs<C extends AnyConfig, T extends DocumentType<C>> = {
  where?: Where<C, T>
  select?: Select<C, T>
  orderBy?: OrderBy<C, T>
  take?: number
  skip?: number
}

/** Аргументы findUnique: id обязателен, select — опционален. */
export type FindUniqueArgs<C extends AnyConfig, T extends DocumentType<C>> = {
  id: string
  select?: Select<C, T>
}

// Результат запроса по аргументам: select определяет, проекция это или полный документ.
export type QueryResult<
  C extends AnyConfig,
  T extends DocumentType<C>,
  A,
> = A extends { select: infer S } ? Project<C, T, S> : DocumentRecord<C, T>

// --- императивный async-клиент чтения ----------------------------------------
// Те же запросы, что и хук-клиент студии, но как обычные async-функции (промисы),
// чтобы их можно было звать вне рендера — например в колбэке шаблона по клику.

/** Контракт чтения одного типа в async-форме (зеркало хук-версии без React). */
export type AsyncDocumentApi<C extends AnyConfig, T extends DocumentType<C>> = {
  findMany: <const A extends FindManyArgs<C, T>>(
    args?: A,
  ) => Promise<QueryResult<C, T, A>[]>
  findUnique: <const A extends FindUniqueArgs<C, T>>(
    args: A,
  ) => Promise<QueryResult<C, T, A> | null>
  count: (args?: { where?: Where<C, T> }) => Promise<number>
}

/** Императивный клиент по конфигу: client.<type>.{findMany,findUnique,count}. Используется и студией (createAsyncClient), и типизацией ctx.client шаблонов. */
export type AsyncClientOf<C extends AnyConfig> = {
  [T in DocumentType<C>]: AsyncDocumentApi<C, T>
}

// --- шаблоны полей -----------------------------------------------------------

/**
 * Синтетический конфиг из единого реестра схемы (`SchemaRegistry['documents']`, ключ →
 * определение документа с его `fields`) — скармливается query-типам и AsyncDocumentApi.
 * Намеренно НЕ `typeof config` и НЕ прямая ссылка `{ documents: RegisteredDocuments }`:
 * любая из них форсирует вычисление всего объекта документов разом, включая тот, чей
 * шаблон читает других, → цикл «documents → шаблон → TemplateClient → documents». Здесь
 * же мапленный тип: индексация `['<тип>']` резолвит лишь одну запись лениво, поэтому
 * шаблон одного документа читает любой другой; неустранимо лишь чтение СВОЕГО типа.
 */
type TemplateRegConfig = {
  documents: {
    [K in keyof SchemaRegistry]: {
      fields: SchemaRegistry[K] extends { fields: infer F } ? F : never
    }
  }
}

/**
 * Тип ctx.client: строго типизированный async-клиент по зарегистрированным документам.
 * Ключуется прямо по ключам реестра, а конфиг пересекается с AnyConfig — иначе
 * `DocumentType` от мапленного по augmented-интерфейсу типа схлопывается в `string`,
 * и проекции становятся `never`.
 */
export type TemplateClient = {
  [K in keyof SchemaRegistry & string]: AsyncDocumentApi<
    TemplateRegConfig & AnyConfig,
    K
  >
}

/**
 * Контекст, передаваемый колбэку шаблона в момент клика. `documentId` — id уже
 * сохранённого документа. `client` — async-клиент для чтения других документов.
 */
export type TemplateContext = {
  documentId: string
  client: TemplateClient
}

/**
 * Шаблон значения поля — заготовка, подставляемая одним кликом. `value` либо статическое
 * значение типа поля, либо колбэк, считаемый на клиенте в момент клика (получает
 * TemplateContext, может вернуть значение синхронно или промисом). `label` — подпись
 * пункта подменю «Шаблоны» (из колбэка имя не вытащить). Подсказку формы значения внутри
 * `value` даёт не разнесение по ключам, а вывод типа поля в отдельный дженерик в фабриках
 * (см. defineObject) — поэтому объединение со функцией здесь не мешает автодополнению.
 */
export type FieldTemplate<V> = {
  label: string
  value: V | ((ctx: TemplateContext) => V | Promise<V>)
}

/**
 * Фабрика динамического шаблона — обычная функция без хуков, нужна лишь чтобы
 * типизировать `ctx` колбэка. Статические шаблоны её не требуют: пиши объект
 * `{ label, value }` прямо в `templates`. Тип `V` приходит сверху из опции `templates`,
 * а не из тела колбэка: иначе TS вычислял бы `return`, читающий `ctx.client`, и замкнулся
 * бы на конфиг (цикл); здесь тип поля известен сразу, тело проверяется отдельным проходом.
 */
export function defineTemplate<V>(template: FieldTemplate<V>): FieldTemplate<V> {
  return template
}

// --- where: рантайм-предикат (чистый, без IO) --------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

// Операторы скалярного фильтра — отличают фильтр-объект скаляра/ссылки от
// вложенного where по подполям объекта.
const SCALAR_OPS = new Set([
  'equals',
  'not',
  'in',
  'contains',
  'startsWith',
  'lt',
  'lte',
  'gt',
  'gte',
])

/** Значение для скалярного сравнения: у ссылки берём её id (_ref), иначе само значение. */
function refValue(raw: unknown): unknown {
  return isRecord(raw) && '_ref' in raw ? (raw as { _ref: unknown })._ref : raw
}

// Предикат «значение прошло фильтр». Чистая функция — джоины и загрузку делает
// студия, сюда приходит уже значение поля документа.
function matchesFilter(value: unknown, filter: unknown): boolean {
  if (filter === null || typeof filter !== 'object') return value === filter
  const f = filter
  if ('equals' in f && f.equals !== undefined && value !== f.equals)
    return false
  if ('not' in f && f.not !== undefined && value === f.not) return false
  if ('in' in f && Array.isArray(f.in) && !f.in.includes(value)) return false
  if (
    'contains' in f &&
    typeof f.contains === 'string' &&
    !(typeof value === 'string' && value.includes(f.contains))
  )
    return false
  if (
    'startsWith' in f &&
    typeof f.startsWith === 'string' &&
    !(typeof value === 'string' && value.startsWith(f.startsWith))
  )
    return false
  if (
    'lt' in f &&
    typeof f.lt === 'number' &&
    !(typeof value === 'number' && value < f.lt)
  )
    return false
  if (
    'lte' in f &&
    typeof f.lte === 'number' &&
    !(typeof value === 'number' && value <= f.lte)
  )
    return false
  if (
    'gt' in f &&
    typeof f.gt === 'number' &&
    !(typeof value === 'number' && value > f.gt)
  )
    return false
  if (
    'gte' in f &&
    typeof f.gte === 'number' &&
    !(typeof value === 'number' && value >= f.gte)
  )
    return false
  return true
}

/**
 * Предикат одного поля по форме фильтра: массив объектов — some/every/none;
 * вложенный объект — рекурсивная проверка подполей; скаляр/ссылка — matchesFilter.
 */
function matchesField(value: unknown, filter: unknown): boolean {
  if (!isRecord(filter)) return refValue(value) === filter
  const keys = Object.keys(filter)
  // Фильтр массива объектов: хотя бы один / все / ни одного элемента.
  if (keys.some((k) => k === 'some' || k === 'every' || k === 'none')) {
    const items = Array.isArray(value) ? value : []
    if (isRecord(filter.some) && !items.some((el) => matchesFields(el, filter.some as Record<string, unknown>)))
      return false
    if (isRecord(filter.none) && items.some((el) => matchesFields(el, filter.none as Record<string, unknown>)))
      return false
    if (isRecord(filter.every) && !items.every((el) => matchesFields(el, filter.every as Record<string, unknown>)))
      return false
    return true
  }
  // Скалярный/ссылочный фильтр-объект (операторы) либо пустой объект.
  if (keys.length === 0 || keys.some((k) => SCALAR_OPS.has(k)))
    return matchesFilter(refValue(value), filter)
  // Иначе вложенный объект: проверяем его подполя.
  return matchesFields(value, filter)
}

/** Проверяет источник (объект значений) против where: узлы AND/OR/NOT — древо, остальные ключи — условия по полям. */
function matchesFields(
  source: unknown,
  where: Record<string, unknown>,
  id?: string,
): boolean {
  const rec = isRecord(source) ? source : {}
  for (const [key, filter] of Object.entries(where)) {
    if (filter === undefined) continue
    if (key === 'AND') {
      if (
        Array.isArray(filter) &&
        !filter.every((sub) =>
          matchesFields(source, sub as Record<string, unknown>, id),
        )
      )
        return false
      continue
    }
    if (key === 'OR') {
      if (
        Array.isArray(filter) &&
        filter.length > 0 &&
        !filter.some((sub) =>
          matchesFields(source, sub as Record<string, unknown>, id),
        )
      )
        return false
      continue
    }
    if (key === 'NOT') {
      if (isRecord(filter) && matchesFields(source, filter, id)) return false
      continue
    }
    const value = key === 'id' && id !== undefined ? id : rec[key]
    if (!matchesField(value, filter)) return false
  }
  return true
}

/**
 * Проверяет документ (id + значения полей в draft) против where. Ссылочные поля
 * фильтруются по их `_ref`, объекты — рекурсивно, массивы объектов — some/every/none.
 * Возвращает true, если документ проходит.
 */
export function matchesWhere(
  record: { id: string; draft: unknown },
  where: Record<string, unknown>,
): boolean {
  return matchesFields(record.draft, where, record.id)
}
