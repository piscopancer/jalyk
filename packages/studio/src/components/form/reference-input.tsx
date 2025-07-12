import { useParsedFieldQuery } from '@/field'
import { ReferenceFieldConfig } from '@/test/shapes'
import { cn, literalSwitch, SvgComponentType } from '@/utils'
import { Menu as BaseMenu } from '@base-ui-components/react'
import { LucideCar, LucideEllipsisVertical, LucideSearch, LucideX } from 'lucide-react'
import { ComponentProps, useRef } from 'react'
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
  /*
  unused yet
  it will only every be errors or a value of {_ref:string}, so it order to display a preview, another trpc must be used - specifically for previews
  */
  const field = useParsedFieldQuery({
    documentId: reference.docId,
    path: reference.fieldPath,
    shape: reference.shape,
  })
  const selfRef = useRef(null!)

  return (
    <article {...attr} ref={selfRef} className={cn('flex items-center border w-fit rounded-lg border-zinc-800 bg-lines-normal gap-1', attr.className)}>
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
      <menu
        className={cn(
          'flex items-center',
          literalSwitch(reference.config.options.size, {
            default: () => 'mr-2.5',
            sm: () => 'mr-1',
          })
        )}
      >
        <BaseMenu.Root>
          <BaseMenu.Trigger render={<IconButton Icon={LucideSearch} size={reference.config.options.size} />} />
          <BaseMenu.Portal>
            <BaseMenu.Positioner anchor={selfRef} align='start' sideOffset={4}>
              <BaseMenu.Popup className='rounded-md border border-zinc-800'>
                <div className='border-b border-zinc-800 p-2'>
                  <div className='hopper bg-zinc-900 rounded-md'>
                    <LucideSearch className='size-5 self-center ml-2 stroke-zinc-500' />
                    <input placeholder='Start typing...' className='py-2 pl-9 placeholder:text-zinc-500 rounded-[inherit]' />
                  </div>
                </div>
                <ul>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i}>
                      <button className='w-full'>
                        <Preview preview={{ title: 'Sos', subtitle: '123 1313 213', media: { type: 'icon', icon: LucideCar } }} />
                      </button>
                    </li>
                  ))}
                </ul>
              </BaseMenu.Popup>
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.Root>
        <IconButton Icon={LucideX} size={reference.config.options.size} />
        <IconButton Icon={LucideEllipsisVertical} size={reference.config.options.size} />
      </menu>
    </article>
  )
}

function IconButton({
  iconProps,
  Icon,
  size = 'default',
  ...attr
}: {
  //
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
          default: () => 'p-2',
          sm: () => 'p-1',
        }),
        attr?.className
      )}
    >
      <Icon className={cn('size-5', iconProps?.className)} />
    </button>
  )
}
