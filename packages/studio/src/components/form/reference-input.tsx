import { JalykDocument } from '@/document'
import { useParsedFieldQuery, useUpsertFieldFunnel } from '@/field'
import { useUserPreview1 } from '@/preview'
import { ReferenceFieldConfig, ReferenceShape } from '@/test/shapes'
import { trpc } from '@/trpc'
import { cn, literalSwitch } from '@/utils'
import { Menu as BaseMenu } from '@base-ui-components/react'
import { LucideEllipsis, LucideSearch, LucideX } from 'lucide-react'
import { ComponentProps, useRef } from 'react'
import IconButton from '../icon-button'
import { Preview } from '../preview'

type Props = {
  document: JalykDocument
  elementId: string | undefined
  field: {
    path: string
    config: ReferenceFieldConfig
    shape: ReferenceShape
  }
} & ComponentProps<'article'>

export default function ReferenceFieldInput({ field, document, elementId, ...attr }: Props) {
  const fieldQuery = useParsedFieldQuery({
    documentId: document.id,
    path: field.path,
    shape: field.shape,
  })
  const selfRef = useRef(null!)
  const documentsQuery = trpc.document.idsOfType.useQuery({ type: 'user' })
  const { upsertField } = useUpsertFieldFunnel(document, field)

  if (fieldQuery.data?.errors) {
    return JSON.stringify(fieldQuery.data.errors, null, 2)
  }

  return (
    <article {...attr} ref={selfRef} className={cn('flex items-center border rounded-md border-zinc-800 hover:border-zinc-700 gap-1 bg-zinc-925', attr.className)}>
      {fieldQuery.isSuccess && (
        <Preview
          document={{
            id: fieldQuery.data?.value?._ref,
          }}
          usePreview={useUserPreview1}
          size={field.config.options.size}
        />
      )}
      <menu
        className={cn(
          'flex items-center',
          literalSwitch(field.config.options.size, {
            default: () => 'mr-2.5',
            sm: () => 'mr-1',
          })
        )}
      >
        <BaseMenu.Root>
          <BaseMenu.Trigger render={<IconButton Icon={LucideSearch} size={field.config.options.size} />} />
          <BaseMenu.Portal>
            <BaseMenu.Positioner anchor={selfRef} align='start' sideOffset={4}>
              <BaseMenu.Popup className='rounded-md border border-zinc-800 bg-zinc-950'>
                <div className='border-b border-zinc-800 p-2'>
                  <div className='hopper bg-zinc-900 rounded-md'>
                    <LucideSearch className='size-5 self-center ml-2 stroke-zinc-500' />
                    <input placeholder='Start typing...' className='py-2 pl-9 placeholder:text-zinc-500 rounded-[inherit]' />
                  </div>
                </div>
                <ul>
                  {documentsQuery.data?.map((doc) => (
                    <li key={doc.id}>
                      <BaseMenu.Trigger
                        onMouseDown={() => {
                          upsertField({ _ref: doc.id })
                        }}
                        className='w-full'
                      >
                        <Preview document={doc} usePreview={useUserPreview1} size={field.config.options.size} />
                      </BaseMenu.Trigger>
                    </li>
                  ))}
                </ul>
              </BaseMenu.Popup>
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.Root>
        <IconButton Icon={LucideX} size={field.config.options.size} onClick={() => upsertField(null)} />
        <IconButton Icon={LucideEllipsis} size={field.config.options.size} />
      </menu>
    </article>
  )
}
