export type NumberInputProps = {
  id: string
  onChange: (value: number) => void
}

export default function NumberInput(props: NumberInputProps) {
  return (
    <input
      id={props.id}
      type='number'
      // name=''
      onChange={({ target: { value } }) => {
        const num = Number(value)
        if (isNaN(num)) return
        props.onChange(num)
      }}
      className='border px-4 py-2 rounded-sm'
    />
  )
}
