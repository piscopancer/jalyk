import { ComponentProps, ComponentType, SVGProps } from 'react'

type ButtonProps = {
  IconLeft?: ComponentType<SVGProps<SVGSVGElement>>
}

export function Button({ IconLeft, children, ...attrs }: ButtonProps & ComponentProps<'button'>) {
  return (
    <button {...attrs}>
      {IconLeft && <IconLeft />}
      {children}
    </button>
  )
}
