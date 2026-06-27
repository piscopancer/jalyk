import type { AnyField, FieldMap } from '@jalyk/schema'
import { getAtPath } from './path.ts'
import { jsonEqual } from './json-equal.ts'

// Обход дерева полей документа: перечисление листовых путей (для панели состояния) и резолв описания поля по конкретному пути. Контейнеры — object (fields) и array (of); элементы массива адресуются индексом, член разнотипного массива выбирается по служебному _type значения, как в редакторе.

/** Члены массива: однородный (of — одно описание) или разнотипный (of — массив описаний). */
function membersOf(field: AnyField): readonly AnyField[] {
  const of = field.of
  if (!of) return []
  // 'kind' in of различает одиночное описание члена и массив описаний без Array.isArray, который не сужает readonly-массивы.
  return 'kind' in of ? [of] : of
}

/** Член массива для элемента значения: по _type в разнотипном массиве, иначе единственный член. */
function memberFor(field: AnyField, item: unknown): AnyField | undefined {
  const members = membersOf(field)
  if (!Array.isArray(field.of)) return members[0]
  const type = (item as { _type?: string } | null)?._type
  return members.find((m) => (m.name ?? m.kind) === type) ?? members[0]
}

/** Описание поля по пути от карты полей документа: спускается через object.fields и array.of (член по _type из значения). undefined — пути нет в схеме. */
export function resolveField(
  fields: FieldMap,
  path: readonly string[],
  draft: unknown,
) {
  let field: AnyField | undefined = fields[path[0] ?? '']
  for (let i = 1; i < path.length && field; i++) {
    if (field.kind === 'object') field = field.fields?.[path[i] ?? '']
    else if (field.kind === 'array')
      field = memberFor(field, getAtPath(draft, path.slice(0, i + 1)))
    else return undefined
  }
  return field
}

/** Человекочитаемая подпись пути: заголовки полей по дороге, элементы массива — номером (1-based). Нужна списку панели, иначе у элемента массива в заголовке остаётся голый индекс. */
export function pathLabel(
  fields: FieldMap,
  path: readonly string[],
  draft: unknown,
) {
  const parts: string[] = []
  let field: AnyField | undefined = fields[path[0] ?? '']
  parts.push(field?.title ?? path[0] ?? '')
  for (let i = 1; i < path.length; i++) {
    const seg = path[i] ?? ''
    if (field?.kind === 'array') {
      parts.push(String(Number(seg) + 1))
      field = memberFor(field, getAtPath(draft, path.slice(0, i + 1)))
    } else if (field?.kind === 'object') {
      field = field.fields?.[seg]
      parts.push(field?.title ?? seg)
    } else parts.push(seg)
  }
  return parts.join(' / ')
}

/** Лист — поле, которое не разворачивается дальше (всё, кроме object и array). */
function isLeaf(field: AnyField) {
  return field.kind !== 'object' && field.kind !== 'array'
}

/** Все листовые пути документа по схеме и значению черновика: в объект спускаемся по схеме, в массив — по элементам значения (член по _type). */
export function leafPaths(fields: FieldMap, draft: unknown) {
  const out: string[][] = []
  const walk = (field: AnyField, path: string[]) => {
    if (isLeaf(field)) {
      out.push(path)
      return
    }
    if (field.kind === 'object')
      for (const [key, sub] of Object.entries(field.fields ?? {}))
        walk(sub, [...path, key])
    else if (field.kind === 'array') {
      const items = getAtPath(draft, path)
      if (Array.isArray(items))
        items.forEach((item, index) => {
          const member = memberFor(field, item)
          if (member) walk(member, [...path, String(index)])
        })
    }
  }
  for (const [key, field] of Object.entries(fields)) walk(field, [key])
  return out
}

/** Листовые пути, чьё значение в черновике расходится с опубликованной версией (или документ ещё не публиковали — изменён весь черновик). */
export function changedLeafPaths(
  fields: FieldMap,
  draft: unknown,
  published: unknown,
) {
  return leafPaths(fields, draft).filter(
    (path) =>
      published == null ||
      !jsonEqual(getAtPath(draft, path), getAtPath(published, path)),
  )
}
