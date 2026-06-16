import { Debug } from '@/components/debug'
import { cn } from '@/utils'
import { EditorContent, useEditor } from '@tiptap/react'
import { LucideHeading1, LucideHeading2, LucideHeading3 } from 'lucide-react'
import { extensions } from '.'

export function TiptapEditor(props: { placeholder?: string }) {
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions,
    content: `
      <p>Intro into editing text <ref to="shop,user" id="ai4fv3"/></p>
      `,
    injectCSS: true,
  })

  const buttons = [
    {
      hint: 'Heading (Level 1)',
      icon: LucideHeading1,
      active: editor.isActive('heading', { level: 1 }),
      disabled: !editor.can().toggleHeading({ level: 1 }),
      action: () => editor.chain().toggleHeading({ level: 1 }).run(),
    },
    {
      hint: 'Heading (Level 2)',
      icon: LucideHeading2,
      active: editor.isActive('heading', { level: 2 }),
      disabled: !editor.can().toggleHeading({ level: 2 }),
      action: () => editor.chain().toggleHeading({ level: 2 }).run(),
    },
    {
      hint: 'Heading (Level 3)',
      icon: LucideHeading3,
      active: editor.isActive('heading', { level: 3 }),
      disabled: !editor.can().toggleHeading({ level: 3 }),
      action: () => editor.chain().toggleHeading({ level: 3 }).run(),
    },
  ]

  return (
    <article className='bg-zinc-925 rounded-md border border-zinc-800 hover:border-zinc-700'>
      <Debug value={{ active: editor.state.toJSON() }}>
        <menu className='border-b border-zinc-800 bg-zinc-950 px-2 py-2 rounded-t-[inherit]'>
          {buttons.map((b, i) => (
            <button
              key={i}
              disabled={b.disabled}
              onClick={b.action}
              className={cn(
                'rounded-md p-1.5',
                b.disabled && 'opacity-50',
                b.active ? 'bg-zinc-800' : 'hover:bg-zinc-800'
              )}
            >
              <b.icon className='size-5' />
            </button>
          ))}
        </menu>
      </Debug>
      <EditorContent placeholder={props.placeholder} className='*:p-4 *:rounded-md' editor={editor} />
    </article>
  )
}
