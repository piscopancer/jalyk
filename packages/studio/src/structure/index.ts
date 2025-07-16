import ReferenceFieldInput from '@/components/form/reference-input'
import StringFieldInput from '@/components/form/string-input'
import { SvgComponentType } from '@/utils'
import { z } from 'zod/v4'

export type FieldDefinition = ReturnType<typeof defineReference> | ReturnType<typeof defineString>

export type DocumentDefinition = {
  type: string
  title?: string
  icon?: SvgComponentType
  fields: Record<string, FieldDefinition>
}

export const stringShape = z.string().nullable()
export type StringShape = typeof stringShape
export type StringFieldConfig = {
  icon?: SvgComponentType
  title?: string
  options?: StringFieldOptions
}
export function defineString(config?: StringFieldConfig) {
  return {
    type: 'string' as const,
    icon: config?.icon,
    title: config?.title,
    shape: stringShape,
    options: config?.options,
    component: StringFieldInput,
  }
}
export type StringFieldOptions = {
  placeholder?: string
  predefined?: {
    display: 'dropdown' | 'select'
    // todo: can be an async callback, called in the input component
    options: { icon?: SvgComponentType; value: string; title?: string }[]
  }
}

export type ReferenceShapeOptions<To extends string[]> = { to: To; size: 'default' | 'sm' }
export type ReferenceFieldConfig<To extends string[]> = {
  icon?: SvgComponentType
  title?: string
  options: ReferenceShapeOptions<To>
}
export function defineReference<To extends string[]>(config?: ReferenceFieldConfig<To>) {
  return {
    type: 'reference' as const,
    icon: config?.icon,
    title: config?.title,
    shape: referenceShape,
    component: ReferenceFieldInput,
    options: config?.options,
  }
}
export const referenceShape = z
  .object({
    _ref: z.string(),
  })
  .nullable()
export type ReferenceShape = typeof referenceShape

//

export type GroupConfig = {
  icon?: SvgComponentType
  title?: string
}
export function defineGroup(config?: GroupConfig) {
  return {
    type: 'group' as const,
    icon: config?.icon,
    title: config?.title,
    // component: GroupFieldInput,
    // options: config?.options,
  }
}
