import { useProjectInfo } from '../hooks/use-project-info'

export default function Header() {
  const projectInfo = useProjectInfo()

  return <header className='bg-zinc-900 px-4 py-2'>{projectInfo.data?.title}</header>
}
