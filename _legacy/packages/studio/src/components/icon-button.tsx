import { cn, literalSwitch, SvgComponentType } from '@/utils'
import { ComponentProps } from 'react'

export default function IconButton({
  iconProps,
  Icon,
  size = 'default',
  ...attr
}: {
  Icon: SvgComponentType
  size?: 'default' | 'sm'
  iconProps?: ComponentProps<'svg'>
} & ComponentProps<'button'>) {
  return (
    <button
      {...attr}
      className={cn(
        'rounded-md hover:bg-zinc-800',
        literalSwitch(size, {
          default: () => 'p-1.5',
          sm: () => 'p-1',
        }),
        attr?.className
      )}
    >
      <Icon className={cn('size-5', iconProps?.className)} />
    </button>
  )
}
