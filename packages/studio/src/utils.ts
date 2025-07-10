import { ComponentType, SVGProps } from 'react'
import { ClassNameValue, twMerge } from 'tailwind-merge'

export function cn(...classes: ClassNameValue[]): string {
  return twMerge(classes)
}

export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function objectEntries<O extends object>(obj: O) {
  return Object.entries(obj) as [keyof O, O[keyof O]][]
}

export type SvgComponentType = ComponentType<SVGProps<SVGSVGElement>>
