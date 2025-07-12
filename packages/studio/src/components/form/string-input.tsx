// import { StringField } from '@/form'
// import { trpc } from '@/trpc'
import { JalykDocument } from '@/document'
import { useParsedFieldQuery, useUpsertFieldFunnel } from '@/field'
import { StringFieldConfig, StringShape } from '@/test/shapes'
import { cn } from '@/utils'
import { Menu as BaseMenu } from '@base-ui-components/react'
import { Menu } from '@repo/ui'
import { LucideChevronsUpDown } from 'lucide-react'
import { ComponentProps } from 'react'

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

  if (options?.predefined) {
    switch (options.predefined.display) {
      case 'dropdown':
        const selectedOption = options.predefined!.options.find((o) => o.value === fieldQuery.data?.value)
        return (
          <Menu
            positionProps={{
              side: 'top',
              align: 'center',
            }}
            content={(m) =>
              options.predefined!.options.map(({ value, title, icon }) =>
                m.Item({
                  label: title ?? value,
                  icon,
                  selected: selectedOption?.value === value,
                  onSelect() {
                    upsertField(value)
                  },
                })
              )
            }
          >
            <BaseMenu.Trigger className='rounded-md border-zinc-700 hover:bg-zinc-900 border hopper'>
              <div className='self-center justify-self-left py-2 px-4 flex items-center gap-3'>
                {selectedOption?.icon && <selectedOption.icon className='size-4' />}
                <span className={cn(selectedOption?.title || selectedOption?.value ? '' : 'text-zinc-400')}>{selectedOption?.title ?? selectedOption?.value ?? options.placeholder ?? 'Select'}</span>
              </div>
              <LucideChevronsUpDown className='self-center justify-self-end size-4 mr-3 stroke-zinc-400' />
            </BaseMenu.Trigger>
          </Menu>
        )
      case 'select':
        return
    }
  }

  /* todo: bug: rerenders and current selection restores to the end of line */
  return (
    <input
      //
      key='input'
      type='text'
      placeholder={options?.placeholder}
      id={elementId}
      value={typeof fieldQuery.data?.value === 'string' ? fieldQuery.data?.value : undefined}
      onChange={({ target: { value } }) => {
        upsertField(value)
      }}
      className='border px-4 py-2 rounded-md border-zinc-700'
    />
  )
}

// function StringFieldDropdownInput(props: Props & { config: { options: { predefined: { display: 'dropdown' } } } }) {
//   const utils = trpc.useUtils()

//   return (

//   )
// }
