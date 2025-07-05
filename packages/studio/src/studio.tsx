import StudioComponent from '@/components/studio'
import { StudioConfig, studioConfigCtx } from '@/config'
import { qc } from '@/query'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes, useHref, useNavigate } from 'react-router'
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
  const nav = useNavigate()
  const studio = useStudioCtx()
  const projectHref = useHref(studio.projectId)

  return (
    <div>
      pls auth 🙏
      <button
        onClick={() => {
          nav(projectHref)
        }}
      >
        to: {studio.projectId}
      </button>
    </div>
  )
}
