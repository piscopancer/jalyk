import { DocumentAction } from '@/document/action'
import useStudioCtx from '@/hooks/use-project-ctx'
import { ComponentType, ReactNode, SVGProps } from 'react'

export type PreviewProps = {
  media?: ReactNode
  title: string
  subtitle?: string
  actions?: DocumentAction[]
}

export default function Preview(props: PreviewProps) {
  const s = useStudioCtx()

  return <article>{props.media}</article>
}

export function DefaultPreviewMedia(props: { icon: ComponentType<SVGProps<SVGElement>> }) {
  return (
    <div className='size-12 bg-zinc-950 hopper'>
      <props.icon className='size-5 stroke-zinc-400' />
    </div>
  )
}
