import { Field } from '@/config'
import StringInput, { StringInputProps } from './string-input'

export * from './asset-input'
export * from './field-toolbar'
export * from './fieldset'
export * from './number-input'
export * from './string-input'

export const fieldInputs = {
  string: (props: StringInputProps) => StringInput(props),
  // number: (props: NumberInputProps) => NumberInput(props),
} satisfies Record<Field['type'], (props: any) => React.ReactNode>
