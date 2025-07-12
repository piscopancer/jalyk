import { cn, IconComponentType } from '@/utils'
import { Menu as M } from '@base-ui-components/react'
import { PropsWithChildren, ReactNode } from 'react'
import { Separator } from './separator'

export type MenuProps = {
  popupProps?: M.Popup.Props
  rootProps?: M.Root.Props
  positionProps?: M.Positioner.Props
  content: (menu: { Item: typeof Item; Separator: typeof Separator }) => ReactNode
} & PropsWithChildren

export function Menu({ children, content, popupProps, positionProps, rootProps }: MenuProps) {
  return (
    <M.Root {...rootProps}>
      {children}
      <M.Portal>
        <M.Positioner {...positionProps}>
          <M.Popup {...popupProps} className={cn('bg-zinc-950 p-2 rounded-xl border border-zinc-800', popupProps?.className as string)}>
            {content({
              Item,
              Separator,
            })}
          </M.Popup>
        </M.Positioner>
      </M.Portal>
    </M.Root>
  )
}

export type ItemProps = {
  icon?: IconComponentType
  label?: string
  onSelect?: () => void
  selected?: boolean
}

export function Item(props: ItemProps) {
  return (
    <M.Item
      key={props.label}
      disabled={props.selected}
      onSelect={props.onSelect}
      className={cn('flex items-center gap-x-3 py-1.5 px-2 rounded-sm w-full', props.selected ? 'bg-zinc-800' : '')}
      render={
        <button>
          {props.icon && <props.icon className='size-4' />}
          <span>{props.label}</span>
        </button>
      }
    />
  )
}
