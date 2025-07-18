import { Attribute } from '@tiptap/core'
import { OverrideProperties } from 'type-fest'

export type TypedAttribute<O extends any> = OverrideProperties<
  Attribute,
  Partial<{
    default: O
  }>
>
