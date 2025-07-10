import { useProjectUsers } from '@/hooks/query/use-users'
import { useProjectQuery } from '@/hooks/use-project-info'
import { providerIcons, rolesInfo } from '@/user'
import { LucideUsers2 } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

export default function Header() {
  const { data: project } = useProjectQuery()
  const usersQuery = useProjectUsers()

  return (
    <header className='bg-lines px-4 py-2 flex items-center border-b border-zinc-800'>
      <div className='mr-auto'>{project?.title}</div>
      <div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className='hopper p-2 rounded-md hover:bg-zinc-900'>
            <LucideUsers2 className='size-5' />
            <span className='bg-emerald-500 size-2 outline-4 outline-zinc-900/50 rounded-full text-sm place-self-end translate-1 ' />
          </DropdownMenu.Trigger>
          {usersQuery.data && (
            <DropdownMenu.Content sideOffset={8} className='p-2 rounded-xl bg-zinc-950 border border-zinc-800'>
              {usersQuery.data.map((user) => (
                <DropdownMenu.Item key={user.id} className='flex items-center gap-3 py-1.5 px-2 hover:bg-zinc-800 rounded-md'>
                  <div className='size-9 hopper'>
                    <img src={user.photoUrl ?? undefined} className='size-full rounded-full' />
                    {(() => {
                      const Icon = providerIcons[user.authProvider]
                      return <Icon className='place-self-end size-4 bg-zinc-950 rounded-full translate-0.5' />
                    })()}
                  </div>
                  <div className='flex flex-col min-w-32'>
                    <span className='leading-tight'>{user.name}</span>
                    <span className='text-zinc-400 text-sm leading-tight'>{rolesInfo[user.inProjects[0]!.role]}</span>
                  </div>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          )}
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
