import type { AnyField, FieldMap } from '@jalyk/schema'
import { matchesWhere } from '@jalyk/schema'
import type { FilterNode, SortState } from './list-state.ts'

// Чистые помощники применения состояния списка к загруженным документам.
// Скалярные условия исполняются через matchesWhere из @jalyk/schema (тот же
// движок, что у типизированного клиента); реляционные условия (фильтр по полям
// связанного документа с квантификатором some/every/none) исполняются здесь же,
// дореференсивая ссылки по карте уже загруженных документов (ctx.docs).

/** Поля-даты документа (с провода), доступные для сортировки помимо полей схемы. */
export const DATE_SORT_FIELDS = ['updatedAt', 'createdAt'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

// --- описание документов (карта типов → поля) -------------------------------
// Берётся из config.documents; тип нарочно структурный, чтобы не тянуть AnyConfig.

type DocDefs = Record<string, { fields?: FieldMap } | undefined>

/** Целевые типы документов поля-реляции (одиночной ссылки или массива ссылок), либо null если поле не реляция. */
export function relationTargets(field: AnyField): string[] | null {
  if (field.kind === 'reference' && field.to) return field.to.map((t) => t.to)
  const of = field.of
  // `'kind' in of` сужает union до одиночного поля (массив-of не имеет kind).
  if (field.kind === 'array' && of && 'kind' in of && of.kind === 'reference' && of.to) {
    return of.to.map((t) => t.to)
  }
  return null
}

/** Реляция-массив (some/every/none по многим) против одиночной ссылки. */
function isMultiRelation(field: AnyField): boolean {
  return field.kind === 'array'
}

// --- text search -------------------------------------------------------------

/** Текстовый поиск: подстрока без регистра хотя бы в одном из строковых полей. Пустой запрос или отсутствие полей — не отсеивает. */
export function matchesSearch(draft: unknown, fields: readonly string[], query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0 || fields.length === 0) return true
  const record = isRecord(draft) ? draft : {}
  return fields.some((field) => {
    const value = record[field]
    return typeof value === 'string' && value.toLowerCase().includes(needle)
  })
}

// --- компиляция древа фильтра ------------------------------------------------

/** Скалярное условие → объект where для matchesWhere; отрицание оборачивается в NOT; незаданное поле → {}. */
function compileCond(node: Extract<FilterNode, { kind: 'cond' }>): Record<string, unknown> {
  if (node.field === '') return {}
  const base = { [node.field]: { [node.op]: node.value } }
  return node.not ? { NOT: base } : base
}

/** Карта загруженных документов: тип → (id черновика). Используется для дереференса реляций. */
export type EvalContext = { docs: Map<string, Map<string, unknown>> }

/** Предикат документа: проходит ли его черновик фильтр (с учётом дозагруженных связанных документов). */
export type FilterPredicate = (draft: unknown, ctx: EvalContext) => boolean

const ALWAYS: FilterPredicate = () => true

// Ссылки поля black-box: возвращаем список {_ref,_toType} (для массива — все элементы, для одиночной — один или пусто).
function relatedRefs(draft: unknown, field: string, multiple: boolean): { _ref: string; _toType: string }[] {
  const record = isRecord(draft) ? draft : {}
  const raw = record[field]
  const toRef = (value: unknown): { _ref: string; _toType: string } | null =>
    isRecord(value) && typeof value._ref === 'string' && typeof value._toType === 'string' ? { _ref: value._ref, _toType: value._toType } : null
  if (multiple) return Array.isArray(raw) ? raw.flatMap((item) => { const ref = toRef(item); return ref ? [ref] : [] }) : []
  const ref = toRef(raw)
  return ref ? [ref] : []
}

/**
 * Компилирует древо фильтра в предикат над черновиком. Скаляры исполняет
 * matchesWhere; группы — and/or детей; реляции дереференсят ссылки через
 * ctx.docs и применяют квантификатор some/every/none к вложенному фильтру по
 * полям связанного документа. Цели реляций берутся из defs (карта типов).
 */
export function compileFilterPredicate(defs: DocDefs, type: string, node: FilterNode): FilterPredicate {
  if (node.kind === 'cond') {
    const where = compileCond(node)
    if (Object.keys(where).length === 0) return ALWAYS
    return (draft) => matchesWhere({ id: '', draft }, where)
  }
  if (node.kind === 'group') {
    const preds = node.children.map((child) => compileFilterPredicate(defs, type, child))
    if (preds.length === 0) return ALWAYS
    return (draft, ctx) => (node.op === 'or' ? preds.some((p) => p(draft, ctx)) : preds.every((p) => p(draft, ctx)))
  }
  // реляция
  const field = defs[type]?.fields?.[node.field]
  const targets = field ? relationTargets(field) : null
  if (node.field === '' || !field || !targets || targets.length === 0) return ALWAYS
  // Цель — выбранный тип (для полиморфной ссылки), иначе единственный.
  const target = targets.includes(node.target) ? node.target : targets[0]!
  const multiple = isMultiRelation(field)
  const inner = compileFilterPredicate(defs, target, node.group)
  const quantifier = node.quantifier
  return (draft, ctx) => {
    const refs = relatedRefs(draft, node.field, multiple).filter((ref) => ref._toType === target)
    const drafts = refs.flatMap((ref) => {
      const related = ctx.docs.get(ref._toType)?.get(ref._ref)
      return related === undefined ? [] : [related]
    })
    if (quantifier === 'every') return drafts.every((related) => inner(related, ctx))
    if (quantifier === 'none') return !drafts.some((related) => inner(related, ctx))
    return drafts.some((related) => inner(related, ctx))
  }
}

/** Собирает все типы документов, на которые ссылается фильтр (рекурсивно), чтобы их подгрузить для дереференса реляций. */
export function gatherFilterTypes(defs: DocDefs, type: string, node: FilterNode, acc: Set<string>): void {
  if (node.kind === 'cond') return
  if (node.kind === 'group') {
    for (const child of node.children) gatherFilterTypes(defs, type, child, acc)
    return
  }
  const field = defs[type]?.fields?.[node.field]
  const targets = field ? relationTargets(field) : null
  if (!targets || targets.length === 0) return
  const target = targets.includes(node.target) ? node.target : targets[0]!
  acc.add(target)
  gatherFilterTypes(defs, target, node.group, acc)
}

// --- sort --------------------------------------------------------------------

type SortableDoc = { createdAt: string; updatedAt: string; draft: unknown }

// Значение поля для сортировки: даты берём с провода, остальное — из черновика.
function sortValue(doc: SortableDoc, field: string): string | number | boolean {
  if (field === 'createdAt') return doc.createdAt
  if (field === 'updatedAt') return doc.updatedAt
  const draft = isRecord(doc.draft) ? doc.draft : {}
  const value = draft[field]
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return ''
}

/** Компаратор документов по состоянию сортировки; null — порядок не меняем. */
export function compareDocs(a: SortableDoc, b: SortableDoc, sort: SortState): number {
  if (!sort) return 0
  const av = sortValue(a, sort.field)
  const bv = sortValue(b, sort.field)
  if (av === bv) return 0
  return (av < bv ? -1 : 1) * (sort.dir === 'desc' ? -1 : 1)
}
