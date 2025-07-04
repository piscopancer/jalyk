import { IconComponentType } from '@/utils'
import { LucideEllipsis } from 'lucide-react'

type FieldToolbarProps = {
  inputElementId: string
  field: {
    name: string
    title?: string
    icon?: IconComponentType
  }
}

export default function FieldToolbar(props: FieldToolbarProps) {
  return (
    <header className='flex items-center'>
      <label htmlFor={props.inputElementId} className='mr-auto flex items-center gap-2'>
        {props.field.icon && <props.field.icon className='size-5' />}
        {props.field.title ?? props.field.name}
      </label>
      <button className='hover:bg-zinc-800 rounded-md size-7 flex items-center justify-center'>
        <LucideEllipsis className='size-5' />
      </button>
    </header>
  )
}
