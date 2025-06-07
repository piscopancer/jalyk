export type StringInputProps = {
  id: string
  onChange: (value: string) => void
}

export default function StringInput(props: StringInputProps) {
  return (
    <input
      type='text'
      // name=''
      id={props.id}
      onChange={({ target: { value } }) => props.onChange(value)}
      className='border px-4 py-2 rounded-sm'
    />
  )
}
