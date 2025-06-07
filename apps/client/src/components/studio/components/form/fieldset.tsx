import { Field } from '@/config'
import { useId } from 'react'
import { defaultInputs } from '.'
import FieldToolbar from './field-toolbar'

export default function Fieldset(props: { field: Field }) {
  const Input = defaultInputs[props.field.type]
  const id = useId()
  return (
    <fieldset className='flex flex-col gap-1'>
      <FieldToolbar inputId={id} field={props.field} />
      <Input id={id} onChange={(v) => console.log(v)} />
    </fieldset>
  )
}
