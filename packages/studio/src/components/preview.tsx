import { cn, keySwitch, literalSwitch, SvgComponentType } from '@/utils'
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

export type PreviewProps = {
  media?: MediaType
  title: string
  subtitle?: string
  size?: 'default' | 'sm'
}

export default function Preview({ preview, ...attr }: { preview: PreviewProps } & ComponentProps<'article'>) {
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
          <div className='size-10 border border-zinc-800 hopper rounded-md'>
            <media.icon className='size-5 stroke-zinc-400 place-self-center' />
          </div>
        ),
        sm: () => <media.icon className='size-4 stroke-zinc-400 place-self-center' />,
      }),
    image: (media) => (
      <img
        src={media.url}
        className={cn(
          literalSwitch(props.size ?? 'default', {
            default: () => 'size-10',
            sm: () => 'size-7',
          }),
          'rounded-md border border-zinc-800 object-cover'
        )}
      />
    ),
  })
}
