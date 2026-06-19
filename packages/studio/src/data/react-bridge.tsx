import type { HeaderComponentProps, PreviewComponentProps } from '@jalyk/schema'
import type { ComponentType, ReactNode } from 'react'

// Единственная граница между React-агностичной схемой и React-студией. Схема
// типизирует иконки и компоненты заголовка/превью намеренно широко (FieldIcon =
// unknown, возврат компонентов — unknown), потому что не зависит от React.
// Структурно проверить в рантайме «это React-компонент» нельзя, поэтому здесь
// собраны сознательные приведения на этой границе; вся остальная студия берёт
// иконки и компоненты только отсюда и потому обходится без приведений.

/** Иконка студии — React-компонент с className/size, как у иконок lucide. */
export type IconComponent = ComponentType<{ className?: string; size?: number | string }>

/** Пропсы превью со стороны студии: «узлы» рендера — это ReactNode. */
export type PreviewProps<Draft = unknown, Preview = unknown> = PreviewComponentProps<Preview, Draft, ReactNode>

/** Пропсы заголовка поля со стороны студии. */
export type HeaderProps<Data = unknown> = HeaderComponentProps<Data>

/**
 * Приводит иконку из схемы (FieldIcon = unknown) к React-компоненту. Компонент —
 * это функция либо объект (forwardRef/memo, как у иконок lucide), поэтому
 * принимаем оба; приведение к IconComponent — сознательное, на границе со схемой.
 */
export function asIcon(icon: unknown): IconComponent | undefined {
  return typeof icon === 'function' || (typeof icon === 'object' && icon !== null)
    ? (icon as IconComponent)
    : undefined
}

/**
 * Приводит компонент заголовка/превью из схемы (рантайм-стёртый тип, возврат
 * unknown) к React-компоненту студии с пропсами P. Приведение сознательное — на
 * границе со схемой, см. шапку файла.
 */
export function asComponent<P>(component: unknown): ((props: P) => ReactNode) | undefined {
  return typeof component === 'function' ? (component as (props: P) => ReactNode) : undefined
}
