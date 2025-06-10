import { useUsers } from '@/hooks/query/use-users'
import { useProjectInfo } from '@/hooks/use-project-info'
import { LucideUsers2 } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

export default function Header() {
  const projectInfo = useProjectInfo()
  const usersQuery = useUsers()

  return (
    <header className='bg-zinc-900 px-4 py-2 flex items-center'>
      <div className='mr-auto'>{projectInfo.data?.title}</div>
      <div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <LucideUsers2 />
            <span className='bg-zinc-800 px-2 text-zinc-500 rounded-full'>{usersQuery.data?.length}</span>
          </DropdownMenu.Trigger>
          {usersQuery.data && (
            <DropdownMenu.Content className='p-2 rounded-xl bg-zinc-950 border border-zinc-800'>
              {usersQuery.data.map((user) => (
                <DropdownMenu.Item key={user.id} className='flex items-center gap-3 p-2 hover:bg-zinc-800'>
                  <img src={user.photoUrl} className='size-6 rounded-full' />
                  <span className='min-w-24'>{user.name}</span>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          )}
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
