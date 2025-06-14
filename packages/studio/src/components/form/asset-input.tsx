import { Menu, Tooltip } from '@repo/ui'
import { LucideDownload, LucideEllipsisVertical, LucideFile, LucideHardDriveUpload, LucideLibrary, LucideMousePointerSquareDashed } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { ChangeEventHandler } from 'react'

type AssetInputProps = {
  state:
    | {
        type: 'uploading'
      }
    | {
        type: 'uploaded'
        url: string
        filename: string
        size: number
      }
    | {
        type: 'empty'
        onChange: ChangeEventHandler<HTMLInputElement>
      }
}

export function AssetInput(props: AssetInputProps) {
  return (
    <article className='bg-zinc-900 p-2 h-16 rounded-3xl flex items-center'>
      {props.state.type === 'empty' && (
        <>
          <div className='flex-1 hopper h-full mr-2 hover:bg-zinc-800 rounded-2xl border-1 border-dashed border-zinc-700 hover:border-zinc-600'>
            <div className='place-self-center flex items-center gap-2'>
              <LucideMousePointerSquareDashed />
              <span className=''>Drag file to upload</span>
            </div>
            <input className='opacity-0 h-full rounded-2xl' type='file' onChange={props.state.onChange} />
          </div>
          <Tooltip content='Upload from drive'>
            <button className='hover:bg-zinc-800 h-full aspect-square rounded-2xl hopper'>
              <LucideHardDriveUpload className='place-self-center' />
            </button>
          </Tooltip>
          <Tooltip content='Browse project assets'>
            <button className='hover:bg-zinc-800 h-full aspect-square rounded-2xl hopper'>
              <LucideLibrary className='place-self-center' />
            </button>
          </Tooltip>
        </>
      )}
      {props.state.type === 'uploaded' && (
        <>
          <div className='grid grid-cols-[auto_1fr] grid-rows-2 gap-x-2 flex-1'>
            <div className='bg-zinc-950 row-span-full aspect-square rounded-2xl size-12 hopper'>
              <LucideFile className='place-self-center stroke-zinc-400' />
            </div>
            <h1>child_po_extended.mp4</h1>
            <h2 className='text-zinc-400'>350 GB</h2>
          </div>
          <Menu
            content={(menu) => (
              <div>
                <menu.Item
                  icon={LucideDownload}
                  label='Загрузить файл'
                  onSelect={() => {
                    console.log(123)
                  }}
                />
                <menu.Separator />
                <menu.Item
                  icon={LucideDownload}
                  label='Загрузить файл'
                  onSelect={() => {
                    console.log(123)
                  }}
                />
              </div>
            )}
          >
            <Tooltip content='Never gonna dig straight down...'>
              <DropdownMenu.Trigger className='hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 self-stretch px-1 rounded-2xl'>
                <LucideEllipsisVertical />
              </DropdownMenu.Trigger>
            </Tooltip>
          </Menu>
        </>
      )}
    </article>
  )
}
