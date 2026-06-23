import { useAtom, type PrimitiveAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'

// Линейная навигация студии: путь — это стек сегментов (как папки в проводнике),
// на каждом уровне открыт ровно один потомок. Сегменты объявляются статическим
// деревом (definePathSegment) с типизированными переходами open.*, а сам путь
// (список { key, params }) персистится в localStorage по ключу студии. Колонки и
// слои — два разных рендера одного и того же стека. Восстановление идёт по дереву
// определений: неизвестный сегмент в середине обрезает путь до последнего валидного.

/** Сериализуемые параметры экземпляра сегмента — попадают в localStorage. */
export type SegmentParams = Record<string, unknown>

/** Опаковый дескриптор перехода: какой сегмент открыть и с какими params. Создаётся через open.*, потребляется PathSegmentLink/go. */
export type OpenTarget = { key: string; params: SegmentParams }

/** Одно звено сохранённого пути. */
export type PathEntry = { key: string; params: SegmentParams }

/** Гетерогенный сегмент для хранения в дереве/реестре: конкретные Params/Children стираются до any, точные типы живут в выводе ParamsOf на месте использования (тот же приём, что у реестра компонентов). */
export type AnyPathSegment = PathSegment<string, any, any>
type AnySegment = AnyPathSegment

/** Params конкретного дочернего сегмента — для типизации аргумента open.<child>. */
type ParamsOf<S extends AnySegment> =
  S extends PathSegment<string, infer P, AnySegment['children']> ? P : never

/** Карта переходов в объявленных потомков: open.<childKey>(params) → OpenTarget. */
type OpenMap<Children extends Record<string, AnySegment>> = {
  [K in keyof Children & string]: (params: ParamsOf<Children[K]>) => OpenTarget
}

/** Контекст рендера сегмента: его params, типизированные переходы в потомков и операции над стеком. */
export type SegmentRenderContext<
  Params extends SegmentParams,
  Children extends Record<string, AnySegment>,
> = {
  params: Params
  /** Чистые конструкторы переходов в объявленных потомков. */
  open: OpenMap<Children>
  /** Открыть потомка: обрезает стек до текущего уровня и кладёт target сверху. */
  go: (target: OpenTarget) => void
  /** Закрыть этот сегмент и всё, что глубже (например, при удалении документа). */
  close: () => void
  /** Сейчас открытый дочерний сегмент (следующее звено стека) — для подсветки выбора. */
  next: PathEntry | undefined
}

/** Определение сегмента: контент (view) и какие сегменты идут после него (children). */
export type PathSegment<
  Key extends string,
  Params extends SegmentParams,
  Children extends Record<string, AnySegment>,
> = {
  key: Key
  children: Children
  view: (ctx: SegmentRenderContext<Params, Children>) => ReactNode
}

/** Объявить сегмент пути. params-функция (identity) задаёт тип параметров экземпляра, children — допустимые переходы, view рисует контент столбика. */
export function definePathSegment<
  const Key extends string,
  Params extends SegmentParams = Record<string, never>,
  const Children extends Record<string, AnySegment> = Record<string, never>,
>(def: {
  key: Key
  /** Identity-функция, фиксирующая тип params экземпляра (например (p: { docId: string }) => p). */
  params?: (params: Params) => Params
  children?: Children
  view: (
    ctx: SegmentRenderContext<NoInfer<Params>, NoInfer<Children>>,
  ) => ReactNode
}) {
  return {
    key: def.key,
    children: def.children ?? ({} as Children),
    view: def.view,
  } satisfies PathSegment<Key, Params, Children>
}

/** Звено стека после разрешения по дереву определений. */
type ResolvedSegment = { segment: AnySegment; entry: PathEntry }

/** Похоже ли значение на сохранённое звено пути (грубый структурный guard для данных из localStorage). */
function isPathEntry(value: unknown): value is PathEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { key?: unknown }).key === 'string' &&
    typeof (value as { params?: unknown }).params === 'object'
  )
}

/** Разрешить сохранённый путь по дереву определений. Идём от корня; на первом неизвестном/битом звене обрезаем. Пустой результат заменяется корнем. */
function resolvePath(
  root: AnySegment,
  entries: readonly PathEntry[],
): ResolvedSegment[] {
  const out: ResolvedSegment[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    if (!isPathEntry(entry)) break
    if (i === 0) {
      if (entry.key !== root.key) break
      out.push({ segment: root, entry })
      continue
    }
    const child = out[i - 1]!.segment.children[entry.key] as
      | AnySegment
      | undefined
    if (!child) break
    out.push({ segment: child, entry })
  }
  if (out.length === 0) {
    out.push({ segment: root, entry: { key: root.key, params: {} } })
  }
  return out
}

/** Построить карту переходов open.* по объявленным потомкам сегмента. */
function buildOpen(
  segment: AnySegment,
): Record<string, (p: SegmentParams) => OpenTarget> {
  const open: Record<string, (p: SegmentParams) => OpenTarget> = {}
  for (const key of Object.keys(segment.children)) {
    open[key] = (params) => ({ key, params })
  }
  return open
}

type NavValue = { root: AnySegment; pathAtom: PrimitiveAtom<PathEntry[]> }

const NavigationContext = createContext<NavValue | null>(null)

/** Провайдер навигации: создаёт персистентный атом пути на проект+ключ студии. root приходит из <Studio> (дефолтное дерево или переопределённое потребителем). */
export function NavigationProvider({
  projectId,
  navKey = 'default',
  root,
  children,
}: {
  projectId: string
  /** Ключ навигации студии: несколько студий на странице читают разные пути. */
  navKey?: string
  root: AnySegment
  children: ReactNode
}) {
  const pathAtom = useMemo(
    () =>
      atomWithStorage<PathEntry[]>(
        `jalyk:studio:v1:${projectId}:nav:${navKey}`,
        [{ key: root.key, params: {} }],
      ),
    [projectId, navKey, root],
  )
  const value = useMemo<NavValue>(() => ({ root, pathAtom }), [root, pathAtom])
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) {
    throw new Error('useNavStack должен вызываться внутри <NavigationProvider>')
  }
  return ctx
}

type SegmentNav = { go: (target: OpenTarget) => void; close: () => void }

const SegmentNavContext = createContext<SegmentNav | null>(null)

/** Операции навигации текущего сегмента — для PathSegmentLink, вложенного в view на любую глубину. */
export function usePathSegmentNav() {
  const ctx = useContext(SegmentNavContext)
  if (!ctx) {
    throw new Error('PathSegmentLink должен рендериться внутри сегмента пути')
  }
  return ctx
}

/** Кнопка-переход в следующий сегмент. to — результат open.<child>(params). */
export function PathSegmentLink({
  to,
  children,
  className,
}: {
  to: OpenTarget
  children: ReactNode
  className?: string
}) {
  const { go } = usePathSegmentNav()
  return (
    <button type="button" className={className} onClick={() => go(to)}>
      {children}
    </button>
  )
}

/** Разрешённый стек к рендеру: на каждый сегмент — стабильный ключ и готовый узел (view, обёрнутый в контекст переходов своего уровня). */
export function useNavStack() {
  const { root, pathAtom } = useNavigation()
  const [entries, setEntries] = useAtom(pathAtom)
  const resolved = useMemo(() => resolvePath(root, entries), [root, entries])

  // Путь разрешился короче сохранённого — значит звено стало невалидным: фиксируем обрезку в localStorage.
  useEffect(() => {
    if (resolved.length !== entries.length) {
      setEntries(resolved.map((r) => r.entry))
    }
  }, [resolved, entries.length, setEntries])

  return resolved.map((r, depth) => {
    const go = (target: OpenTarget) =>
      setEntries((prev) => [...prev.slice(0, depth + 1), target])
    const close = () => setEntries((prev) => prev.slice(0, depth))
    const ctx: SegmentRenderContext<
      SegmentParams,
      Record<string, AnySegment>
    > = {
      params: r.entry.params,
      open: buildOpen(r.segment),
      go,
      close,
      next: entries[depth + 1],
    }
    return {
      key: `${depth}:${r.entry.key}`,
      node: (
        <SegmentNavContext.Provider value={{ go, close }}>
          {r.segment.view(ctx)}
        </SegmentNavContext.Provider>
      ),
    }
  })
}
