import { useAtom, useAtomValue } from 'jotai'
import { atomFamily, atomWithStorage, selectAtom } from 'jotai/utils'
import { withImmer } from 'jotai-immer'
import { useMemo } from 'react'

// Состояние панели списка документов (поиск, древо фильтров, сортировка) на jotai. Персистится в localStorage через atomWithStorage (автосохранение), правки древа идут через withImmer (глубокая мутация без ручного копирования), а точечные производные значения читаются через selectAtom, чтобы не перерисовывать всё.

/** Операторы условия — совпадают с операторами matchesFilter в @jalyk/schema. Отрицание задаётся отдельным флагом not, поэтому «не равно» здесь нет. */
export type FilterOp =
  | 'contains'
  | 'startsWith'
  | 'equals'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'

/** Условие по скалярному полю: поле-оператор-значение плюс флаг отрицания (кнопка «!»). field === '' — ещё не выбрано (плейсхолдер «Выбрать поле»). */
export type FilterCond = {
  kind: 'cond'
  id: string
  field: string
  not: boolean
  op: FilterOp
  value: string | number | boolean
}

/** Квантификатор реляции (как в Prisma): хотя бы один / все / ни один из связанных документов проходит вложенный фильтр. */
export type RelQuantifier = 'some' | 'every' | 'none'

/** Условие по ссылочному полю (одиночному или массиву): фильтр по полям связанного документа (вложенная группа) с квантификатором. `target` — выбранный тип цели (для полиморфной ссылки на несколько типов). */
export type FilterRel = {
  kind: 'rel'
  id: string
  field: string
  target: string
  quantifier: RelQuantifier
  group: FilterGroup
}

/** Узел-группа: объединяет детей через and/or. */
export type FilterGroup = {
  kind: 'group'
  id: string
  op: 'and' | 'or'
  children: FilterNode[]
}

export type FilterNode = FilterGroup | FilterCond | FilterRel

export type SortDir = 'asc' | 'desc'

/** Сортировка: поле (даты документа `createdAt`/`updatedAt` либо ключ поля схемы) и направление; null — по умолчанию (новые сверху). */
export type SortState = { field: string; dir: SortDir } | null

export type ListState = {
  search: string
  filter: FilterGroup
  sort: SortState
}

/** Свежий id узла древа — для React-ключей и адресации при мутациях. randomUUID есть только в защищённом контексте (HTTPS/localhost), при заходе по http-LAN падает, поэтому с запасным вариантом. */
export function nodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

/** Пустая корневая and-группа. */
export function emptyFilter(): FilterGroup {
  return { kind: 'group', id: 'root', op: 'and', children: [] }
}

/** Свежая пустая and-группа с уникальным id — для вложенных групп (под ссылочными условиями). */
export function newGroup(): FilterGroup {
  return { kind: 'group', id: nodeId(), op: 'and', children: [] }
}

/** Новое скалярное условие-плейсхолдер: поле ещё не выбрано. */
export function newCond(): FilterCond {
  return {
    kind: 'cond',
    id: nodeId(),
    field: '',
    not: false,
    op: 'equals',
    value: '',
  }
}

/** По умолчанию сортируем по дате обновления, новые сверху. */
const defaultListState: ListState = {
  search: '',
  filter: emptyFilter(),
  sort: { field: 'updatedAt', dir: 'desc' },
}

/** Атом на пару проект+тип; ключ — `${projectId}:${type}`. atomFamily кэширует инстансы, поэтому одно и то же состояние шарится между панелью и списком. Префикс версии — модель древа фильтров менялась (cond/rel-узлы, квантификаторы), старое состояние несовместимо, поэтому ключ хранилища версионируется. */
const listStateFamily = atomFamily((key: string) =>
  atomWithStorage<ListState>(`jalyk:list:v4:${key}`, defaultListState),
)

/** Состояние списка с immer-сеттером: setState((draft) => { draft.filter... }). */
export function useListState(key: string) {
  const base = listStateFamily(key)
  const immer = useMemo(() => withImmer(base), [base])
  return useAtom(immer)
}

/** Число заданных условий в древе (для бейджа на кнопке фильтров): скалярные с выбранным полем и ссылочные (по вложенным условиям). */
function countLeaves(node: FilterNode): number {
  if (node.kind === 'cond') return node.field === '' ? 0 : 1
  if (node.kind === 'rel') return node.field === '' ? 0 : 1
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0)
}

/** Сколько условий активно сейчас — читается через selectAtom, без перерисовки на смену поиска/сортировки. */
export function useFilterCount(key: string): number {
  const base = listStateFamily(key)
  const countAtom = useMemo(
    () => selectAtom(base, (state) => countLeaves(state.filter)),
    [base],
  )
  return useAtomValue(countAtom)
}
