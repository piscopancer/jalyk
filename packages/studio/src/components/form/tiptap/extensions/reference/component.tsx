import { Preview } from '@/components/preview'
import { useDefaultPreview } from '@/preview'
import { cn } from '@/utils'
import { Menu } from '@base-ui-components/react'
import { NodeViewProps } from '@tiptap/core'
import { NodeViewWrapper } from '@tiptap/react'
import { OverrideProperties } from 'type-fest'
import { ReferenceAttrs } from '.'

type ReferenceNodeViewProps = OverrideProperties<
  NodeViewProps,
  {
    updateAttributes: (attrs: ReferenceAttrs) => void
  }
>

export default function Component(props: ReferenceNodeViewProps) {
  return (
    <NodeViewWrapper as='span'>
      <Menu.Root
        onOpenChange={(open) => {
          if (open) {
          } else {
            props.editor.commands.focus()
          }
        }}
      >
        {/* <Debug value={{ p: props.selected }}> */}
        <Menu.Trigger
          className={cn(props.selected ? 'border-blue-500' : 'border-zinc-700', 'bg-zinc-800 rounded-sm px-0.5 border')}
        >
          <Preview size='sm' usePreview={useDefaultPreview} document={{ id: 'asdsadasd' }} />
        </Menu.Trigger>
        {/* </Debug> */}
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <button
                onClick={() => {
                  props.updateAttributes({ id: '123' })
                }}
              >
                123
              </button>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </NodeViewWrapper>
  )
}
