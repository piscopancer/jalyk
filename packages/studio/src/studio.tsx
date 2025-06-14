import StudioComponent from '@/components/studio'
import { StudioConfig, studioConfigCtx } from '@/config'
import { qc } from '@/query'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes, useHref, useNavigate } from 'react-router'
import { trpc, trpcClient } from './trpc'

const defaultPath = 'studio'

export function Studio({ config }: { config: StudioConfig }) {
  return (
    <trpc.Provider queryClient={qc} client={trpcClient}>
      <QueryClientProvider client={qc}>
        <studioConfigCtx.Provider value={config}>
          <BrowserRouter>
            <Routes>
              <Route index path={`/${config.studioPath ?? defaultPath}`} Component={() => <Home config={config} />} />
              <Route path={`/${config.studioPath ?? defaultPath}/:projectId/*`} Component={() => <StudioComponent config={config} />} />
            </Routes>
          </BrowserRouter>
        </studioConfigCtx.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

function Home({ config }: { config: StudioConfig }) {
  const nav = useNavigate()
  const projectHref = useHref(config.projectId)

  return (
    <div>
      pls auth 🙏
      <button
        onClick={() => {
          nav(projectHref)
        }}
      >
        to: {config.projectId}
      </button>
    </div>
  )
}
