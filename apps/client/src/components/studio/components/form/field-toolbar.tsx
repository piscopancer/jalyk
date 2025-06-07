import { Field } from '@/config'
import { LucideEllipsis } from 'lucide-react'

type FieldToolbarProps = {
  inputId: string
  field: Field
}

export default function FieldToolbar(props: FieldToolbarProps) {
  return (
    <header className='flex items-center'>
      <label htmlFor={props.inputId} className='mr-auto'>
        {props.field.name}
      </label>
      <button>
        <LucideEllipsis />
      </button>
    </header>
  )
}
