import useStudioConfig from '@/hooks/use-project-ctx'
import { SvgComponentType } from '@/utils'
import { useId } from 'react'
// import { FieldConfig } from '../../config'
import { FieldConfig } from '@/test/shapes'
import { z } from 'zod/v4'
import FieldToolbar from './field-toolbar'

type FieldsetProps = {
  documentId: string
  fieldName: string
  fieldConfig: FieldConfig
  shape: z.ZodType
  toolbar?: {
    title?: string
    icon?: SvgComponentType
  }
}

export default function Fieldset(props: FieldsetProps) {
  // const Input = fieldInputs[props.field.type]
  const inputElementId = useId()
  const { projectId } = useStudioConfig()

  return (
    <fieldset className='flex flex-col gap-1'>
      <FieldToolbar
        shape={props.shape}
        inputElementId={inputElementId}
        field={{
          name: props.fieldName,
          title: props.fieldConfig.title,
          icon: props.fieldConfig.icon,
        }}
      />
      <props.fieldConfig.component config={props.fieldConfig} elementId={inputElementId} fieldName={props.fieldName} docId={props.documentId} shape={props.shape} />
      {/* <Input
        field={props.fieldConfig as never}
        id={inputElementId}
        // todo: move onchange must appear in the input itself, not here
      /> */}
    </fieldset>
  )
}
