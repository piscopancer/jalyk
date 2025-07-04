import useStudioCtx from '@/hooks/use-project-ctx'
import { IconComponentType } from '@/utils'
import { useId } from 'react'
// import { FieldConfig } from '../../config'
import { FieldConfig } from '@/test/shapes'
import FieldToolbar from './field-toolbar'

export default function Fieldset(props: { documentId: string; fieldName: string; fieldConfig: FieldConfig; toolbar?: { title?: string; icon?: IconComponentType } }) {
  // const Input = fieldInputs[props.field.type]
  const inputElementId = useId()
  const { projectId } = useStudioCtx()

  return (
    <fieldset className='flex flex-col gap-1'>
      <FieldToolbar
        inputElementId={inputElementId}
        field={{
          name: props.fieldName,
          title: props.fieldConfig.title,
          icon: props.fieldConfig.icon,
        }}
      />
      <props.fieldConfig.component options={props.fieldConfig.options} />
      {/* <Input
        field={props.fieldConfig as never}
        id={inputElementId}
        // todo: move onchange must appear in the input itself, not here
      /> */}
    </fieldset>
  )
}
