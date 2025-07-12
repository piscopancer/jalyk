import { JalykDocument } from '@/document'
import useStudioConfig from '@/hooks/use-project-ctx'
import { UsePreview } from '@/preview'
import { cn, keySwitch, literalSwitch, SvgComponentType } from '@/utils'
import { LucideFileSymlink } from 'lucide-react'
import { ComponentProps } from 'react'

export type MediaType =
  | {
      type: 'icon'
      icon: SvgComponentType
    }
  | {
      type: 'image'
      url: string
    }

export type PreviewBaseProps = {
  media?: MediaType
  title: string
  subtitle?: string
  size?: 'default' | 'sm'
}

export default function PreviewBase({ preview, ...attr }: { preview: PreviewBaseProps } & ComponentProps<'article'>) {
  return literalSwitch(preview.size ?? 'default', {
    default: () => (
      <article {...attr} className={cn('flex p-2 gap-x-2 items-center', attr.className)}>
        {preview.media && <PreviewMedia media={preview.media} size={preview.size ?? 'default'} />}
        <div className='grow text-left line-clamp-1'>
          <h1 className='line-clamp-1 leading-tight'>{preview.title}</h1>
          <h2 className='line-clamp-1 text-sm leading-tight text-zinc-400'>{preview.subtitle}</h2>
        </div>
      </article>
    ),
    sm: () => (
      <article {...attr} className={cn('flex p-1 gap-x-2 items-center', attr.className)}>
        {preview.media && <PreviewMedia media={preview.media} size={preview.size ?? 'default'} />}
        <h1 className='leading-none'>{preview.title}</h1>
      </article>
    ),
  })
}

export function PreviewMedia(props: { media: MediaType; size?: 'default' | 'sm' }) {
  return keySwitch(props.media, 'type', {
    icon: (media) =>
      literalSwitch(props.size ?? 'default', {
        default: () => (
          <div className='shrink-0 size-10 border border-zinc-800 hopper rounded-md'>
            <media.icon className='size-5 stroke-zinc-400 place-self-center' />
          </div>
        ),
        sm: () => <media.icon className='shrink-0 size-4 stroke-zinc-400 place-self-center' />,
      }),
    image: (media) => (
      <img
        src={media.url}
        className={cn(
          literalSwitch(props.size ?? 'default', {
            default: () => 'size-10',
            sm: () => 'size-7',
          }),
          'shrink-0 rounded-md border border-zinc-800 object-cover'
        )}
      />
    ),
  })
}

export function Preview(props: { document?: Partial<JalykDocument>; usePreview: UsePreview; size: 'default' | 'sm' }) {
  const preview = props.document?.id ? props.usePreview(props.document.id) : undefined
  const { definitions } = useStudioConfig()
  const icon = props.document?.type ? (definitions.find((d) => d.type === props.document!.type)!.icon ?? LucideFileSymlink) : LucideFileSymlink

  return (
    <PreviewBase
      preview={{
        title: preview?.title ?? props.document?.id ?? 'no document :(',
        subtitle: preview?.subtitle,
        size: props.size,
        media: {
          type: 'icon',
          icon,
        },
      }}
      className='flex-1'
    />
  )
}
