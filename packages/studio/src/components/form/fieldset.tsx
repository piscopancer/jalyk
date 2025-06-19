import useStudioCtx from '@/hooks/use-project-ctx'
import { useId } from 'react'
import { fieldInputs } from '.'
import { Field } from '../../config'
import FieldToolbar from './field-toolbar'

export default function Fieldset(props: { documentId: string; field: Field }) {
  const Input = fieldInputs[props.field.type]
  const id = useId()
  const { projectId } = useStudioCtx()

  return (
    <fieldset className='flex flex-col gap-1'>
      <FieldToolbar inputId={id} field={props.field} />
      <Input
        field={props.field as never}
        id={id}
        // todo: move onchange must appear in the input itself, not here
      />
    </fieldset>
  )
}
