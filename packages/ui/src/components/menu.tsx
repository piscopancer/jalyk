import { cn, IconComponentType } from '@/utils'
import { DropdownMenu as M } from 'radix-ui'
import { PropsWithChildren, ReactNode } from 'react'
import { Separator } from './separator'

export type MenuProps = {
  contentProps?: M.DropdownMenuContentProps
  rootProps?: M.DropdownMenuProps
  content: (menu: { Item: typeof Item; Separator: typeof Separator }) => ReactNode
} & PropsWithChildren

export function Menu({ children, content, contentProps, rootProps }: MenuProps) {
  return (
    <M.Root {...rootProps}>
      {children}
      <M.Portal>
        <M.Content {...contentProps} className={cn('bg-zinc-950 p-2 rounded-xl border border-zinc-800', contentProps?.className)}>
          {content({
            Item,
            Separator,
          })}
        </M.Content>
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
    <M.Item key={props.label} asChild disabled={props.selected} onSelect={props.onSelect} className={cn('flex items-center gap-x-3 py-1.5 px-2 rounded-sm w-full', props.selected ? 'bg-zinc-800' : '')}>
      <button>
        {props.icon && <props.icon className='size-4' />}
        <span>{props.label}</span>
      </button>
    </M.Item>
  )
}
