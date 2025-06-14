import { cn } from '@/utils'
import { type LucideIcon } from 'lucide-react'
import { DropdownMenu as M } from 'radix-ui'
import { PropsWithChildren, ReactNode } from 'react'

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
  action?: () => void
  icon?: LucideIcon
  label?: string
  onSelect?: () => void
}

export function Separator() {
  return <M.Separator className='border-b border-zinc-800 my-1.5' />
}

export function Item(props: ItemProps) {
  return (
    <M.Item asChild onSelect={props.onSelect} className='flex items-center gap-x-3 py-1.5 px-2 rounded-sm'>
      <button>
        {props.icon && <props.icon className='size-5' />}
        <span>{props.label}</span>
      </button>
    </M.Item>
  )
}
