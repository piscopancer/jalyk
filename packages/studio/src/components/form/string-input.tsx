import { StringField } from '@/form'

export type StringInputProps = {
  id: string
  onChange: (value: string) => void
  field: StringField
}

export default function StringInput(props: StringInputProps) {
  return (
    <input
      //
      type='text'
      placeholder={props.field.placeholder}
      id={props.id}
      onChange={({ target: { value } }) => props.onChange(value)}
      className='border px-4 py-2 rounded-sm border-zinc-700'
    />
  )
}
