import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Слияние tailwind-классов: clsx собирает условные классы, twMerge снимает
// конфликты (последний выигрывает). Общая утилита для web и studio.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
