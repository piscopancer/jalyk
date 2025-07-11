import StudioComponent from '@/components/studio'
import { StudioConfig, studioConfigCtx } from '@/config'
import { qc } from '@/query'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import SignIn from './routes/sign-in'
import TestPage from './routes/test'
import { trpc, trpcClient } from './trpc'

export function Studio({ config }: { config: StudioConfig }) {
  const studioSegment = config.studioPath ?? 'studio'
  return (
    <trpc.Provider queryClient={qc} client={trpcClient}>
      <QueryClientProvider client={qc}>
        <studioConfigCtx.Provider value={config}>
          <BrowserRouter>
            <Routes>
              <Route index path={`/${studioSegment}`} Component={SignIn} />
              <Route path={`/${studioSegment}/*`} Component={StudioComponent} />
              <Route path={`/${studioSegment}/test`} index Component={TestPage} />
            </Routes>
          </BrowserRouter>
        </studioConfigCtx.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}
