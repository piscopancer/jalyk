import { Menu as M } from '@base-ui-components/react'

export function Separator(props: { title?: string }) {
  return <M.Separator className='border-b border-zinc-800 my-2.5 text-zinc-400'>{props.title}</M.Separator>
}
