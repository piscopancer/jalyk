import type { AnyField, FieldMap } from './field.ts'

// Структурное соответствие сохранённого значения схеме поля. Это не пользовательская
// валидация (defineDocument.validate), а встроенная проверка формы JSON: после правки
// схемы старое значение в базе может перестать подходить под поле. Различаем два рода
// несоответствия, потому что чинятся они по-разному:
//
//  - 'type'      — категория значения совпадает с тем, что ждёт инпут (скаляр для
//                  скалярного поля), но конкретный тип/вариант не тот: было число, а
//                  поле стало строковым select; значение выпало из predefined. Инпут
//                  значение всё же показывает, поэтому чинится прямо в нём (выбрать
//                  пункт, перепечатать) — аварийный редактор не нужен.
//  - 'structure' — сломана сама категория JSON (примитив против контейнера): было
//                  число, стал объект; был массив, стало число. Данные «фантомные» —
//                  в инпут не встанут, поэтому поле подменяется аварийным JSON-редактором.
//
// В обоих случаях документ считается сломанным (на отдаче клиенту режется целиком),
// различается лишь способ починки в студии.

/** Род несоответствия значения схеме поля; 'ok' — значение подходит (в т.ч. пустое). */
export type FieldFit = 'ok' | 'type' | 'structure'

/** Служебные ключи элементов/значений, которые не являются «лишними» полями объекта. */
const SERVICE_KEYS = new Set(['_key', '_type', '_ref', '_toType'])

type ValueCategory = 'empty' | 'scalar' | 'array' | 'object'

function categoryOf(value: unknown): ValueCategory {
  if (value === undefined || value === null) return 'empty'
  if (Array.isArray(value)) return 'array'
  return typeof value === 'object' ? 'object' : 'scalar'
}

/** Категория значения, которую ждёт редактор данного вида поля. */
function expectedCategory(
  kind: AnyField['kind'],
): Exclude<ValueCategory, 'empty'> {
  switch (kind) {
    case 'string':
    case 'number':
    case 'boolean':
      return 'scalar'
    case 'array':
      return 'array'
    default:
      // richText, image, reference, object — все контейнеры-объекты.
      return 'object'
  }
}

/** Структурное соответствие значения полю. Пустое значение (поле просто не заполнено) всегда подходит — обязательность проверяет defineDocument.validate, не эта функция. */
export function fieldFit(field: AnyField, value: unknown): FieldFit {
  const cat = categoryOf(value)
  if (cat === 'empty') return 'ok'

  const expected = expectedCategory(field.kind)
  if (cat !== expected) return 'structure'

  // Категория совпала — для скаляров доуточняем примитивный тип и вариант select.
  switch (field.kind) {
    case 'string': {
      if (typeof value !== 'string') return 'type'
      const predefined = field.input?.predefined
      if (field.input?.type === 'select' && predefined) {
        return predefined.some((option) => option.value === value)
          ? 'ok'
          : 'type'
      }
      return 'ok'
    }
    case 'number':
      return typeof value === 'number' ? 'ok' : 'type'
    case 'boolean':
      return typeof value === 'boolean' ? 'ok' : 'type'
    case 'image':
    case 'asset':
      return typeof (value as { assetId?: unknown }).assetId === 'string'
        ? 'ok'
        : 'structure'
    case 'reference':
      return typeof (value as { _ref?: unknown })._ref === 'string'
        ? 'ok'
        : 'structure'
    default:
      // object/array/richText: контейнер на месте, содержимое проверяется глубже по дереву.
      return 'ok'
  }
}

/** Ключи объекта, присутствующие в значении, но отсутствующие в схеме объекта (поле удалили из схемы). Безобидны: документ отдаётся клиенту, поле срезается; в студии показываются как «неизвестные». Служебные ключи (`_key`, `_type`…) не считаются. */
export function unknownObjectKeys(field: AnyField, value: unknown): string[] {
  const fields = field.fields
  if (field.kind !== 'object' || !fields) return []
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return []
  return Object.keys(value).filter(
    (key) => !(key in fields) && !SERVICE_KEYS.has(key),
  )
}

/** Описание члена массива, которым следует рисовать/проверять элемент: в разнотипном массиве выбирается по `_type`, в однородном — единственный член. */
function memberFor(field: AnyField, item: unknown): AnyField | undefined {
  const of = field.of
  if (!of) return undefined
  if (!Array.isArray(of)) return of as AnyField
  const members = of as readonly AnyField[]
  const type = (item as { _type?: string } | null)?._type
  return (
    members.find((member) => (member.name ?? member.kind) === type) ??
    members[0]
  )
}

/** Структурно несоответствующее поле: путь сегментами-строками (индекс массива — строка) и род несоответствия. */
export type ConformanceMiss = { path: string[]; fit: Exclude<FieldFit, 'ok'> }

/** Пути всех структурно несоответствующих полей черновика (рекурсивно). Пути сегментами-строками, как адресует поля студия. По сломанному полю вглубь не спускается — оно чинится целиком. Лишние (неизвестные) поля сюда не попадают: они безобидны. */
export function conformancePaths(fields: FieldMap, draft: unknown) {
  const out: ConformanceMiss[] = []
  walkFields(fields, draft, [], out)
  return out
}

function walkFields(
  fields: FieldMap,
  value: unknown,
  path: string[],
  out: ConformanceMiss[],
): void {
  const object =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  for (const [key, field] of Object.entries(fields)) {
    walkField(field, object?.[key], [...path, key], out)
  }
}

function walkField(
  field: AnyField,
  value: unknown,
  path: string[],
  out: ConformanceMiss[],
): void {
  const fit = fieldFit(field, value)
  if (fit !== 'ok') {
    out.push({ path, fit })
    return
  }
  if (field.kind === 'object' && field.fields) {
    walkFields(field.fields, value, path, out)
    return
  }
  if (field.kind === 'array' && Array.isArray(value)) {
    value.forEach((item, idx) => {
      const member = memberFor(field, item)
      if (member) walkField(member, item, [...path, String(idx)], out)
    })
  }
}
