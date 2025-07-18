import { JalykDocument } from '@/document'
import { useParsedFieldQuery, useUpsertFieldFunnel } from '@/field'
import { StringFieldConfig, StringShape } from '@/structure'
import { cn } from '@/utils'
import { Menu } from '@base-ui-components/react'
import { LucideChevronsUpDown } from 'lucide-react'
import { ComponentProps } from 'react'
import { conditional, pipe } from 'remeda'
import { TiptapEditor } from './tiptap/editor'

type Props = {
  document: JalykDocument
  elementId: string | undefined
  field: {
    path: string
    config: StringFieldConfig
    shape: StringShape
  }
} & ComponentProps<'div'>

export default function StringFieldInput({ document, elementId, field, ...attr }: Props) {
  const options = field.config.options
  const fieldQuery = useParsedFieldQuery({
    documentId: document.id,
    path: field.path,
    shape: field.shape,
  })
  const { upsertField } = useUpsertFieldFunnel(document, field)

  function DefaultInput() {
    /* todo: bug: rerenders and current selection restores to the end of line */
    return (
      <input
        key='input'
        type='text'
        placeholder={options?.placeholder}
        id={elementId}
        value={typeof fieldQuery.data?.value === 'string' ? fieldQuery.data?.value : undefined}
        onChange={({ target: { value } }) => {
          upsertField(value)
        }}
        className='border px-4 py-2 rounded-md border-zinc-800 bg-zinc-925 focus-visible:bg-zinc-900 hover:border-zinc-700'
      />
    )
  }

  if (!options || !options.input) {
    return <DefaultInput />
  }

  return pipe(
    options.input,
    conditional(
      [(i) => typeof i === 'function', (I) => <I todo={true} />],
      [(i) => typeof i === 'object' && i.type === 'default', () => <DefaultInput />],
      [
        (i) => typeof i === 'object' && i.type === 'dropdown',
        ({ predefined }) => {
          const selected = predefined.find((o) => o.value === fieldQuery.data?.value)
          return (
            <Menu.Root>
              <Menu.Trigger className='rounded-md border-zinc-800 hover:border-zinc-700 border hopper bg-zinc-925'>
                <div className='self-center justify-self-left py-2 px-4 flex items-center gap-3'>
                  {selected?.icon && <selected.icon className='size-4' />}
                  <span className={cn(selected?.title || selected?.value ? '' : 'text-zinc-400')}>
                    {selected?.title ?? selected?.value ?? options.placeholder ?? 'Select'}
                  </span>
                </div>
                <LucideChevronsUpDown className='self-center justify-self-end size-4 mr-3 stroke-zinc-400' />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side='top' align='center'>
                  <Menu.Popup>
                    {predefined.map((p) => (
                      <Menu.Item
                        key={p.value}
                        closeOnClick
                        disabled={!!selected}
                        onMouseDown={() => {
                          upsertField(p.value)
                        }}
                        className={cn(
                          'flex items-center gap-x-3 py-1.5 px-2 rounded-sm w-full',
                          selected ? 'bg-zinc-800' : ''
                        )}
                      >
                        {p.icon && <p.icon className='size-4' />}
                        <span>{p.title}</span>
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          )
        },
      ],
      [
        (i) => typeof i === 'object' && i.type === 'multiline',
        ({ minLines, maxLines }) => {
          return (
            <textarea
              placeholder={options.placeholder}
              onChange={({ target: { value } }) => {
                upsertField(value)
              }}
              className='field-sizing-content p-4 rounded-md border border-zinc-800 hover:border-zinc-700'
            />
          )
        },
      ],
      [
        (i) => typeof i === 'object' && i.type === 'editor',
        () => {
          return <TiptapEditor />
        },
      ]
    )
  )
}
