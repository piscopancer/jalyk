import { cn } from '@/utils'
import { Tooltip as T } from '@base-ui-components/react'
import { ComponentProps, ComponentType } from 'react'

type TooltipProps = {
  content: T.Popup.Props['children']
  children?: ComponentType<ComponentProps<'button'>> | typeof T.Trigger | any
  providerProps?: T.Provider.Props
  rootProps?: T.Root.Props
  contentProps?: Omit<T.Popup.Props, 'content'>
  positionProps?: T.Positioner.Props
}

export function Tooltip({ children, content, rootProps, contentProps, providerProps, positionProps }: TooltipProps) {
  return (
    <T.Provider delay={providerProps?.delay ?? 250}>
      <T.Root open={rootProps?.open} onOpenChange={rootProps?.onOpenChange}>
        <T.Trigger render={<>{children}</>} />
        <T.Portal>
          <T.Positioner sideOffset={positionProps?.sideOffset ?? 4}>
            <T.Popup {...contentProps} className={cn('rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-1 text-sm', contentProps?.className as string)}>
              {content}
            </T.Popup>
          </T.Positioner>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
