import type { AnyConfig, DocumentType } from './config.ts'
import type { FieldValue, InferFields, Prettify } from './field.ts'

// Типизированный язык запросов к документам в духе Prisma. Это чисто типовой слой
// (без React и без IO): из конфига выводятся фильтры where, проекции select и
// результаты запросов вместе с джоинами по ссылкам. Где запрос исполняется —
// на клиенте или на сервере — типам безразлично (см. createStudio в студии).

// Карта полей документа типа T. Берётся из конкретного конфига, поэтому типы
// полей точные (defineConfig сохраняет литералы), а не widened DocumentOptions.
export type FieldsOf<C extends AnyConfig, T extends DocumentType<C>> = C['documents'][T]['fields']

// Целевые типы ссылки поля F: для одиночной ссылки — её `to`, для массива ссылок —
// `to` элемента; иначе never (поле не ссылка).
type RefTargets<F> = F extends { kind: 'reference'; to: infer To extends readonly string[] } ? To[number] : never
type ArrayRefTargets<F> = F extends { kind: 'array'; of: infer Of extends { kind: 'reference'; to: readonly string[] } }
  ? Of['to'][number]
  : never

// --- where -------------------------------------------------------------------

type StringFilter = string | { equals?: string; in?: readonly string[]; contains?: string; not?: string }
type NumberFilter = number | { equals?: number; in?: readonly number[]; lt?: number; lte?: number; gt?: number; gte?: number; not?: number }
type BooleanFilter = boolean | { equals?: boolean; not?: boolean }

// Фильтр по значению скаляра — оператор по типу значения поля.
type ScalarFilter<V> = [V] extends [string] ? StringFilter : [V] extends [number] ? NumberFilter : [V] extends [boolean] ? BooleanFilter : never

// Фильтр одного поля: ссылка фильтруется по id (_ref), скаляр — по значению.
type FieldWhere<C extends AnyConfig, F> = RefTargets<F> extends never
  ? ArrayRefTargets<F> extends never
    ? ScalarFilter<FieldValue<F>>
    : never
  : string | { equals?: string; in?: readonly string[] }

/** Фильтр документов типа T: по его полям-скалярам, ссылкам (по id) и собственному id. */
export type Where<C extends AnyConfig, T extends DocumentType<C>> = Prettify<
  { [K in keyof FieldsOf<C, T> as FieldWhere<C, FieldsOf<C, T>[K]> extends never ? never : K]?: FieldWhere<C, FieldsOf<C, T>[K]> } & {
    id?: StringFilter
  }
>

// --- select + джоины ---------------------------------------------------------

// Выбор одного поля: скаляр — только `true`; ссылка (одиночная или массив) — `true`
// (оставить ReferenceValue) либо вложенный select целевого типа (дереференс-джоин).
type FieldSelect<C extends AnyConfig, F> = ArrayRefTargets<F> extends never
  ? RefTargets<F> extends never
    ? true
    : true | Select<C, RefTargets<F>>
  : true | Select<C, ArrayRefTargets<F>>

/** Проекция полей документа типа T. `id`/`_type` выбираются явно, как в Prisma. */
export type Select<C extends AnyConfig, T extends DocumentType<C>> = {
  [K in keyof FieldsOf<C, T>]?: FieldSelect<C, FieldsOf<C, T>[K]>
} & { id?: true; _type?: true }

// Результат выбора одного поля по подвыбору Sel.
type FieldResult<C extends AnyConfig, F, Sel> = Sel extends true
  ? FieldValue<F>
  : RefTargets<F> extends never
    ? ArrayRefTargets<F> extends never
      ? FieldValue<F>
      : Sel extends Select<C, ArrayRefTargets<F>>
        ? Project<C, ArrayRefTargets<F>, Sel>[]
        : never
    : Sel extends Select<C, RefTargets<F>>
      ? Project<C, RefTargets<F>, Sel> | null
      : never

/**
 * Документ типа T, спроецированный по выбору S. T может быть объединением
 * (полиморфная ссылка) — тогда проекция распределяется по членам. Джоины
 * дереференсятся через FieldResult рекурсивно на любую глубину.
 */
export type Project<C extends AnyConfig, T extends DocumentType<C>, S> = T extends DocumentType<C>
  ? Prettify<
      (S extends { id: true } ? { id: string } : unknown) &
        (S extends { _type: true } ? { _type: T } : unknown) & {
          [K in keyof S & keyof FieldsOf<C, T>]: FieldResult<C, FieldsOf<C, T>[K], S[K]>
        }
    >
  : never

// --- результат и аргументы запроса ------------------------------------------

/** Полный документ типа T: id плюс значения полей (ссылки остаются ReferenceValue). */
export type DocumentRecord<C extends AnyConfig, T extends DocumentType<C>> = Prettify<{ id: string } & InferFields<FieldsOf<C, T>>>

/** Порядок сортировки по полю-скаляру. */
export type OrderBy<C extends AnyConfig, T extends DocumentType<C>> = {
  [K in keyof FieldsOf<C, T> as FieldValue<FieldsOf<C, T>[K]> extends string | number | boolean ? K : never]?: 'asc' | 'desc'
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
export type QueryResult<C extends AnyConfig, T extends DocumentType<C>, A> = A extends { select: infer S }
  ? Project<C, T, S>
  : DocumentRecord<C, T>

// --- where: рантайм-предикат (чистый, без IO) --------------------------------

// Предикат «значение прошло фильтр». Чистая функция — джоины и загрузку делает
// студия, сюда приходит уже значение поля документа.
function matchesFilter(value: unknown, filter: unknown): boolean {
  if (filter === null || typeof filter !== 'object') return value === filter
  const f = filter
  if ('equals' in f && f.equals !== undefined && value !== f.equals) return false
  if ('not' in f && f.not !== undefined && value === f.not) return false
  if ('in' in f && Array.isArray(f.in) && !f.in.includes(value)) return false
  if ('contains' in f && typeof f.contains === 'string' && !(typeof value === 'string' && value.includes(f.contains))) return false
  if ('lt' in f && typeof f.lt === 'number' && !(typeof value === 'number' && value < f.lt)) return false
  if ('lte' in f && typeof f.lte === 'number' && !(typeof value === 'number' && value <= f.lte)) return false
  if ('gt' in f && typeof f.gt === 'number' && !(typeof value === 'number' && value > f.gt)) return false
  if ('gte' in f && typeof f.gte === 'number' && !(typeof value === 'number' && value >= f.gte)) return false
  return true
}

/**
 * Проверяет документ (id + значения полей в draft) против where. Ссылочные поля
 * фильтруются по их `_ref`. Возвращает true, если документ проходит все условия.
 */
export function matchesWhere(record: { id: string; draft: unknown }, where: Record<string, unknown>): boolean {
  const draft = record.draft !== null && typeof record.draft === 'object' ? (record.draft as Record<string, unknown>) : {}
  for (const [key, filter] of Object.entries(where)) {
    if (filter === undefined) continue
    const raw = key === 'id' ? record.id : draft[key]
    // Ссылочное поле: фильтруем по _ref, если значение — объект-ссылка.
    const value = raw !== null && typeof raw === 'object' && '_ref' in raw ? (raw as { _ref: unknown })._ref : raw
    if (!matchesFilter(value, filter)) return false
  }
  return true
}
