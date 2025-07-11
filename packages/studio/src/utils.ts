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

type ReplaceNullableWithUnderscore<T> = T extends undefined | null ? '_' : T

export function keySwitch<
  //
  O extends Record<string, unknown>,
  D extends keyof O,
  S extends {
    [DV in ReplaceNullableWithUnderscore<O[D]> & string]: O[D] extends undefined | null
      ? //
        () => unknown
      : (value: O & { [Key in D]: DV }) => unknown
  },
>(
  //
  obj: O,
  discriminator: D,
  switcher: S
): ReturnType<S[keyof S]> {
  const dv = obj[discriminator] as O[D] | null
  return switcher[dv ?? '_'](obj as any) as ReturnType<S[keyof S]>
}

// type IsFunction<T> = T extends (...args: any) => any ? T : never

export function literalSwitch<
  //
  L extends string | null | undefined,
  S extends { [LV in ReplaceNullableWithUnderscore<L>]: () => unknown },
>(literal: L, switcher: S): ReturnType<S[keyof S]> {
  return switcher[(literal ?? '_') as keyof S]() as any
}

// const d = literalSwitch('d' as 's' | 'd' | null, {
//   d: () => '',
//   s: () => 1,
//   _: () => ({}),
// })
