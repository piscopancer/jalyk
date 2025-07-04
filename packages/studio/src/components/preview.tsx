import { DocumentAction } from '@/document/action'
import useStudioCtx from '@/hooks/use-project-ctx'
import { cn, IconComponentType } from '@/utils'
import { Menu } from '@repo/ui'
import { LucideEllipsisVertical, LucideFile } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { ComponentProps, ReactNode } from 'react'

export type PreviewProps = {
  media?: ReactNode
  title: string
  subtitle?: string
  actions?: DocumentAction[]
}

export default function Preview({ preview, ...attr }: { preview: PreviewProps } & ComponentProps<'article'>) {
  const s = useStudioCtx()

  return (
    <article {...attr} className={cn('flex rounded-xl bg-zinc-900 p-1 gap-x-2', attr.className)}>
      <aside>{preview.media ?? <DefaultPreviewMedia icon={LucideFile} />}</aside>
      <div className='grow text-left line-clamp-1 flex flex-col self-center gap-0.5'>
        <h1 className='line-clamp-1 leading-none'>{preview.title}</h1>
        <h2 className='line-clamp-1 text-sm leading-none text-zinc-400'>{preview.subtitle}</h2>
      </div>
      {preview.actions?.length ? (
        <Menu content={(m) => preview.actions!.map((action) => <m.Item label={action.title ?? action.name} />)}>
          <DropdownMenu.Trigger>
            <LucideEllipsisVertical />
          </DropdownMenu.Trigger>
        </Menu>
      ) : null}
    </article>
  )
}

export function DefaultPreviewMedia(props: { icon: IconComponentType }) {
  return (
    <div className='size-12 bg-zinc-950 hopper rounded-lg'>
      <props.icon className='size-5 stroke-zinc-400 place-self-center' />
    </div>
  )
}
