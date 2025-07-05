import { ComponentType, SVGProps } from 'react'
import { ClassNameValue, twMerge } from 'tailwind-merge'

export function cn(...classes: ClassNameValue[]): string {
  return twMerge(classes)
}

export type IconComponentType = ComponentType<SVGProps<SVGSVGElement>>
