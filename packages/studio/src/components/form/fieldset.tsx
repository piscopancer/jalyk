import { FieldUpdateRequest } from '@repo/shared'
import { useId } from 'react'
import { defaultInputs } from '.'
import { Field } from '../../config'
import FieldToolbar from './field-toolbar'

export default function Fieldset(props: { documentId: string; field: Field }) {
  const Input = defaultInputs[props.field.type]
  const id = useId()
  return (
    <fieldset className='flex flex-col gap-1'>
      <FieldToolbar inputId={id} field={props.field} />
      <Input
        field={props.field as never}
        id={id}
        // todo: move onchange must appear in the input itself, not here
        onChange={(v) => {
          console.log(props, v)
          fetch('http://localhost:1488/field/update', {
            method: 'post',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              path: ['la', props.documentId, props.field.name],
              value: v,
            } satisfies FieldUpdateRequest),
          })
        }}
      />
    </fieldset>
  )
}
