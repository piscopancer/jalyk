import { JalykDocument } from '@/document'
import { useParsedFieldQuery, useUpsertFieldFunnel } from '@/field'
import { UsePreview, useUserPreview1 } from '@/preview'
import { ReferenceFieldConfig, ReferenceShape } from '@/test/shapes'
import { trpc } from '@/trpc'
import { cn, literalSwitch } from '@/utils'
import { Menu as BaseMenu } from '@base-ui-components/react'
import { LucideCar, LucideEllipsisVertical, LucideSearch, LucideX } from 'lucide-react'
import { ComponentProps, useRef } from 'react'
import IconButton from '../icon-button'
import PreviewBase from '../preview'

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

  if (fieldQuery.data?.errors) {
    return JSON.stringify(fieldQuery.data.errors, null, 2)
  }

  const { upsertField } = useUpsertFieldFunnel(document, field)

  return (
    <article {...attr} ref={selfRef} className={cn('flex items-center border rounded-lg border-zinc-800 gap-1', attr.className)}>
      {fieldQuery.isSuccess && <Preview documentId={fieldQuery.data?.value?._ref} usePreview={useUserPreview1} />}
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
                        <Preview documentId={doc.id} usePreview={useUserPreview1} />
                      </BaseMenu.Trigger>
                    </li>
                  ))}
                </ul>
              </BaseMenu.Popup>
            </BaseMenu.Positioner>
          </BaseMenu.Portal>
        </BaseMenu.Root>
        <IconButton Icon={LucideX} size={field.config.options.size} onClick={() => upsertField(null)} />
        <IconButton Icon={LucideEllipsisVertical} size={field.config.options.size} />
      </menu>
    </article>
  )
}

function Preview(props: { documentId?: string; usePreview: UsePreview }) {
  const preview = props.documentId ? props.usePreview(props.documentId) : undefined

  return (
    <PreviewBase
      preview={{
        title: preview?.title ?? props.documentId ?? 'no document :(',
        subtitle: preview?.subtitle,
        media: {
          type: 'icon',
          icon: LucideCar,
        },
      }}
      className='flex-1'
    />
  )
}
