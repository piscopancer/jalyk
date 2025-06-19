import { ClassNameValue, twMerge } from 'tailwind-merge'

export function cn(...classes: ClassNameValue[]): string {
  return twMerge(classes)
}
