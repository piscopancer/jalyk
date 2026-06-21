import type { ErasedComponent, FieldIcon } from './field.ts'

// Мета проекта и тулбар студии. Как и всё в схеме, описание React-агностично:
// иконка — FieldIcon (unknown), компоненты стёрты до ErasedComponent, а студия
// дорисовывает их через свой мост (asIcon/asComponent). Бейдж разведён на данные
// (имя + иконка, дефолты живут в конфиге) и компонент (полная замена рендера),
// ровно как заголовок и превью у полей.

/** Данные бейджа проекта: имя и иконка. Дефолты берутся отсюда (project в конфиге), их можно переопределить. */
export type ProjectBadgeData = {
  name?: string
  icon?: FieldIcon
}

/** Пропсы компонента бейджа: уже вычисленные имя и узел иконки (Node со стороны студии — ReactNode). */
export type ProjectBadgeComponentProps<Node = unknown> = {
  name: string
  icon: Node
}

/** Компонент бейджа проекта. Возврат намеренно широкий — схема без React. */
export type ProjectBadgeComponent<Node = unknown> = (
  props: ProjectBadgeComponentProps<Node>,
) => unknown

/** Мета проекта в конфиге: дефолтные имя и иконка бейджа плюс необязательная полная замена его рендера. */
export type ProjectConfig = {
  name?: string
  icon?: FieldIcon
  /** Полная замена компонента бейджа (см. defineProjectBadgeComponent). */
  badgeComponent?: ErasedComponent
}

/** Значения бейджа проекта (имя/иконка) для поля `project` конфига. Сохраняет литералы. */
export function defineProjectBadge<const D extends ProjectConfig>(
  config: D,
): D {
  return config
}

/** Кастомный компонент бейджа проекта — кладётся в `project.badgeComponent`. Переопределяет рендер, тогда как defineProjectBadge переопределяет значения. */
export function defineProjectBadgeComponent<Node>(
  component: ProjectBadgeComponent<Node>,
): ProjectBadgeComponent<Node> {
  return component
}

/** Элемент пользовательского слота тулбара: ключ (для React) и компонент. Компонент стёрт до ErasedComponent — как previewComponent у полей, поэтому сюда присваивается любой React-компонент без приведения. */
export type ToolbarItem = {
  key: string
  component: ErasedComponent
}

/** Список элементов слота тулбара. */
export type ToolbarItems = readonly ToolbarItem[]

/** Список кастомных компонентов для слота тулбара студии. Сохраняет литералы ключей. */
export function defineToolbar<const T extends ToolbarItems>(items: T): T {
  return items
}
