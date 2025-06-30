import { DocumentAction } from '@/document/action'
import useStudioCtx from '@/hooks/use-project-ctx'
import { Menu } from '@repo/ui'
import { LucideEllipsisVertical, LucideFile } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { ComponentType, ReactNode, SVGProps } from 'react'

export type PreviewProps = {
  media?: ReactNode
  title: string
  subtitle?: string
  actions?: DocumentAction[]
}

export default function Preview(props: PreviewProps) {
  const s = useStudioCtx()

  return (
    <article className='flex rounded-xl bg-zinc-900 p-1 gap-x-2'>
      <aside>{props.media ?? <DefaultPreviewMedia icon={LucideFile} />}</aside>
      <div className='grow text-left line-clamp-1'>
        <h1 className='line-clamp-1'>{props.title}</h1>
        <h2 className='line-clamp-1 text-sm'>{props.subtitle}</h2>
      </div>
      {props.actions?.length ? (
        <Menu content={(m) => props.actions!.map((action) => <m.Item label={action.title ?? action.name} />)}>
          <DropdownMenu.Trigger>
            <LucideEllipsisVertical />
          </DropdownMenu.Trigger>
        </Menu>
      ) : null}
    </article>
  )
}

export function DefaultPreviewMedia(props: { icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return (
    <div className='size-12 bg-zinc-950 hopper rounded-lg'>
      <props.icon className='size-5 stroke-zinc-400 place-self-center' />
    </div>
  )
}
