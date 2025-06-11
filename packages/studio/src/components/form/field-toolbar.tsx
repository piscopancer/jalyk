import { LucideEllipsis } from 'lucide-react'
import { Field } from '../../config'

type FieldToolbarProps = {
  inputId: string
  field: Field
}

export default function FieldToolbar(props: FieldToolbarProps) {
  return (
    <header className='flex items-center'>
      <label htmlFor={props.inputId} className='mr-auto'>
        {props.field.title ?? props.field.name}
      </label>
      <button className='hover:bg-zinc-800 rounded-md size-7 flex items-center justify-center'>
        <LucideEllipsis className='size-5' />
      </button>
    </header>
  )
}
