import { JalykDocument } from '@/document'
import { FieldDefinition } from '@/structure'
import { keySwitch, SvgComponentType } from '@/utils'
import { useId } from 'react'
import FieldToolbar from './field-toolbar'

type FieldsetProps = {
  document: JalykDocument
  fieldName: string
  field: FieldDefinition
  toolbar?: {
    title?: string
    icon?: SvgComponentType
  }
}

export default function Fieldset(props: FieldsetProps) {
  const inputElementId = useId()

  return (
    <fieldset className='flex flex-col gap-1'>
      <FieldToolbar
        shape={props.field.shape}
        inputElementId={inputElementId}
        field={{
          name: props.fieldName,
          title: props.field.title,
          icon: props.field.icon,
        }}
      />
      {keySwitch(props.field, 'type', {
        reference(cfg) {
          return (
            <cfg.component
              elementId={inputElementId}
              document={props.document}
              field={{
                path: props.fieldName,
                shape: cfg.shape,
                config: {
                  icon: cfg.icon,
                  title: cfg.title,
                  options: cfg.options ?? { size: 'default' },
                },
              }}
            />
          )
        },
        string(cfg) {
          return (
            <cfg.component
              elementId={inputElementId}
              document={props.document}
              field={{
                path: props.fieldName,
                shape: cfg.shape,
                config: {
                  icon: cfg.icon,
                  title: cfg.title,
                  options: cfg.options ?? {},
                },
              }}
            />
          )
        },
      })}
      {/* <props.fieldConfig.component config={props.fieldConfig} elementId={inputElementId} fieldPath={props.fieldName} documentId={props.documentId} documentType={props.documentType} shape={props.shape} /> */}
    </fieldset>
  )
}
