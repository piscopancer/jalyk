import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { TypedAttribute } from '..'
import Component from './component'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    referenceExtension: {
      insert: () => ReturnType
    }
  }
}

export type ReferenceAttrs = {
  id?: string
  to?: string[]
}

type AddReferenceAttrs = {
  [A in keyof ReferenceAttrs]: TypedAttribute<ReferenceAttrs[A]>
}

export const referenceExtension = Node.create({
  name: 'reference',
  atom: true,
  inline: true,
  group: 'inline',
  addAttributes() {
    return {
      to: {},
      id: {},
    } satisfies AddReferenceAttrs
  },
  parseHTML() {
    return [
      {
        tag: 'ref',
        getAttrs(node) {
          return {
            to: node.getAttribute('to')?.split(','),
            id: node.getAttribute('id'),
          } as ReferenceAttrs
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['ref', mergeAttributes(HTMLAttributes)]
  },
  addNodeView() {
    return ReactNodeViewRenderer(Component)
  },
})
