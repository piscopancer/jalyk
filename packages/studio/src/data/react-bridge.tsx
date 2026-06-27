import type { HeaderComponentProps, PreviewComponentProps } from '@jalyk/schema'
import type { ComponentType, ReactNode } from 'react'

// Единственная граница между React-агностичной схемой и React-студией. Схема типизирует иконки и компоненты заголовка/превью намеренно широко (FieldIcon = unknown, возврат компонентов — unknown), потому что не зависит от React. Структурно проверить в рантайме «это React-компонент» нельзя, поэтому здесь собраны сознательные приведения на этой границе; вся остальная студия берёт иконки и компоненты только отсюда и потому обходится без приведений.

/** Иконка студии — React-компонент с className/size, как у иконок lucide. */
export type IconComponent = ComponentType<{
  className?: string
  size?: number | string
}>

/** Пропсы превью со стороны студии: «узлы» рендера — это ReactNode. */
export type PreviewProps<
  Draft = unknown,
  Preview = unknown,
> = PreviewComponentProps<Preview, Draft, ReactNode>

/** Пропсы заголовка поля со стороны студии. */
export type HeaderProps<Data = unknown> = HeaderComponentProps<Data>

/** Приводит иконку из схемы (FieldIcon = unknown) к React-компоненту. Компонент — это функция либо объект (forwardRef/memo, как у иконок lucide), поэтому принимаем оба; приведение к IconComponent — сознательное, на границе со схемой. */
export function asIcon(icon: unknown): IconComponent | undefined {
  return typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null)
    ? (icon as IconComponent)
    : undefined
}

/** Приводит компонент заголовка/превью из схемы (рантайм-стёртый тип, возврат unknown) к React-компоненту студии с пропсами P. Приведение сознательное — на границе со схемой, см. шапку файла. */
export function asComponent<P>(
  component: unknown,
): ((props: P) => ReactNode) | undefined {
  return typeof component === 'function'
    ? (component as (props: P) => ReactNode)
    : undefined
}

/**
 * Тонкий слот: рендерит переданный компонент как обычный JSX. Динамический
 * компонент из конфига (иконка, заголовок, превью, бейдж) приходит сюда готовым
 * пропом `as`, поэтому правило react-hooks/static-components — оно запрещает
 * рендерить компонент, выведенный внутри текущего рендера, — не срабатывает: на
 * месте использования остаётся идиоматичный JSX, без createElement.
 */
export function Slot<P extends object>({
  as: Component,
  props,
}: {
  as: ComponentType<P>
  props: P
}): ReactNode {
  return <Component {...props} />
}

/** Иконка студии из конфига (FieldIcon = unknown) с необязательным фолбэком, отрисованная обычным JSX. Если ни иконки, ни фолбэка нет — ничего не рисует. */
export function DynamicIcon({
  icon,
  fallback,
  className,
}: {
  icon: unknown
  fallback?: IconComponent
  className?: string
}): ReactNode {
  const resolved = asIcon(icon) ?? fallback
  return resolved ? <Slot as={resolved} props={{ className }} /> : null
}

/** Динамический компонент студии из конфига (заголовок/превью/бейдж) с пропами P и необязательным фолбэком, отрисованный обычным JSX. */
export function Dynamic<P extends object>({
  component,
  fallback,
  props,
}: {
  component: unknown
  fallback?: ComponentType<P>
  props: P
}): ReactNode {
  const resolved =
    (asComponent<P>(component) as ComponentType<P> | undefined) ?? fallback
  return resolved ? <Slot as={resolved} props={props} /> : null
}
