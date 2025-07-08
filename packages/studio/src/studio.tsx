import StudioComponent from '@/components/studio'
import { StudioConfig, studioConfigCtx } from '@/config'
import { qc } from '@/query'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { GitHubIcon } from './assets/icons/github'
import { GoogleIcon } from './assets/icons/google'
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
              <Route index path={`/${config.studioPath ?? defaultPath}`} Component={SignIn} />
              <Route path={`/${config.studioPath ?? defaultPath}/*`} Component={StudioComponent} />
            </Routes>
          </BrowserRouter>
        </studioConfigCtx.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  )
}

function SignIn() {
  const studio = useStudioCtx()
  const projectQuery = trpc.project.forSignIn.useQuery({
    id: studio.projectId,
  })
  // const navigate = useNavigate()
  // const projectHref = useHref(studio.projectId)
  // const { data } = auth.useSession()
  // const authMutation = trpc.user.signIn.useMutation()

  return (
    <div className='studio bg-dots min-h-screen max-h-screen'>
      <div className='h-screen max-w-2xl mx-auto grid grid-cols-[2rem_1fr_2rem] border-x border-zinc-800'>
        <div className='bg-stripes'></div>
        <article className='border-x border-zinc-800 bg-gradient-to-b from-zinc-950/20 to-zinc-950'>
          {projectQuery.isLoading ? (
            <>loading...</>
          ) : projectQuery.data ? (
            <>
              <header className='flex flex-col items-center mb-12'>
                <div className='uppercase size-24 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center text-3xl'>{projectQuery.data.title[0]}</div>
                <h1>{projectQuery.data.title}</h1>
                <pre>{studio.projectId}</pre>
              </header>
              <section>
                <menu className='flex gap-4'>
                  {[
                    {
                      provider: 'github',
                      icon: GitHubIcon,
                      title: 'GitHub',
                    },
                    {
                      provider: 'google',
                      icon: GoogleIcon,
                      title: 'Google',
                    },
                  ].map(({ title, provider, icon: Icon }) => (
                    <button
                      onClick={async () => {
                        const res = await auth.signIn.social({
                          provider,
                          callbackURL: 'http://localhost:3000/studio',
                        })
                        console.log(res)
                      }}
                      className='p-2 bg-zinc-800'
                    >
                      <Icon className='size-4' />
                      {title}
                    </button>
                  ))}
                </menu>
              </section>
              <footer></footer>
            </>
          ) : (
            <p>project not found</p>
          )}
        </article>
        <div className='bg-stripes'></div>
      </div>
      {/* {data?.user && (
        <div>
          <img src={data.user.image ?? undefined} className='size-8' />
          <pre>{data?.user?.name}</pre>
        </div>
      )} */}
    </div>
  )
}
