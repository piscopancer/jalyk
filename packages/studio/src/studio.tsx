import StudioComponent from '@/components/studio'
import { StudioConfig, studioConfigCtx } from '@/config'
import { qc } from '@/query'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes, useHref, useNavigate } from 'react-router'
import { auth } from './auth'
import useStudioCtx from './hooks/use-project-ctx'
import { trpc, trpcClient } from './trpc'

const defaultPath = 'studio'

export function Studio({ config }: { config: StudioConfig }) {
  return (
    <trpc.Provider queryClient={qc} client={trpcClient}>
      <QueryClientProvider client={qc}>
        <studioConfigCtx.Provider value={config}>
          <BrowserRouter>
            <Routes>
              <Route index path={`/${config.studioPath ?? defaultPath}`} Component={Home} />
              <Route path={`/${config.studioPath ?? defaultPath}/*`} Component={StudioComponent} />
            </Routes>
          </BrowserRouter>
        </studioConfigCtx.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

function Home() {
  const navigate = useNavigate()
  const studio = useStudioCtx()
  const projectHref = useHref(studio.projectId)
  const { data } = auth.useSession()
  const authMutation = trpc.user.signIn.useMutation()

  return (
    <div>
      {data?.user && (
        <div>
          <img src={data.user.image ?? undefined} className='size-8' />
          <pre>{data?.user?.name}</pre>
        </div>
      )}
      <button
        onClick={async () => {
          const res = await auth.signIn.social({
            provider: 'github',
            callbackURL: '/studio',
          })
          console.log(res)
        }}
        className='p-2 bg-zinc-800'
      >
        auth with github
      </button>
      <button
        onClick={async () => {
          const res = await auth.signIn.social({
            provider: 'discord',
            // callbackURL: '/studio',
          })
          console.log(res)
        }}
        className='p-2 bg-zinc-900'
      >
        auth with discord
      </button>
      <button
        onClick={() => {
          navigate(projectHref)
        }}
      >
        to: {studio.projectId}
      </button>
    </div>
  )
}
