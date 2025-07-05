import { ReferenceFieldConfig } from '@/test/shapes'

type Props = {
  docId: string
  elementId: string | undefined
  fieldName: string
  config: ReferenceFieldConfig
}

export default function ReferenceFieldInput(props: Props) {
  return <div>{props.config.options.display}</div>
}
