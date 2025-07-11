// import { StringField } from '@/form'
// import { trpc } from '@/trpc'
import { useFieldQuery } from '@/field'
import { useProjectQuery } from '@/hooks/use-project-info'
import { StringFieldConfig } from '@/test/shapes'
import { trpc } from '@/trpc'
import { cn } from '@/utils'
import { Menu } from '@repo/ui'
import { LucideChevronsUpDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useMemo } from 'react'
import { funnel } from 'remeda'
import { z } from 'zod/v4'
import { Debug } from '../debug'

type Props = {
  docId: string
  elementId: string | undefined
  fieldName: string
  config: StringFieldConfig
  shape: z.ZodAny
}

export default function StringFieldInput(props: Props) {
  const options = props.config.options
  const { data: project } = useProjectQuery()
  const utils = trpc.useUtils()
  const field = useFieldQuery({
    docId: props.docId,
    fieldPath: props.fieldName,
    shape: props.shape,
  })
  const upsertField = trpc.field.upsert.useMutation()
  const updateFunnel = useMemo(
    () =>
      funnel(
        (value: string) => {
          const res = props.shape.safeParse(value)
          if (res.success) {
            upsertField.mutate({
              value: res.data,
              documentId: props.docId,
              documentType: 'shop',
              path: props.fieldName,
              projectId: project!.id,
            })
          } else {
            console.warn('wrong value type')
          }
        },
        {
          minQuietPeriodMs: 1000,
          reducer(_, value: string) {
            return value
          },
        }
      ),
    [props, project]
  )

  if (options?.predefined) {
    switch (options.predefined.display) {
      case 'dropdown':
        const selectedOption = options.predefined!.options.find((o) => o.value === field.data?.value)
        return (
          <Menu
            contentProps={{
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
                    utils.field.find.setData(
                      {
                        documentId: props.docId,
                        path: props.fieldName,
                      },
                      { value }
                    )
                    updateFunnel.call(value)
                  },
                })
              )
            }
          >
            <DropdownMenu.Trigger className='rounded-md border-zinc-700 hover:bg-zinc-900 border hopper'>
              <div className='self-center justify-self-left py-2 px-4 flex items-center gap-3'>
                {selectedOption?.icon && <selectedOption.icon className='size-4' />}
                <span className={cn(selectedOption?.title || selectedOption?.value ? '' : 'text-zinc-400')}>{selectedOption?.title ?? selectedOption?.value ?? options.placeholder ?? 'Select'}</span>
              </div>
              <LucideChevronsUpDown className='self-center justify-self-end size-4 mr-3 stroke-zinc-400' />
            </DropdownMenu.Trigger>
          </Menu>
        )
      case 'select':
        return
    }
  }

  return (
    <Debug
      value={{
        value: field.data?.value ?? null,
        shape: 'shape' in props,
      }}
    >
      {/* todo: bug: rerenders and current selection restores to the end of line */}
      <input
        //
        key='input'
        type='text'
        placeholder={options?.placeholder}
        id={props.elementId}
        value={typeof field.data?.value === 'string' ? field.data?.value : undefined}
        onChange={({ target: { value } }) => {
          utils.field.find.setData(
            {
              documentId: props.docId,
              path: props.fieldName,
            },
            { value }
          )
          updateFunnel.call(value)
        }}
        className='border px-4 py-2 rounded-md border-zinc-700'
      />
    </Debug>
  )
}

// function StringFieldDropdownInput(props: Props & { config: { options: { predefined: { display: 'dropdown' } } } }) {
//   const utils = trpc.useUtils()

//   return (

//   )
// }
