import { ReferenceShapeOptions } from '@/test/shapes'

export default function ReferenceFieldInput(props: { options: ReferenceShapeOptions }) {
  return <div>{props.options.display}</div>
}
