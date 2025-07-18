import { cn } from '@/utils'
import starterKit from '@tiptap/starter-kit'
import { referenceExtension } from './extensions/reference'

export const extensions = [
  starterKit.configure({
    heading: {
      HTMLAttributes: {
        class: cn(
          /* class: */ 'font-medium',
          /* class: */ '[&:is(h1)]:text-4xl [&:is(h1)]:my-8',
          /* class: */ '[&:is(h2)]:text-3xl [&:is(h2)]:my-6',
          /* class: */ '[&:is(h3)]:text-xl [&:is(h3)]:my-4'
        ),
      },
      levels: [1, 2, 3],
    },
    paragraph: {
      HTMLAttributes: {
        class: 'my-2',
      },
    },
    code: {
      HTMLAttributes: {
        class: 'font-mono bg-blue-500/10 text-blue-400 px-1',
      },
    },
  }),
  referenceExtension,
]
