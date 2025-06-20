import { StringField } from '@/form'
import { trpc } from '@/trpc'

export type StringInputProps = {
  id: string
  onChange: (value: string) => void
  field: StringField
}

export default function StringInput(props: StringInputProps) {
  const utils = trpc.field()

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
