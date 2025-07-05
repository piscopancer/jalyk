// import { StringField } from '@/form'
// import { trpc } from '@/trpc'
import { useProjectInfo } from '@/hooks/use-project-info'
import { StringFieldConfig } from '@/test/shapes'
import { trpc } from '@/trpc'
import { Menu } from '@repo/ui'
import { getQueryKey } from '@trpc/react-query'
import { LucideChevronsUpDown } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { funnel } from 'remeda'
import { JsonValue } from 'type-fest'
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
  const { data: project } = useProjectInfo()
  // const utils = trpc.useUtils();
  // utils.field.find.setData({
  //     documentId: props.docId,
  //     path: props.fieldName,
  //   }, {value: 123})
  const field = trpc.field.find.useQuery(
    {
      documentId: props.docId,
      path: props.fieldName,
    },
    {
      select(data) {
        if (data) {
          const res = props.shape.safeParse(data.value)
          if (res.success) {
            return {
              value: res.data as JsonValue,
            }
          } else {
            return {
              value: data.value,
              errors: res.error.issues.map((i) => i.message),
            }
          }
        }
      },
    }
  )
  const upsertField = trpc.field.upsert.useMutation({})

  const changeFunnel = funnel(
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
        //
      }
    },
    {
      minQuietPeriodMs: 1000,
      reducer(_, value: string) {
        return value
      },
    }
  )

  if (options?.predefined) {
    switch (options.predefined.display) {
      case 'dropdown':
        return <StringFieldDropdownInput {...props} />
      case 'select':
        return
    }
  }

  return (
    <Debug
      value={{
        value: field.data?.value ?? null,
        shape: 'shape' in props,
        key:
          getQueryKey(trpc.field.find, {
            documentId: props.docId,
            path: props.fieldName,
          }) ?? null,
      }}
    >
      <input
        //
        type='text'
        placeholder={options?.placeholder}
        id={props.elementId}
        value={typeof field.data?.value === 'string' ? field.data?.value : undefined}
        onChange={({ target: { value } }) => changeFunnel.call(value)}
        className='border px-4 py-2 rounded-md border-zinc-700'
      />
    </Debug>
  )
}

function StringFieldDropdownInput(props: Props & { config: { options: { predefined: { display: 'dropdown' } } } }) {
  return (
    <Menu
      contentProps={{
        className: 'w-full',
        side: 'top',
      }}
      content={(m) =>
        props.config.options.predefined.options.map(({ value, title, icon }) =>
          m.Item({
            label: title ?? value,
            icon,
            action() {
              console.log()
            },
          })
        )
      }
    >
      <DropdownMenu.Trigger className='rounded-md border-zinc-700 hover:bg-zinc-900 border hopper'>
        <span className='place-self-center py-2 px-4'>123</span>
        <LucideChevronsUpDown className='self-center justify-self-end size-4 mr-3 stroke-zinc-400' />
      </DropdownMenu.Trigger>
    </Menu>
  )
}
