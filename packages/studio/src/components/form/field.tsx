import { FieldDefinition } from '@/form'
import useStudioCtx from '@/hooks/use-project-ctx'
import { trpc } from '@/trpc'
import { fieldInputs } from '.'

export function Field(props: { fieldId: string; documentId: string; field: FieldDefinition; inputProps?: { id?: string } }) {
  // const Input = fieldInputs[props.field.type]
  const Input = fieldInputs['string']
  const { projectId } = useStudioCtx()
  const fieldUpsertMutation = trpc.field.upsert.useMutation()

  return (
    <Input
      id={props.fieldId}
      field={}
      onChange={async (v) => {
        console.log(props, v)
        // TODO change to trpc
        // fetch('http://localhost:1488/field/update', {
        //   method: 'post',
        //   headers: {
        //     'content-type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     path: ['la', props.documentId, props.field.name],
        //     value: v,
        //   } satisfies FieldUpdateRequest),
        // })
        const upsertion = await fieldUpsertMutation.mutateAsync({
          location: {
            projectId,
            documentId: props.documentId,
            fieldName: props.field.name,
            // todo: where should i take this path?
            path: undefined,
          },
          value: v,
        })
      }}
    />
  )
}
