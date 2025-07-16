import useStudioConfig from '@/hooks/use-project-ctx'
import { trpc } from '@/trpc'
import { cn, SvgComponentType } from '@/utils'
import { ContextMenu as CM } from '@base-ui-components/react'
import { formatDistanceToNowStrict } from 'date-fns'
import { filesize } from 'filesize'
import { LucideFile, LucideFileText, LucideFilm, LucideImage, LucideMusic, LucideSearch, LucideUploadCloud } from 'lucide-react'
import { useMemo, useState } from 'react'
import { entries } from 'remeda'

const assetTypeExtensions = {
  text: {
    hint: 'Text',
    icon: LucideFileText,
    extensions: ['txt', 'md'],
  },
  image: {
    hint: 'Images',
    icon: LucideImage,
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
  },
  video: {
    hint: 'Videos',
    icon: LucideFilm,
    extensions: ['mp4', 'webm'],
  },
  audio: {
    hint: 'Audio',
    icon: LucideMusic,
    extensions: ['mp3', 'ogg'],
  },
} as const

type AssetCategoryInfo = {
  name: AssetCategory
  hint?: string
  title?: string
  icon?: SvgComponentType
  total: number
}
type AssetType = keyof typeof assetTypeExtensions
type AssetCategory = 'all' | 'other' | AssetType

function determineAssetType(ext: string) {
  const type = (() => {
    const types = Object.keys(assetTypeExtensions) as AssetType[]
    for (let i = 0; i < types.length; i++) {
      const type = types[i]!
      if (assetTypeExtensions[type].extensions.includes(ext as never)) {
        return type
      }
    }
  })()
  return type
}

export default function Assets() {
  const { projectId } = useStudioConfig()
  const [category, setCategory] = useState<AssetCategory>('all')
  const assetsQuery = trpc.asset.list.useQuery(
    { projectId },
    {
      select(assets) {
        if (!assets) return
        return assets.map((asset) => ({
          ...asset,
          type: determineAssetType(asset.extension),
        }))
      },
    }
  )
  const categories: AssetCategoryInfo[] = useMemo(() => {
    return [
      {
        name: 'all',
        title: 'All',
        total: assetsQuery.data?.length ?? 0,
      },
      ...entries(assetTypeExtensions).map(
        ([key, info]) =>
          ({
            name: key,
            hint: info.hint,
            icon: info.icon,
            total: assetsQuery.data?.filter((a) => a.type === key).length ?? 0,
          }) satisfies AssetCategoryInfo
      ),
      {
        name: 'other',
        title: 'Other',
        total: assetsQuery.data?.filter((a) => !a.type).length ?? 0,
      },
    ] satisfies AssetCategoryInfo[]
  }, [assetsQuery.data])

  return (
    <div className='flex flex-col flex-1'>
      <section className='py-12 px-4 border-b border-zinc-800'>
        <div className='mx-auto max-w-2xl'>
          <div className='flex gap-2 mb-3'>
            <div className='hopper flex-1'>
              <input type='text' placeholder='File name...' className='bg-zinc-900 rounded-md py-2 pl-11 placeholder:text-zinc-600' />
              <LucideSearch className='stroke-zinc-600 size-5 pointer-events-none self-center ml-3' />
            </div>
            <button className='rounded-md py-2 px-8 bg-zinc-200 hover:bg-zinc-300'>
              <LucideUploadCloud className='size-5 stroke-zinc-900' />
            </button>
          </div>
          <menu className='flex gap-2'>
            {categories
              .filter((cat) => cat.name === 'all' || cat.total)
              .map((cat, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      setCategory(cat.name)
                    }}
                    className={cn('flex items-center px-2 py-1 rounded-md text-sm', cat.name === category ? 'bg-zinc-800' : 'bg-zinc-900 text-zinc-400')}
                  >
                    {cat.icon && <cat.icon className='size-4 mr-2' />}
                    {cat.title && <span className='mr-2'>{cat.title}</span>}
                    <span className='font-mono'>{cat.total}</span>
                  </button>
                </li>
              ))}
          </menu>
        </div>
      </section>
      <section className='bg-dots-normal py-12 flex-1 px-4 @container'>
        <ul className='grid grid-cols-4 @max-3xl:grid-cols-3 @max-xl:grid-cols-2 gap-2 mx-auto max-w-4xl'>
          {assetsQuery.data
            ?.filter((ass) => category === 'all' || (category === 'other' && !ass.type) || ass.type === category)
            .map((ass, i) => {
              const Icon = ass.type ? assetTypeExtensions[ass.type].icon : LucideFile
              return (
                <li key={i}>
                  <CM.Root>
                    <CM.Trigger
                      render={
                        <button className='w-full rounded-md group'>
                          <article className='hopper bg-zinc-925 hover:bg-zinc-900 aspect-[4/3] rounded-[inherit]'>
                            <header className='text-left px-2 py-1 flex items-center self-start overflow-hidden gap-2'>
                              <h1 className='line-clamp-1 flex-1'>{ass.name}</h1>
                              <span className='invisible group-hover:visible font-mono text-sm text-blue-400 rounded-sm'>{ass.extension}</span>
                            </header>
                            <div className='place-self-center'>
                              <Icon className='stroke-zinc-500' />
                            </div>
                            <footer className='self-end flex text-zinc-400 text-sm px-2 py-1'>
                              <span className='mr-auto font-mono'>{filesize(ass.size ?? 0)}</span>
                              <span>{formatDistanceToNowStrict(ass.lastModified, { addSuffix: true })}</span>
                            </footer>
                          </article>
                        </button>
                      }
                    />
                    <CM.Portal>
                      <CM.Positioner>
                        <CM.Popup className='bg-zinc-925 p-1 border border-zinc-800 rounded-md'>
                          <CM.Item className='px-4 py-2 focus-within:bg-zinc-800 rounded-md'>Download</CM.Item>
                          <CM.Item className='text-red-500 px-4 py-2 focus-within:bg-zinc-800 rounded-md'>Delete</CM.Item>
                        </CM.Popup>
                      </CM.Positioner>
                    </CM.Portal>
                  </CM.Root>
                </li>
              )
            })}
        </ul>
      </section>
    </div>
  )
}
