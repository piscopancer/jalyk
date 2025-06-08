import { Field } from '../../config'
import NumberInput, { NumberInputProps } from './number-input'
import StringInput, { StringInputProps } from './string-input'

export const defaultInputs = {
  string: (props: StringInputProps) => StringInput(props),
  number: (props: NumberInputProps) => NumberInput(props),
} satisfies Record<Field['type'], (props: any) => React.ReactNode>
