import { ComponentProps, ComponentType, SVGProps } from 'react'

type ButtonProps = {
  IconLeft?: ComponentType<SVGProps<SVGSVGElement>>
}

export function Button({ IconLeft, children, ...attrs }: ButtonProps & ComponentProps<'button'>) {
  return (
    <button {...attrs} className='bg-rose-300'>
      {IconLeft && <IconLeft />}
      {children}
    </button>
  )
}
