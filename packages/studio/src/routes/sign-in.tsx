import { GitHubIcon } from '@/assets/icons/github'
import { GoogleIcon } from '@/assets/icons/google'
import { auth } from '@/auth'
import useStudioConfig from '@/hooks/use-project-ctx'
import { trpc } from '@/trpc'
import { LoaderPinwheel } from 'lucide-react'
import { useEffect } from 'react'
import { useHref, useNavigate } from 'react-router'
import { AuthProvider } from '../../../trpc/src/prisma'

export default function SignIn() {
  const studio = useStudioConfig()
  const projectQuery = trpc.project.forSignIn.useQuery({
    id: studio.projectId,
  })
  const navigate = useNavigate()
  const structureHref = useHref('structure')
  const sessionQuery = auth.useSession()
  const upsertUserMutation = trpc.user.upsert.useMutation({
    onSuccess() {
      navigate(structureHref)
    },
  })

  useEffect(() => {
    if (sessionQuery.data?.user) {
      const user = sessionQuery.data.user
      auth.listAccounts().then((accs) => {
        if (!accs.data || accs.data.length < 0) return
        // there's ever only one account per user as there's no account linking
        const acc = accs.data[0]!
        upsertUserMutation.mutate({
          id: acc.accountId,
          name: user.name,
          photoUrl: user.image ?? undefined,
          authProvider: acc.provider as AuthProvider,
        })
      })
    }
  }, [sessionQuery.data?.user])

  return (
    <div className='studio bg-dots-normal min-h-screen max-h-screen'>
      <div className='h-screen max-w-2xl mx-auto grid grid-cols-[2rem_1fr_2rem] border-x border-zinc-800'>
        <div className='bg-lines-normal'></div>
        <article className='border-x border-zinc-800 flex flex-col bg-gradient-to-b from-zinc-950/20 to-zinc-950'>
          <div className='flex-1'>
            {projectQuery.isLoading || sessionQuery.isPending ? (
              <div className='hopper h-full'>
                <LoaderPinwheel className='place-self-center animate-spin size-6 stroke-zinc-400' />
              </div>
            ) : projectQuery.data ? (
              <>
                <header className='flex flex-col items-center py-12 border-b border-zinc-800'>
                  <div className='uppercase size-16 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-center text-xl mb-2'>
                    {projectQuery.data.title[0]}
                  </div>
                  <h1 className='mb-1'>{projectQuery.data.title}</h1>
                  <pre className='text-xs bg-zinc-900 text-zinc-400 px-[1ch] rounded-sm'>{studio.projectId}</pre>
                </header>
                <section>
                  <p className='text-2xl text-center mt-12'>Not authorized</p>
                  <p className='text-sm text-zinc-400 text-center mb-8'>Sign in bro</p>
                  <menu className='flex gap-4 mx-8'>
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
                        key={provider}
                        onClick={() => {
                          auth.signIn.social({
                            provider,
                            callbackURL: 'http://localhost:3000/studio',
                          })
                        }}
                        className='p-2 bg-zinc-950 border hover:border-zinc-600 border-zinc-700 rounded-md text-sm gap-1 flex flex-col items-center flex-1'
                      >
                        <Icon className='size-6' />
                        {title}
                      </button>
                    ))}
                  </menu>
                  {/* <button className='bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-md px-4 py-2 shadow-[inset_0_0_0_1px_var(--color-zinc-700)] border border-zinc-200 mx-8'>Super Button</button> */}
                </section>
              </>
            ) : (
              <p>project not found</p>
            )}
          </div>
          <footer className='text-zinc-700 text-sm hopper'>
            <pre className='justify-self-center self-center'>Jalyk Studio</pre>

            <button className='p-4 justify-self-end'>
              <GitHubIcon className='size-5' />
            </button>
          </footer>
        </article>
        <div className='bg-lines-normal'></div>
      </div>
    </div>
  )
}
