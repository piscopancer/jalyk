import { cn } from '@/utils'
import { Tooltip as T } from 'radix-ui'

type TooltipProps = {
  content: React.ReactNode
  children?: React.ReactNode
  providerProps?: T.TooltipProviderProps
  rootProps?: T.TooltipProps
  contentProps?: Omit<T.TooltipContentProps, 'content'>
}

export function Tooltip({ children, content, rootProps, contentProps, providerProps }: TooltipProps) {
  return (
    <T.Provider delayDuration={providerProps?.delayDuration ?? 250}>
      <T.Root open={rootProps?.open} onOpenChange={rootProps?.onOpenChange}>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content {...contentProps} sideOffset={contentProps?.sideOffset ?? 4} className={cn('rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-1 text-sm', contentProps?.className)}>
            {content}
            {/* <T.Arrow asChild>
              <LucideChevronDown width={24} height={24} viewBox={'0 0 24 24'} className='size-4 scale-200 stroke-zinc-800' />
            </T.Arrow> */}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
