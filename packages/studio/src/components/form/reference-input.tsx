import { useFieldQuery } from '@/field'
import { ReferenceFieldConfig } from '@/test/shapes'
import { cn, literalSwitch, SvgComponentType } from '@/utils'
import { LucideEllipsisVertical, LucideSearch, LucideX } from 'lucide-react'
import { ComponentProps } from 'react'
import { z } from 'zod/v4'
import Preview from '../preview'

type Props = {
  reference: {
    docId: string
    elementId: string | undefined
    fieldPath: string
    config: ReferenceFieldConfig
    shape: z.ZodAny
  }
} & ComponentProps<'article'>

export default function ReferenceFieldInput({ reference, ...attr }: Props) {
  // unused yet
  const field = useFieldQuery({
    docId: reference.docId,
    fieldPath: reference.fieldPath,
    shape: reference.shape,
  })

  return (
    <article {...attr} className={cn('flex items-center', attr.className)}>
      <Preview
        preview={{
          title: 'Inna Buzan',
          subtitle: 'Hot chick',
          size: reference.config.options.size,
          media: {
            type: 'image',
            url: 'https://i.pinimg.com/1200x/c3/23/4c/c3234c1e8ca2092412328456bc600e49.jpg',
          },
        }}
      />
      <menu className='flex items-center'>
        <IconButton Icon={LucideSearch} size={reference.config.options.size} />
        <IconButton Icon={LucideX} size={reference.config.options.size} />
        <IconButton Icon={LucideEllipsisVertical} size={reference.config.options.size} />
      </menu>
    </article>
  )
}

function IconButton({
  buttonProps,
  iconProps,
  Icon,
  size = 'default',
}: {
  //
  Icon: SvgComponentType
  size?: 'default' | 'sm'
  buttonProps?: ComponentProps<'button'>
  iconProps?: ComponentProps<'svg'>
}) {
  return (
    <button
      {...buttonProps}
      className={cn(
        'rounded-md hover:bg-zinc-800',
        literalSwitch(size, {
          default: () => 'p-2',
          sm: () => 'p-1',
        }),
        buttonProps?.className
      )}
    >
      <Icon className={cn('size-5', iconProps?.className)} />
    </button>
  )
}
